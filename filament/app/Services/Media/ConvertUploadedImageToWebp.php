<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Throwable;

class ConvertUploadedImageToWebp
{
    /**
     * 92, not 85 — because this file is a MASTER, not what a visitor downloads.
     *
     * Every image here gets compressed twice: once on upload by this class, then again by Next's
     * image optimizer, which re-encodes to AVIF/WebP at serve time. Encoding an already-lossy
     * WebP is where the softness the owner reported comes from — generation loss, not one bad
     * setting. The second pass is the one that controls page weight, so the master should give it
     * the cleanest input it can rather than saving bytes nobody ships.
     *
     * The cost lands on disk only. Raising this does NOT make pages heavier: users are served the
     * optimizer's output, never this file.
     */
    public function __construct(
        private int $quality = 92,
    ) {}

    /**
     * Convert a file already stored on a disk (e.g. after Filament FileUpload commits) to WebP.
     * Deletes the original when conversion succeeds. Non-raster or already-.webp paths are left as-is.
     */
    public function convertStoredPathToWebp(?string $relativePath, string $diskName = 'public'): ?string
    {
        if ($relativePath === null || $relativePath === '') {
            return $relativePath;
        }

        $relativePath = ltrim($relativePath, '/');
        if (str_ends_with(strtolower($relativePath), '.webp')) {
            return $relativePath;
        }

        $disk = Storage::disk($diskName);
        if (! $disk->exists($relativePath)) {
            return $relativePath;
        }

        $fullPath = $disk->path($relativePath);
        if (! is_readable($fullPath)) {
            return $relativePath;
        }

        try {
            $manager = new ImageManager(new Driver());
            $image = $manager->read($fullPath);
            $encoded = (string) $image->toWebp($this->quality);

            $dir = pathinfo($relativePath, PATHINFO_DIRNAME);
            $newBase = Str::uuid()->toString().'.webp';
            $newRelative = ($dir !== '.' && $dir !== '') ? $dir.'/'.$newBase : $newBase;

            $disk->put($newRelative, $encoded);
            try {
                $disk->delete($relativePath);
            } catch (Throwable $e) {
                Log::warning('media.webp.delete_original_failed', [
                    'disk' => $diskName,
                    'old_path' => $relativePath,
                    'new_path' => $newRelative,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('media.webp.converted', [
                'disk' => $diskName,
                'old_path' => $relativePath,
                'new_path' => $newRelative,
                'quality' => $this->quality,
            ]);

            return $newRelative;
        } catch (Throwable $e) {
            Log::warning('media.webp.conversion_failed', [
                'disk' => $diskName,
                'path' => $relativePath,
                'error' => $e->getMessage(),
            ]);
            return $relativePath;
        }
    }

    /**
     * @param  array<int, string>|null  $paths
     * @return array<int, string>|null
     */
    public function convertStoredPathsToWebp(?array $paths, string $diskName = 'public'): ?array
    {
        if ($paths === null || $paths === []) {
            return $paths;
        }

        return array_values(array_map(
            fn (string $p): string => $this->convertStoredPathToWebp($p, $diskName) ?? $p,
            $paths,
        ));
    }
}
