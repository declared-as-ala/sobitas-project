<?php

use App\Support\ApiResponseCache;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    private const DESKTOP_SOURCE = 'returns-desktop-v4.webp';

    private const MOBILE_SOURCE = 'returns-mobile-v4.webp';

    private const DESKTOP_TARGET = 'slides/protein-returns-desktop-20260831-v4.webp';

    private const MOBILE_TARGET = 'slides/protein-returns-mobile-20260831-v4.webp';

    public function up(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        Storage::disk('public')->put(
            self::DESKTOP_TARGET,
            $this->readReleaseAsset(self::DESKTOP_SOURCE),
            ['visibility' => 'public'],
        );
        Storage::disk('public')->put(
            self::MOBILE_TARGET,
            $this->readReleaseAsset(self::MOBILE_SOURCE),
            ['visibility' => 'public'],
        );

        DB::table('slides')->where('id', 6)->update([
            'image' => self::DESKTOP_TARGET,
            'image_mobile' => self::MOBILE_TARGET,
            'updated_at' => now(),
        ]);

        ApiResponseCache::forget('slides');
    }

    public function down(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        DB::table('slides')->where('id', 6)->update([
            'image' => 'slides/protein-returns-desktop-20260831-v3.webp',
            'image_mobile' => 'slides/protein-returns-mobile-20260831-v3.webp',
            'updated_at' => now(),
        ]);

        Storage::disk('public')->delete([
            self::DESKTOP_TARGET,
            self::MOBILE_TARGET,
        ]);

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
