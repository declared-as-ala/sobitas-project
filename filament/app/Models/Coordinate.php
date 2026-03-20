<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class Coordinate extends Model
{
    protected $table = 'coordinates';

    protected $guarded = ['id'];

    /**
     * Get the singleton coordinate record with caching.
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
     * Uses the current HTTP request so logos work behind reverse proxies and
     * in Docker environments where APP_URL may not match the real browser host.
     */
    public static function originRootUrl(): string
    {
        if (! app()->runningInConsole() && request()) {
            $host = request()->getSchemeAndHttpHost();
            $base = rtrim((string) request()->getBasePath(), '/');

            return $base !== '' ? $host . $base : $host;
        }

        return rtrim((string) config('app.url'), '/');
    }

    /**
     * Read a value from the shared Voyager `settings` table (1-hour cache).
     *
     * Both apps (Voyager backend + Filament) share the same MySQL database,
     * so reading `settings` here gives the exact same source as Voyager uses.
     * Returns null if the table is unreachable or the key is absent/empty.
     */
    private static function voyagerSetting(string $key): ?string
    {
        return Cache::remember('voyager_setting:' . $key, 3600, function () use ($key) {
            try {
                $value = DB::table('settings')->where('key', $key)->value('value');

                return ($value !== null && $value !== '') ? (string) $value : null;
            } catch (\Throwable) {
                // settings table absent (fresh install / different DB) – degrade gracefully.
                return null;
            }
        });
    }

    /**
     * Build an absolute public URL for a path stored on the public disk.
     *
     * Handles:
     *   - Windows backslashes (Voyager on Windows stores `settings\May2023\file.jpg`)
     *   - Accidental `storage/` prefix
     *   - File-existence check before emitting a URL that would 404
     */
    private static function storageUrl(string $raw): ?string
    {
        // Normalise Windows backslashes written by Voyager on Windows hosts.
        $path = str_replace('\\', '/', trim($raw));
        $path = ltrim($path, '/');

        // Strip any accidental `storage/` prefix (some helpers prepend it).
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        if (Storage::disk('public')->exists($path)) {
            return rtrim(static::originRootUrl(), '/') . '/storage/' . $path;
        }

        return null;
    }

    /**
     * Absolute URL for the Filament panel logo / favicon / login logo.
     *
     * Resolution order (mirrors how Voyager resolves the logo):
     *   1. `settings` table key `site.logo`  – same source Voyager uses; files
     *      exist on the shared public disk (`settings/MonthYear/file.ext`).
     *   2. `coordinates.logo_facture`         – Filament-native upload fallback.
     *   3. `public/logo.png`                  – static fallback, no symlink needed.
     *   4. null                               – caller shows brand-name text.
     */
    public static function publicBrandLogoUrl(): ?string
    {
        // ── 1. Voyager shared settings table ────────────────────────────────
        $raw = static::voyagerSetting('site.logo');
        if ($raw !== null) {
            $url = static::storageUrl($raw);
            if ($url !== null) {
                return $url;
            }
        }

        // ── 2. Filament coordinates table ───────────────────────────────────
        $coordinate = static::getCached();
        $raw        = $coordinate?->logo_facture;

        if (! empty($raw)) {
            $raw = trim((string) $raw);

            // External URL stored directly (e.g. CDN link).
            if (preg_match('#^https?://#i', $raw)) {
                return $raw;
            }

            $url = static::storageUrl($raw);
            if ($url !== null) {
                return $url;
            }
        }

        // ── 3. Static fallback (direct public/ file, no symlink required) ───
        if (is_file(public_path('logo.png'))) {
            return rtrim(static::originRootUrl(), '/') . '/logo.png';
        }

        return null;
    }

    /**
     * Absolute URL for the login page background image.
     *
     * Resolution order (mirrors Voyager's `admin.bg_image` setting):
     *   1. `settings` table key `admin.bg_image` – same source Voyager uses.
     *   2. `public/images/auth/gym-bg.jpg`        – static fallback.
     *   3. ''                                      – caller renders solid colour.
     */
    public static function publicLoginBackgroundUrl(): string
    {
        // ── 1. Voyager shared settings table ────────────────────────────────
        $raw = static::voyagerSetting('admin.bg_image');
        if ($raw !== null) {
            $url = static::storageUrl($raw);
            if ($url !== null) {
                return $url;
            }
        }

        // ── 2. Static fallback (no symlink required) ─────────────────────────
        if (is_file(public_path('images/auth/gym-bg.jpg'))) {
            return rtrim(static::originRootUrl(), '/') . '/images/auth/gym-bg.jpg';
        }

        return '';
    }
}
