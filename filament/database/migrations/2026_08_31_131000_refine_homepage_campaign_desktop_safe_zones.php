<?php

use App\Support\ApiResponseCache;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    private const SLIDES = [
        6 => [
            'source' => 'returns-desktop.webp',
            'target' => 'slides/protein-returns-desktop-20260831-v2.webp',
            'previous' => 'slides/protein-returns-desktop-20260831.webp',
        ],
        11 => [
            'source' => 'pack-builder-desktop.webp',
            'target' => 'slides/protein-pack-builder-desktop-20260831-v2.webp',
            'previous' => 'slides/protein-pack-builder-desktop-20260831.webp',
        ],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        foreach (self::SLIDES as $slideId => $asset) {
            $contents = $this->readReleaseAsset($asset['source']);
            Storage::disk('public')->put($asset['target'], $contents, ['visibility' => 'public']);

            DB::table('slides')->where('id', $slideId)->update([
                'image' => $asset['target'],
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

        foreach (self::SLIDES as $slideId => $asset) {
            DB::table('slides')->where('id', $slideId)->update([
                'image' => $asset['previous'],
                'updated_at' => now(),
            ]);
            Storage::disk('public')->delete($asset['target']);
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
