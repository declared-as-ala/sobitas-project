<?php

namespace Tests\Feature;

use App\Support\CampaignArtwork20260905Studio as Artwork;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class CampaignArtworkStudioReleaseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        Storage::fake('public');
        Storage::fake('campaign-archive');
        Schema::create('slides', function (Blueprint $table): void {
            $table->id();
            $table->string('lien');
            $table->string('image');
            $table->string('image_mobile');
            $table->string('alt');
            $table->integer('ordre');
            $table->boolean('is_active');
            $table->timestamps();
        });
        foreach (Artwork::CAMPAIGNS as $index => $campaign) {
            DB::table('slides')->insert($campaign['previous'] + [
                'id' => $index + 1,
                'lien' => $campaign['link'],
                'alt' => 'Campaign '.$index,
                'ordre' => $index,
                'is_active' => true,
            ]);
            foreach ($campaign['previous'] as $previous) {
                Storage::disk('public')->put($previous, 'previous:'.$previous);
            }
        }
    }

    public function test_install_is_atomic_idempotent_and_preserves_metadata(): void
    {
        Artwork::install();
        Artwork::install();

        foreach (Artwork::CAMPAIGNS as $index => $campaign) {
            $slide = DB::table('slides')->find($index + 1);
            $this->assertSame('Campaign '.$index, $slide->alt);
            $this->assertSame($index, $slide->ordre);
            foreach ($campaign['previous'] as $field => $previous) {
                $this->assertSame(Artwork::target($campaign['name'], $field), $slide->{$field});
                Storage::disk('public')->assertExists($previous);
                Storage::disk('public')->assertExists(Artwork::target($campaign['name'], $field));
            }
        }
    }

    public function test_independent_admin_edit_prevents_database_switch(): void
    {
        DB::table('slides')->where('id', 2)->update(['image_mobile' => 'slides/admin-edit.webp']);

        try {
            Artwork::install();
            $this->fail('An independent admin edit must not be overwritten.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('independently', $error->getMessage());
        }

        $this->assertSame(Artwork::CAMPAIGNS[0]['previous']['image'], DB::table('slides')->find(1)->image);
        $this->assertSame('slides/admin-edit.webp', DB::table('slides')->find(2)->image_mobile);
    }
}
