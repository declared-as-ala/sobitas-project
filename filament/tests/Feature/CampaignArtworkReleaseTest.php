<?php

namespace Tests\Feature;

use App\Support\CampaignArtwork20260903 as Artwork;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class CampaignArtworkReleaseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        Storage::fake('public');
        Storage::fake('campaign-archive');
        Http::preventStrayRequests();
        Schema::create('slides', function (Blueprint $table): void {
            $table->id();
            foreach (['lien', 'image', 'image_mobile', 'alt'] as $column) {
                $table->string($column);
            }
            $table->integer('ordre');
            $table->boolean('is_active');
            $table->timestamps();
        });
        foreach (Artwork::CAMPAIGNS as $index => $campaign) {
            DB::table('slides')->insert($campaign['old'] + [
                'id' => $index + 1, 'lien' => $campaign['link'], 'alt' => 'Description '.$index,
                'ordre' => $index + 2, 'is_active' => true,
            ]);
            foreach ($campaign['old'] as $old) {
                Storage::disk('public')->put($old, 'old-master:'.$old);
            }
        }
        Storage::disk('public')->put('slides/unrelated.webp', 'do-not-touch');
    }

    private function mockHomepage(bool $current = true): void
    {
        $html = '';
        foreach (Artwork::CAMPAIGNS as $campaign) {
            foreach ($campaign['old'] as $field => $old) {
                $html .= '<img src="'.($current ? Artwork::target($campaign['name'], $field) : $old).'">';
            }
        }
        Http::fake(['https://protein.tn/' => Http::response($html)]);
    }

    public function test_install_preserves_campaign_metadata_and_old_public_files_during_transition(): void
    {
        Artwork::install();
        Artwork::install(); // Idempotent deployment retry.
        foreach (Artwork::CAMPAIGNS as $index => $campaign) {
            $slide = DB::table('slides')->find($index + 1);
            $this->assertSame($campaign['link'], $slide->lien);
            $this->assertSame('Description '.$index, $slide->alt);
            $this->assertSame($index + 2, $slide->ordre);
            $this->assertEquals(1, $slide->is_active);
            foreach ($campaign['old'] as $field => $old) {
                $target = Artwork::target($campaign['name'], $field);
                $this->assertSame($target, $slide->{$field});
                Storage::disk('public')->assertExists($old);
                $this->assertSame(file_get_contents(Artwork::source($campaign['name'], $field)), Storage::disk('public')->get($target));
                $this->assertSame('old-master:'.$old, Storage::disk('campaign-archive')->get(Artwork::ARCHIVE.'/'.basename($old)));
            }
        }
    }

    public function test_retirement_removes_only_six_old_files_and_can_be_rolled_back(): void
    {
        Artwork::install();
        $this->mockHomepage();
        $this->assertSame(6, Artwork::retire(false));
        $this->assertSame(13, count(Storage::disk('public')->allFiles()));
        $this->assertSame(6, Artwork::retire(true));
        $this->assertSame(0, Artwork::retire(true));
        Storage::disk('public')->assertExists('slides/unrelated.webp');
        foreach (Artwork::CAMPAIGNS as $campaign) {
            foreach ($campaign['old'] as $old) {
                Storage::disk('public')->assertMissing($old);
            }
        }
        Artwork::restore();
        foreach (Artwork::CAMPAIGNS as $index => $campaign) {
            foreach ($campaign['old'] as $field => $old) {
                $this->assertSame($old, DB::table('slides')->find($index + 1)->{$field});
                $this->assertSame('old-master:'.$old, Storage::disk('public')->get($old));
            }
        }
    }

    public function test_stale_homepage_prevents_any_retirement(): void
    {
        Artwork::install();
        $this->mockHomepage(false);
        try {
            Artwork::retire(true);
            $this->fail('Stale HTML must prevent deletion.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('has not switched', $error->getMessage());
        }
        $this->assertSame(13, count(Storage::disk('public')->allFiles()));
    }

    public function test_missing_backup_is_recreated_before_any_retirement(): void
    {
        Artwork::install();
        $this->mockHomepage();
        Storage::disk('campaign-archive')->delete(Artwork::ARCHIVE.'/welcome-bonus-mobile-v1.webp');
        $this->assertSame(6, Artwork::retire(false));
        $this->assertSame(13, count(Storage::disk('public')->allFiles()));
        $this->assertSame(
            'old-master:slides/welcome-bonus-mobile-v1.webp',
            Storage::disk('campaign-archive')->get(Artwork::ARCHIVE.'/welcome-bonus-mobile-v1.webp')
        );
    }

    public function test_independent_admin_edit_is_not_overwritten_and_database_switch_is_atomic(): void
    {
        DB::table('slides')->where('id', 3)->update(['image' => 'slides/new-admin-upload.webp']);
        try {
            Artwork::install();
            $this->fail('Do not overwrite an independent admin edit.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('independently', $error->getMessage());
        }
        $this->assertSame(Artwork::CAMPAIGNS[0]['old']['image'], DB::table('slides')->find(1)->image);
        $this->assertSame('slides/new-admin-upload.webp', DB::table('slides')->find(3)->image);
    }

    public function test_even_an_inactive_slide_reference_prevents_retirement(): void
    {
        Artwork::install();
        $this->mockHomepage();
        DB::table('slides')->insert(Artwork::CAMPAIGNS[0]['old'] + [
            'lien' => '/archive', 'alt' => 'Archive', 'ordre' => 5, 'is_active' => false,
        ]);
        try {
            Artwork::retire(true);
            $this->fail('A referenced file must never be deleted.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('still referenced', $error->getMessage());
        }
        $this->assertSame(13, count(Storage::disk('public')->allFiles()));
    }
}
