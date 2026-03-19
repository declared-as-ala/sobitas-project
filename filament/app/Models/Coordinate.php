<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Coordinate extends Model
{
    protected $table = 'coordinates';

    protected $guarded = ['id'];

    /**
     * Get the singleton coordinate record with caching.
     * This table has only 1 row and rarely changes.
     */
    public static function getCached(): ?self
    {
        return Cache::remember('coordinate:singleton', 3600, function () {
            return static::first();
        });
    }

    /**
     * Clear the cache when the model is saved or deleted.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('coordinate:singleton'));
        static::deleted(fn () => Cache::forget('coordinate:singleton'));
    }

    /**
     * Public origin for building asset URLs (scheme + host [+ base path]).
     * Uses the current HTTP request when available so logos work when APP_URL
     * does not match the browser host (Docker, reverse proxy, wrong .env).
     */
    public static function originRootUrl(): string
    {
        if (! app()->runningInConsole() && request()) {
            $host = request()->getSchemeAndHttpHost();
            $base = rtrim((string) request()->getBasePath(), '/');

            return $base !== '' ? $host.$base : $host;
        }

        return rtrim((string) config('app.url'), '/');
    }

    /**
     * Absolute URL for Filament panel logo / favicon / login logo.
     * Returns null when no valid logo can be confirmed to exist, so callers
     * can show a text/brand-name fallback instead of a broken <img>.
     *
     * Resolution order:
     *   1. logo_facture is a full http(s) URL → return as-is (external CDN).
     *   2. logo_facture is a relative path → verify file exists on public disk,
     *      then build URL from the live request origin (proxy-safe).
     *   3. Fallback: public/logo.png (direct public file, no symlink needed).
     *   4. Nothing found → null.
     */
    public static function publicBrandLogoUrl(): ?string
    {
        $coordinate = static::getCached();
        $raw        = $coordinate?->logo_facture;

        \Illuminate\Support\Facades\Log::debug('[Logo] publicBrandLogoUrl called', [
            'logo_facture' => $raw ?? 'null',
            'origin'       => static::originRootUrl(),
        ]);

        if (! empty($raw)) {
            $raw = trim((string) $raw);

            // External URL – trust as-is (no local file check possible).
            if (preg_match('#^https?://#i', $raw)) {
                \Illuminate\Support\Facades\Log::debug('[Logo] using external URL', ['url' => $raw]);

                return $raw;
            }

            // Normalise: strip leading slash and any accidental `storage/` prefix
            // (FileUpload stores only the disk-relative path, e.g. coordonnees/Month/file.png).
            $path = ltrim($raw, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, strlen('storage/'));
            }

            // Confirm the file is actually present on the public disk before
            // returning a URL that would 404 in the browser.
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($path)) {
                $url = rtrim(static::originRootUrl(), '/') . '/storage/' . $path;
                \Illuminate\Support\Facades\Log::debug('[Logo] resolved storage URL', ['url' => $url, 'path' => $path]);

                return $url;
            }

            \Illuminate\Support\Facades\Log::warning('[Logo] logo_facture path not found on public disk', [
                'raw'  => $raw,
                'path' => $path,
            ]);
        }

        // Fallback: public/logo.png is a direct file – no symlink required.
        if (is_file(public_path('logo.png'))) {
            $url = rtrim(static::originRootUrl(), '/') . '/logo.png';
            \Illuminate\Support\Facades\Log::debug('[Logo] falling back to public/logo.png', ['url' => $url]);

            return $url;
        }

        \Illuminate\Support\Facades\Log::warning('[Logo] no logo resolved – returning null');

        return null;
    }

    /**
     * Absolute URL for login page background image, or empty if file missing.
     */
    public static function publicLoginBackgroundUrl(): string
    {
        if (! is_file(public_path('images/auth/gym-bg.jpg'))) {
            return '';
        }

        return rtrim(static::originRootUrl(), '/').'/images/auth/gym-bg.jpg';
    }
}
