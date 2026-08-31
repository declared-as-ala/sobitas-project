<?php

use App\Support\ApiResponseCache;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    /**
     * New campaign artwork is shipped with the release and copied to the persistent public disk.
     * The previous assets stay untouched, so reverting the database references is lossless.
     */
    private const CAMPAIGNS = [
        6 => [
            'desktop_source' => 'returns-desktop.webp',
            'mobile_source' => 'returns-mobile.webp',
            'desktop_target' => 'slides/protein-returns-desktop-20260831.webp',
            'mobile_target' => 'slides/protein-returns-mobile-20260831.webp',
            'link' => '/politique-de-remboursement',
            'alt' => 'Échange ou retour facile sous 7 jours chez Protein.tn en Tunisie',
            'previous_desktop' => 'slides/5393bcfb-1249-4520-bede-a1620fa7761f.webp',
            'previous_mobile' => 'slides/51708b5b-f5b5-4451-aeaa-c022dc92fb0d.webp',
            'previous_link' => null,
            'previous_alt' => 'Sélection de whey, créatine et compléments de nutrition sportive disponibles sur Protein.tn',
        ],
        11 => [
            'desktop_source' => 'pack-builder-desktop.webp',
            'mobile_source' => 'pack-builder-mobile.webp',
            'desktop_target' => 'slides/protein-pack-builder-desktop-20260831.webp',
            'mobile_target' => 'slides/protein-pack-builder-mobile-20260831.webp',
            'link' => '/pack-builder',
            'alt' => 'Composez votre pack de compléments Protein.tn et augmentez automatiquement votre remise',
            'previous_desktop' => 'slides/68b2250d-3513-4982-a6e6-3fddda81fcc3.webp',
            'previous_mobile' => 'slides/22685447-328f-4a35-93ba-a73c0832fc1d.webp',
            'previous_link' => null,
            'previous_alt' => null,
        ],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        foreach (self::CAMPAIGNS as $slideId => $campaign) {
            $desktop = $this->readReleaseAsset($campaign['desktop_source']);
            $mobile = $this->readReleaseAsset($campaign['mobile_source']);

            Storage::disk('public')->put($campaign['desktop_target'], $desktop, ['visibility' => 'public']);
            Storage::disk('public')->put($campaign['mobile_target'], $mobile, ['visibility' => 'public']);

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
                'lien' => $campaign['previous_link'],
                'alt' => $campaign['previous_alt'],
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
