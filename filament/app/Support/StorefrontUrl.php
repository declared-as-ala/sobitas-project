<?php

namespace App\Support;

/**
 * The public storefront origin, guaranteed to be the live protein.tn apex.
 *
 * WHY THIS EXISTS
 * Every public URL the API hands out — CMS page canonicals, article canonicals, category SEO
 * envelopes, breadcrumb URLs, the product canonical — was built from
 * `config('app.frontend_url', config('app.url'))`, i.e. from FRONTEND_URL / FRONTEND_DOMAIN /
 * APP_URL in the server's .env. The committed default is https://protein.tn, but production still
 * carries the pre-rebrand value, and the result was visible on the live API:
 *
 *   GET /api/page/politique-des-cookies
 *     -> canonical_url: "https://sobitas.tn/politique-des-cookies"
 *
 * That looked like bad data, and a migration was written to clear it. The migration found only ONE
 * pages row with a canonical_url stored at all, and none of them off-domain — because the value was
 * never in the database. pagePayload SYNTHESISES it from this base whenever the column is empty, so
 * every CMS page (and every future one) inherited the legacy domain. A canonical pointing at
 * another host tells Google that host owns the content.
 *
 * Forcing the apex here fixes all call sites at once and makes them immune to whatever the .env
 * says, which is the same guarantee `forceProteinDomain()` gives on the frontend. Fixing the env
 * var on the VPS is still worth doing — but it must not be the only thing standing between the
 * catalogue and an off-domain canonical.
 */
class StorefrontUrl
{
    public const CANONICAL_HOST = 'protein.tn';

    private const FALLBACK = 'https://protein.tn';

    /**
     * Absolute origin with no trailing slash, e.g. "https://protein.tn".
     * Any configured host that is not the canonical apex is replaced, and a "www." prefix dropped.
     */
    public static function base(): string
    {
        $configured = trim((string) config('app.frontend_url', (string) config('app.url', '')));
        if ($configured === '') {
            return self::FALLBACK;
        }

        $parts = parse_url(rtrim($configured, '/'));
        $host = is_array($parts) ? strtolower((string) ($parts['host'] ?? '')) : '';
        if ($host === '') {
            return self::FALLBACK;
        }

        $host = preg_replace('/^www\./', '', $host);
        if ($host !== self::CANONICAL_HOST) {
            // Legacy sobitas.tn, a staging host, localhost — none of these belong in a public
            // canonical or breadcrumb. Fall back rather than propagate.
            return self::FALLBACK;
        }

        return 'https://' . self::CANONICAL_HOST;
    }

    /** Absolute storefront URL for a path, e.g. url('/whey-proteine'). */
    public static function to(string $path = '/'): string
    {
        return self::base() . '/' . ltrim($path, '/');
    }
}
