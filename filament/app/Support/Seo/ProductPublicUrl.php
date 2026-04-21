<?php

namespace App\Support\Seo;

use Illuminate\Support\Facades\Storage;

/**
 * Absolute public URLs for product images (JSON-LD, OG, API).
 */
final class ProductPublicUrl
{
    public static function fromPath(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        $path = (string) $path;

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return url(Storage::disk('public')->url($path));
    }
}
