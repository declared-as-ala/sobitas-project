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
 *
 * …with one exception that is not a path question at all: a FileUpload whose column can hold an
 * IMPORTED cover must be wrapped in ExternalImageUpload::allow(), because Filament's own hydration
 * drops any value the `public` disk cannot find and the next save then writes that emptiness back
 * over the column. Normalising the path cannot prevent that; see that class.
 */
class ImagePath
{
    public const FALLBACK_PLACEHOLDER = 'placeholders/missing-media.svg';

    /**
     * True when the value is an absolute URL on a host we reference instead of mirroring.
     *
     * ── WHY THIS IS ONE PREDICATE AND NOT AN `if` REPEATED PER CALL SITE ─────────────────────
     * Two completely different questions in this codebase have the same answer, and they must not
     * be allowed to disagree:
     *
     *   · "may I keep the domain?"          — normalize()
     *   · "may I ask the local disk about it?" — normalizeExisting(), AuditMediaIntegrity,
     *                                            ExternalImageUpload
     *
     * A value that survives normalize() intact is, by construction, NOT a path on the `public`
     * disk. Every `Storage::disk('public')->exists()` / `->url()` / `->size()` performed on one is
     * therefore guaranteed wrong — and wrong quietly: exists() answers false (so the caller
     * substitutes a placeholder or drops the value) and url() answers
     * `https://admin.protein.tn/storage/https://cloudinary.images-iherb.com/…` (a 404 with a 200
     * on the page around it). Both failures look like "the product has no image", which is exactly
     * how they were reported.
     *
     * The allowlist itself lives in config/catalog.php `media.external_hosts` and its twin lives in
     * frontend/next.config.js `images.remotePatterns`. Both are required.
     *
     * Subdomain match is by dot-prefix on purpose: `s3.images-iherb.com` must match the configured
     * `images-iherb.com`, while `images-iherb.com.example.net` must not.
     */
    public static function isExternal(?string $value): bool
    {
        if (! $value || trim($value) === '') {
            return false;
        }

        if (! str_starts_with($value, 'http://') && ! str_starts_with($value, 'https://')) {
            return false;
        }

        $host = strtolower((string) parse_url($value, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }

        $external = array_map('strtolower', (array) config('catalog.media.external_hosts', []));

        foreach ($external as $allowed) {
            $allowed = trim((string) $allowed);
            if ($allowed === '') {
                continue;
            }
            if ($host === $allowed || str_ends_with($host, '.'.$allowed)) {
                return true;
            }
        }

        return false;
    }

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
            if (self::isExternal($value)) {
                return $value;
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
     *
     * ── THE LINE THAT MADE EVERY IMPORTED PRODUCT LOOK IMAGELESS IN THE ADMIN ────────────────
     * Every ImageColumn in the panel is wired as
     *
     *     ->getStateUsing(fn ($record) => ImagePath::normalizeExisting($record->cover))->disk('public')
     *
     * so this method decides what those columns render. It used to send EVERY value through
     * `Storage::disk('public')->exists()`. For an allowlisted CDN URL that probe asks the local
     * filesystem whether it holds a file literally named `https://cloudinary.images-iherb.com/…`;
     * the answer is no, so the imported cover was replaced by the missing-media placeholder on the
     * Stock pages, the stock dashboard, the low-stock page and the product list — all 812 imported
     * products, heading for ~19,000. The image was never broken; this method threw it away before
     * Filament ever saw it.
     *
     * An external URL therefore short-circuits BEFORE the disk is consulted (see isExternal()).
     * Filament v4.2.0 renders it as-is: Tables\Columns\ImageColumn::getImageUrl() returns the state
     * untouched when `filter_var($state, FILTER_VALIDATE_URL) !== false`, and only falls through to
     * `$storage->exists()` / `$storage->url()` for values that are not URLs. That dependency is not
     * assumed — filament/tests/catalog/image-path-external-check.php asserts the filter_var verdict
     * on a real Cloudinary cover and on a real legacy path, so a cover URL shape that Filament
     * would not recognise fails the harness instead of silently blanking the column.
     *
     * NOTHING CHANGES FOR THE 309 LEGACY PRODUCTS: their covers are relative paths on the public
     * disk (`produits/…webp`), isExternal() is false for every one of them, and they take the same
     * exists()-then-fallback branch they always did, byte for byte.
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

        if (self::isExternal($path)) {
            return $path;
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
