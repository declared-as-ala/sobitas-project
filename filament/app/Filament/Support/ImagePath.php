<?php

namespace App\Filament\Support;

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
    public static function normalize(?string $value): ?string
    {
        if (! $value || trim($value) === '') {
            return null;
        }

        // Full URL (any domain) → extract only the relative storage path
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
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
}
