<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Targeted invalidation for the `cache.api` middleware.
 *
 * THE PROBLEM THIS SOLVES
 * CacheApiResponse stores each response under `api_cache:md5(fullUrl)` with a flat TTL and no way
 * to find that key again. Nothing in the admin ever invalidated it, so editing a slide (or a
 * category, or the coordinates) left the storefront serving the old payload for up to the full
 * 5-minute TTL — and then Next.js's own 5-minute ISR window on top of it. From the admin's chair
 * that is indistinguishable from the save having failed: you type, you click Enregistrer, you
 * reload the site, nothing changed.
 *
 * WHY AN INDEX AND NOT Cache::tags()
 * Tags need a taggable store. Production runs Redis (docker-compose) but .env.example ships
 * `CACHE_DRIVER=file`, and `Cache::tags()` on the file store throws BadMethodCallException — a
 * fatal on every admin save in any environment that follows the example file. An index set is
 * driver-agnostic and behaves identically everywhere.
 *
 * WHY GROUPED BY FIRST PATH SEGMENT
 * `/api/slides` and `/api/slides?per_page=50` are different cache keys for the same content, and
 * the internal Docker host and the public host produce different keys again for the same request.
 * Guessing the URLs would silently miss some. Recording what was actually written is exact.
 *
 * EVERY METHOD SWALLOWS ITS OWN FAILURES. A cache problem must never turn into a failed product
 * save or a 500 on the storefront — degrading to the old TTL behaviour is always the safe answer.
 */
final class ApiResponseCache
{
    /** How long a group's key index lives. Comfortably longer than any response TTL. */
    private const INDEX_TTL = 86400;

    /** Cap the index so a route with unbounded query strings cannot grow it without limit. */
    private const MAX_KEYS_PER_GROUP = 200;

    /**
     * The invalidation group for a request: the first path segment after `api/`.
     * `/api/slides?per_page=50` → "slides". Returns null for anything unrecognised.
     */
    public static function groupFor(Request $request): ?string
    {
        $segments = $request->segments();          // ['api', 'slides', ...]
        $index    = array_search('api', $segments, true);
        $group    = $index === false ? ($segments[0] ?? null) : ($segments[$index + 1] ?? null);

        if (! is_string($group) || $group === '') {
            return null;
        }

        // Path parameters (slugs, ids) are part of the group's identity only at the first segment;
        // `/api/product_details/whey-gold` belongs to group "product_details" as a whole.
        return preg_match('/^[a-z0-9_\-]+$/i', $group) === 1 ? strtolower($group) : null;
    }

    /** Record a key that CacheApiResponse just wrote, so it can be found and dropped later. */
    public static function register(string $group, string $cacheKey): void
    {
        try {
            $indexKey = self::indexKey($group);
            $keys     = Cache::get($indexKey, []);

            if (! is_array($keys)) {
                $keys = [];
            }
            if (in_array($cacheKey, $keys, true)) {
                return; // already indexed — the common case, and the cheapest path
            }

            $keys[] = $cacheKey;
            if (count($keys) > self::MAX_KEYS_PER_GROUP) {
                $keys = array_slice($keys, -self::MAX_KEYS_PER_GROUP);
            }

            Cache::put($indexKey, $keys, self::INDEX_TTL);
        } catch (Throwable $e) {
            Log::warning('api_cache.index_failed', ['group' => $group, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Drop every cached response in a group. Safe to call for a group that was never populated.
     *
     * @param  string|string[]  $groups
     */
    public static function forget(string|array $groups): void
    {
        foreach ((array) $groups as $group) {
            try {
                $indexKey = self::indexKey($group);
                $keys     = Cache::get($indexKey, []);

                foreach (is_array($keys) ? $keys : [] as $key) {
                    Cache::forget($key);
                }

                Cache::forget($indexKey);

                Log::info('api_cache.group_flushed', [
                    'group' => $group,
                    'keys'  => is_array($keys) ? count($keys) : 0,
                ]);
            } catch (Throwable $e) {
                Log::warning('api_cache.flush_failed', ['group' => $group, 'error' => $e->getMessage()]);
            }
        }
    }

    private static function indexKey(string $group): string
    {
        return 'api_cache_index:' . $group;
    }
}
