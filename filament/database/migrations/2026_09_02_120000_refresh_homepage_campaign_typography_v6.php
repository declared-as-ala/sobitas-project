<?php

use App\Support\ApiResponseCache;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    private const CAMPAIGNS = [
        6 => [
            'desktop_source' => 'returns-desktop-v6.webp',
            'mobile_source' => 'returns-mobile-v6.webp',
            'desktop_target' => 'slides/protein-returns-desktop-20260902-v6.webp',
            'mobile_target' => 'slides/protein-returns-mobile-20260902-v6.webp',
            'link' => '/politique-de-remboursement',
            'alt' => 'Retour ou échange sous 7 jours chez Protein.tn avec whey, créatine et pré-workout',
            'previous_desktop' => 'slides/protein-returns-desktop-20260831-v5.webp',
            'previous_mobile' => 'slides/protein-returns-mobile-20260831-v5.webp',
        ],
        11 => [
            'desktop_source' => 'pack-builder-desktop-v6.webp',
            'mobile_source' => 'pack-builder-mobile-v6.webp',
            'desktop_target' => 'slides/protein-pack-builder-desktop-20260902-v6.webp',
            'mobile_target' => 'slides/protein-pack-builder-mobile-20260902-v6.webp',
            'link' => '/pack-builder',
            'alt' => 'Composez votre pack Protein.tn avec whey, créatine et pré-workout pour augmenter votre remise',
            'previous_desktop' => 'slides/protein-pack-builder-desktop-20260831-v5.webp',
            'previous_mobile' => 'slides/protein-pack-builder-mobile-20260831-v5.webp',
        ],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        foreach (self::CAMPAIGNS as $slideId => $campaign) {
            Storage::disk('public')->put(
                $campaign['desktop_target'],
                $this->readReleaseAsset($campaign['desktop_source']),
                ['visibility' => 'public'],
            );
            Storage::disk('public')->put(
                $campaign['mobile_target'],
                $this->readReleaseAsset($campaign['mobile_source']),
                ['visibility' => 'public'],
            );

            DB::table('slides')->where('id', $slideId)->update([
                'image' => $campaign['desktop_target'],
                'image_mobile' => $campaign['mobile_target'],
                'lien' => $campaign['link'],
                'alt' => $campaign['alt'],
                'updated_at' => now(),
            ]);
        }

        ApiResponseCache::forget('slides');
    }

    public function down(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        foreach (self::CAMPAIGNS as $slideId => $campaign) {
            DB::table('slides')->where('id', $slideId)->update([
                'image' => $campaign['previous_desktop'],
                'image_mobile' => $campaign['previous_mobile'],
                'lien' => $campaign['link'],
                'alt' => $campaign['alt'],
                'updated_at' => now(),
            ]);

            Storage::disk('public')->delete([
                $campaign['desktop_target'],
                $campaign['mobile_target'],
            ]);
        }

        ApiResponseCache::forget('slides');
    }

    private function readReleaseAsset(string $filename): string
    {
        $path = resource_path('slide-assets/2026-08-31/'.$filename);
        $contents = @file_get_contents($path);

        if ($contents === false) {
            throw new \RuntimeException("Campaign slide asset is missing: {$path}");
        }

        return $contents;
    }
};
