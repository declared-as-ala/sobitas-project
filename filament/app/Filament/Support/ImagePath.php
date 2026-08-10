<?php

namespace App\Filament\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Normalizes image path values stored by Voyager or Filament.
 *
 * Voyager sometimes stores full URLs (https://admin.protein.tn/storage/produits/file.webp)
 * or paths with a `public/` prefix. Filament expects plain relative paths for
 * Storage::disk('public')->url() to generate the correct URL.
 *
 * Usage in ImageColumn:
 *   ->getStateUsing(fn ($record) => ImagePath::normalize($record->cover))
 *   ->disk('public')
 *
 * Usage in FileUpload:
 *   ->afterStateHydrated(fn ($component, $state) =>
 *       $component->state(ImagePath::normalize($state)))
 */
class ImagePath
{
    public const FALLBACK_PLACEHOLDER = 'placeholders/missing-media.svg';

    public static function normalize(?string $value): ?string
    {
        if (! $value || trim($value) === '') {
            return null;
        }

        // Full URL (any domain) → extract only the relative storage path
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            // …EXCEPT for image CDNs we deliberately reference rather than mirror.
            //
            // This method assumes every absolute URL is one of OUR files that happens to carry a
            // domain, so it throws the domain away and keeps the path. That is right for
            // `https://admin.protein.tn/storage/produits/x.webp` and catastrophic for
            // `https://cloudinary.images-iherb.com/image/upload/…/1.jpg`: the domain is discarded,
            // the leftover path is resolved against our own host, and every imported product shows
            // a broken image while every status code stays 200.
            //
            // An allowlisted host is already a usable image reference, so it passes through whole.
            $host = strtolower((string) parse_url($value, PHP_URL_HOST));
            $external = array_map('strtolower', (array) config('catalog.media.external_hosts', []));

            foreach ($external as $allowed) {
                if ($host === $allowed || str_ends_with($host, '.'.$allowed)) {
                    return $value;
                }
            }

            $path = ltrim(parse_url($value, PHP_URL_PATH) ?? '', '/');
            // Strip /storage/ prefix that Laravel adds
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, 8);
            }

            return $path !== '' ? $path : null;
        }

        // Strip legacy `public/` prefix (some Voyager configs store it this way)
        if (str_starts_with($value, 'public/')) {
            return substr($value, 7);
        }

        return $value;
    }

    /**
     * Normalize each path in an array (for multi-image fields like Product->images).
     *
     * @param  array<string>|null  $values
     * @return array<string>
     */
    public static function normalizeArray(?array $values): array
    {
        if (! $values) {
            return [];
        }

        return array_values(array_filter(
            array_map(fn ($v) => self::normalize($v), $values)
        ));
    }

    /**
     * Normalize path and return a fallback placeholder when file is missing.
     */
    public static function normalizeExisting(
        ?string $value,
        string $disk = 'public',
        ?string $fallback = self::FALLBACK_PLACEHOLDER
    ): ?string {
        $path = self::normalize($value);
        if (! $path) {
            return $fallback;
        }

        try {
            if (Storage::disk($disk)->exists($path)) {
                return $path;
            }
        } catch (\Throwable) {
            return $fallback;
        }

        return $fallback;
    }
}
