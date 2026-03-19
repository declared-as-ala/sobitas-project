<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Throwable;

class ConvertUploadedImageToWebp
{
    public function __construct(
        private int $quality = 85,
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
            $disk->delete($relativePath);

            return $newRelative;
        } catch (Throwable) {
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
