<?php

namespace App\Services\Seo;

use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Instant-indexing + cache-refresh when an SEO-relevant product (or an approved review) changes.
 *
 * It calls the Next.js storefront over the INTERNAL docker network
 * (config: services.frontend.internal_url = http://sobitas-frontend:3000) so the request never
 * traverses Cloudflare, and submits the PUBLIC product URL to IndexNow. All network work is
 * dispatched AFTER the HTTP response and wrapped best-effort — an admin save must never be blocked
 * or broken if the storefront is slow or unreachable.
 *
 * Of the three calls this makes, two are ABOUT ONE URL (revalidate that page, submit that page to
 * IndexNow) and stay per-product. The third — busting the storefront's cached sitemap — is about the
 * whole site, and is coalesced: see bustSitemapCache() for why, and for the exact bound on how stale
 * a change can be as a result.
 */
class SeoNotifier
{
    /**
     * How long one sitemap cache-bust suppresses the next one IN THIS PROCESS.
     *
     * Not a cache/redis gate on purpose — see bustSitemapCache(). A minute is long enough to
     * collapse a promotion wave's tail of notifications into a handful of calls and short enough
     * that two unrelated saves a human made are never merged.
     */
    private const SITEMAP_BUST_WINDOW_SECONDS = 60;

    /**
     * Wall-clock second at which this process last sent a sitemap bust, or null for "not yet /
     * the last attempt failed". Static because the thing being protected — the storefront's ONE
     * cached sitemap crawl — is shared by every notification this process makes.
     */
    private static ?float $sitemapBustAt = null;

    public function productChanged(Product $product): void
    {
        $ctx = $this->buildContext($product);
        if ($ctx === null) {
            return;
        }

        // Runs after the response is flushed (never blocks the admin save); best-effort.
        dispatch(static function () use ($ctx): void {
            self::send($ctx);
        })->afterResponse();
    }

    /**
     * Synchronous variant for callers that are ALREADY running after the response
     * (e.g. the review-moderation pass runs in an afterResponse callback). Nesting
     * another afterResponse there is unreliable, so do the network work inline.
     */
    public function productChangedNow(Product $product): void
    {
        $ctx = $this->buildContext($product);
        if ($ctx !== null) {
            self::send($ctx);
        }
    }

    /**
     * Bust ONLY the cached sitemap. For content that has no single indexable page of its own, or
     * whose page cache does not need touching — categories, subcategories, brands, articles, CMS
     * pages — the thing that must refresh is /sitemap.xml, so its <lastmod> and URL set follow the
     * catalogue instead of lagging up to an hour behind.
     *
     * Before this, ONLY a product save refreshed the sitemap. Renaming a category, publishing an
     * article or adding a brand left the sitemap stale until the 1h TTL expired — the sitemap was
     * "automatic" for one content type out of six.
     *
     * Fire-and-forget after the response, and swallowing every failure: an admin save must never
     * fail because the storefront was slow. The call itself is coalesced per process — see
     * bustSitemapCache(); a single admin save still refreshes the sitemap immediately, and a loop
     * that touches a thousand rows no longer sends a thousand busts.
     */
    public function sitemapChanged(): void
    {
        $internal = rtrim((string) config('services.frontend.internal_url'), '/');
        if ($internal === '') {
            return; // not configured — no-op
        }
        $secret = (string) config('services.frontend.revalidate_secret');

        dispatch(static function () use ($internal, $secret): void {
            self::bustSitemapCache($internal, $secret);
        })->afterResponse();
    }

    /**
     * Bust the storefront's cached sitemap — AT MOST ONCE PER MINUTE PER PROCESS.
     *
     * ── WHAT WAS WRONG ────────────────────────────────────────────────────────────────────────
     * frontend/src/util/sitemapData.ts memoises the entire catalogue crawl behind
     * unstable_cache(tag: 'sitemap') and its docblock states the contract this class is supposed to
     * honour: bust it "once at the END of a promotion wave, not once per product". Nothing here did
     * that. Every product save reached send() below, and every send() posted its own
     * `?tag=sitemap` — which CatalogIHerbPromote's own pre-flight warning already spells out to the
     * operator ("three HTTP calls apiece ... ~%s requests at the storefront"). A comment describing
     * behaviour the code lacks is worse than no comment, because the next person plans around it.
     *
     * ── WHY DUPLICATE BUSTS ARE NOT MERELY REDUNDANT ──────────────────────────────────────────
     * Invalidating the same tag N times does not invalidate it any harder than once. What the extra
     * N-1 calls buy is N-1 more windows in which a crawler poll of /sitemap.xml can land on a cold
     * cache and pay for a full catalogue crawl — which at 20,000 products is ~200 paginated
     * /all_products requests, against an API budget the SSR container shares with real page renders,
     * and which the next bust milliseconds later throws away again.
     *
     * ── WHY PER-PROCESS, AND NOT A SHARED LOCK IN REDIS ───────────────────────────────────────
     * Because the unit of "a wave" IS a process. A promotion run is one artisan process; a Filament
     * bulk action is one HTTP request. A shared cross-process gate would additionally swallow the
     * bust from an unrelated admin save happening in the same minute in another container — trading
     * away interactive freshness that nobody asked us to trade. With this, a single admin save still
     * refreshes the sitemap immediately, exactly as before.
     *
     * ── WHY IT CANNOT DROP A CHANGE INSIDE THE WINDOW ─────────────────────────────────────────
     * Every path into this class defers its network work until after the write that triggered it is
     * committed: productChanged() and sitemapChanged() both dispatch()->afterResponse(), and
     * productChangedNow() is only called from inside such a callback (ReviewObserver::runModeration,
     * after its own saveQuietly). So the one bust that does run is always later than the writes it
     * is standing in for, and coalescing them cannot publish a sitemap that is missing any of them.
     *
     * ── THE RESIDUAL, STATED ──────────────────────────────────────────────────────────────────
     * A write whose notification lands inside the window of a bust that ALREADY ran is not
     * republished by this call. It is picked up by the next bust, or at the latest when the
     * storefront's own 1h sitemap TTL expires — which is the same outer bound the sitemap has had
     * all along, so the worst case is unchanged and the common case is ~N times cheaper.
     *
     * ── WHY A WINDOW AND NOT A ONCE-PER-PROCESS LATCH ─────────────────────────────────────────
     * A queue worker is a long-lived process that handles thousands of jobs. A latch with no expiry
     * would let job #1 silence the sitemap for every job after it, for the life of the worker.
     */
    private static function bustSitemapCache(string $internal, string $secret): void
    {
        if ($internal === '') {
            return; // not configured — no-op
        }

        $now = microtime(true);
        if (self::$sitemapBustAt !== null && ($now - self::$sitemapBustAt) < self::SITEMAP_BUST_WINDOW_SECONDS) {
            return;
        }
        self::$sitemapBustAt = $now;

        try {
            $request = Http::connectTimeout(2)->timeout(4);
            if ($secret !== '') {
                $request = $request->withToken($secret);
            }
            $response = $request->post($internal . '/api/revalidate?tag=sitemap');

            // A 4xx/5xx does not throw, so without this a rejected bust would still close the window
            // and the next change would be told it had already been covered. The window is only
            // allowed to suppress calls that actually succeeded.
            if ($response->failed()) {
                self::$sitemapBustAt = null;
                Log::warning('SeoNotifier sitemap refresh rejected', ['status' => $response->status()]);
            }
        } catch (\Throwable $e) {
            self::$sitemapBustAt = null;
            Log::warning('SeoNotifier sitemap refresh failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Resolve the revalidation context (target URLs + secret) for a product, or
     * null when the product has no indexable path or the frontend is unconfigured.
     *
     * @return array{internal:string,path:string,publicUrl:string,secret:string}|null
     */
    protected function buildContext(Product $product): ?array
    {
        $path = $this->productPath($product);
        if ($path === null) {
            return null;
        }

        $internal = rtrim((string) config('services.frontend.internal_url'), '/');
        $public   = rtrim((string) config('services.frontend.public_url'), '/');
        $secret   = (string) config('services.frontend.revalidate_secret');
        if ($internal === '' || $secret === '') {
            return null; // not configured — no-op
        }

        return [
            'internal'  => $internal,
            'path'      => $path,
            'publicUrl' => $public . $path,
            'secret'    => $secret,
        ];
    }

    /**
     * Fire the three refresh calls. Best-effort — the storefront being slow or
     * unreachable must never surface as an error to the caller.
     *
     * @param  array{internal:string,path:string,publicUrl:string,secret:string}  $ctx
     */
    private static function send(array $ctx): void
    {
        try {
            // 1) Refresh the exact product page (price / stock / stars) immediately. Per product:
            //    it names one path and no other call can stand in for it.
            Http::withToken($ctx['secret'])->connectTimeout(2)->timeout(4)
                ->post($ctx['internal'] . '/api/revalidate?path=' . rawurlencode($ctx['path']));
            // 2) Bust the cached sitemap so <lastmod> reflects the change at once (Google's signal).
            //    Site-wide, therefore coalesced — one bust per process per minute covers every
            //    product in a wave. See bustSitemapCache(). It swallows its own failures, so a
            //    storefront that rejects it cannot stop the IndexNow ping below from going out.
            self::bustSitemapCache($ctx['internal'], $ctx['secret']);
            // 3) Tell Bing/Yandex/etc. to recrawl now (Google relies on the fresh sitemap instead).
            Http::withToken($ctx['secret'])->connectTimeout(2)->timeout(4)
                ->asJson()->post($ctx['internal'] . '/api/indexnow', ['urls' => [$ctx['publicUrl']]]);
        } catch (\Throwable $e) {
            Log::warning('SeoNotifier failed', ['url' => $ctx['publicUrl'], 'error' => $e->getMessage()]);
        }
    }

    /**
     * Canonical product path, derived the SAME way the storefront canonical + sitemap do:
     * the many-to-many sous_categories first, then the legacy single sous_categorie. Returns
     * "/{subSlug}/{slug}" (the indexable URL), or "/shop/{slug}" (which the storefront 301s) when
     * no subcategory is resolvable. Deriving it any other way would revalidate the wrong path.
     */
    protected function productPath(Product $product): ?string
    {
        $slug = trim((string) $product->slug);
        if ($slug === '') {
            return null;
        }

        $sub = optional($product->sousCategories()->first())->slug
            ?? optional($product->sousCategorie)->slug;

        return $sub
            ? '/' . rawurlencode($sub) . '/' . rawurlencode($slug)
            : '/shop/' . rawurlencode($slug);
    }
}
