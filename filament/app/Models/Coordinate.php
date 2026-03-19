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
     * Prefers logo_facture on the public disk; supports full http(s) URLs in DB.
     */
    public static function publicBrandLogoUrl(): string
    {
        $coordinate = static::getCached();
        $raw = $coordinate?->logo_facture;

        if (! empty($raw)) {
            $raw = trim((string) $raw);
            if (preg_match('#^https?://#i', $raw)) {
                return $raw;
            }

            $path = ltrim($raw, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, strlen('storage/'));
            }

            return rtrim(static::originRootUrl(), '/').'/storage/'.$path;
        }

        return rtrim(static::originRootUrl(), '/').'/logo.png';
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
