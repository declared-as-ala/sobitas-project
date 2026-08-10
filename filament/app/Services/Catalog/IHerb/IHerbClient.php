<?php

namespace App\Services\Catalog\IHerb;

use App\Services\Enrichment\PoliteFetcher;
use Illuminate\Support\Facades\Log;

/**
 * The only place in the codebase that talks to iHerb.
 *
 * ── WHY IT WRAPS PoliteFetcher INSTEAD OF USING Http DIRECTLY ─────────────────────────────
 * PoliteFetcher already owns a per-host Redis token bucket shared across queue workers, a cached
 * robots.txt reader, and a circuit breaker that stops for 30 minutes after repeated 401/403/429.
 * A second HTTP stack would mean two independent ideas of how fast we are allowed to go — and with
 * several workers running a 47,537-product import, "several processes each politely pacing
 * themselves" is not polite at all. One bucket, one breaker.
 *
 * ── WHAT IS DELIBERATELY MISSING ──────────────────────────────────────────────────────────
 * There is no reviews method and no review-summary method. tn.iherb.com/robots.txt disallows both:
 *
 *     Disallow: /ugc/api/product/*&#47;review/summarization
 *     Disallow: /ugc/api/review/
 *
 * THIS CLASS is the guard, not PoliteFetcher. An earlier version of this comment claimed the
 * fetcher would refuse those paths anyway; that was wrong. Its robots matcher was a prefix
 * comparison and could not see a `*` in the middle of a rule, so it would have allowed exactly the
 * path iHerb forbids. (The matcher now handles wildcards — but the fix arrived because this was
 * checked, not because it was assumed, and defence in depth is the point.)
 *
 * So the invariant is structural: the only URLs this class can construct are the sitemap index, a
 * product sitemap, and /ugc/api/product/v2/{id}. `assertUrlAllowed()` enforces it on every request,
 * and no method exists that could build a review URL in the first place.
 *
 * ── DISCOVERY IS THE SITEMAP, NOT THE LIVE FEED ───────────────────────────────────────────
 * /catalog/iherblive was the obvious candidate and cannot enumerate the catalogue. Measured
 * 10/08/2026: index=801 returns 50 items, index=1001 returns zero. It caps around 850 and repeats
 * popular products — it is a live purchase feed, complete with a buyer country per row. Against
 * the 47,537 products the sitemaps actually list, it reaches about 1.8%.
 *
 * The sitemap iHerb publishes in its own robots.txt reaches all of it in three requests, and carries
 * lastmod so a weekly re-sync is nearly free.
 */
class IHerbClient
{
    public const PROVIDER = 'iherb';

    /** Published at the foot of tn.iherb.com/robots.txt. */
    private const SITEMAP_INDEX = 'https://www.iherb.com/sitemap_index.xml';

    /**
     * Paths this connector must never request, whatever anyone adds later.
     *
     * Checked on every fetch rather than trusted to code review. A future method that accidentally
     * builds a review URL fails loudly here instead of quietly becoming a request iHerb told us not
     * to make.
     */
    private const FORBIDDEN_PATH = '~/ugc/api/(?:review/|product/[^/]+/review)~i';

    public function __construct(private PoliteFetcher $fetcher) {}

    /** @throws \LogicException when a URL would touch a path robots.txt disallows */
    public static function assertUrlAllowed(string $url): void
    {
        if (preg_match(self::FORBIDDEN_PATH, $url) === 1) {
            throw new \LogicException(
                'Refusing to request a robots.txt-disallowed iHerb path: '.$url
                .' — reviews and review summaries are outside this connector by design.'
            );
        }
    }

    /**
     * Sitemaps are far larger than the fetcher's default page limit, and the default is right.
     *
     * Measured 10/08/2026: products-0-www-0 is 3.23 MB, -1 is 3.25 MB, -2 is 1.03 MB, against a
     * default `enrichment.fetch.max_bytes` of 4 MB. That is 23% of headroom on a file iHerb grows
     * whenever it adds products — and an oversize body returns null, which reads to the caller
     * exactly like an unreachable host. Discovery would then report a third of the catalogue as
     * "found" and exit successfully.
     *
     * 24 MB is not a guess at how big the file may get; it is simply far enough above 3.3 MB that
     * growth cannot quietly reach it, while still bounding memory for a container that also runs
     * queue workers.
     */
    private const SITEMAP_MAX_BYTES = 24 * 1024 * 1024;

    /** Every outbound request goes through here, so the invariant cannot be bypassed by accident. */
    private function fetch(string $url, array $headers = [], ?int $maxBytes = null): ?array
    {
        self::assertUrlAllowed($url);

        return $this->fetcher->get($url, $headers, $maxBytes);
    }

    /**
     * The product sitemap URLs. Three as of 10/08/2026 — and they are NOT all the same size:
     * 20,500 + 20,500 + 6,537 = 47,537 products. Assuming three full files overstates the
     * catalogue by ~14,000.
     *
     * @return list<array{url: string, lastmod: ?string}>
     */
    public function productSitemaps(): array
    {
        $response = $this->fetch(self::SITEMAP_INDEX, [], self::SITEMAP_MAX_BYTES);
        if ($response === null || ($response['status'] ?? 0) !== 200) {
            Log::warning('[iherb] sitemap index unreachable', ['status' => $response['status'] ?? null]);

            return [];
        }

        $out = [];
        foreach ($this->sitemapEntries((string) $response['body']) as $entry) {
            // Only the product sitemaps; the index also lists blog, info, specialty and press.
            if (str_contains($entry['url'], '/products-')) {
                $out[] = $entry;
            }
        }

        return $out;
    }

    /**
     * Every (external id, url, slug) in one product sitemap.
     *
     * The numeric product id is the last path segment of a /pr/{slug}/{id} URL, so discovery needs
     * no per-product request at all — 47,537 identities for three HTTP calls. The slug carries the
     * product name, which is what lets the relevance prefilter run before any hydration budget is
     * spent.
     *
     * @return list<array{external_product_id: string, url: string, slug: string, lastmod: ?string}>
     */
    public function productsIn(string $sitemapUrl): array
    {
        $response = $this->fetch($sitemapUrl, [], self::SITEMAP_MAX_BYTES);
        if ($response === null || ($response['status'] ?? 0) !== 200) {
            Log::warning('[iherb] product sitemap unreachable', ['url' => $sitemapUrl]);

            return [];
        }

        $out = [];
        foreach ($this->sitemapEntries((string) $response['body']) as $entry) {
            $parsed = self::parseProductUrl($entry['url']);
            if ($parsed === null) {
                continue;
            }

            $out[] = $parsed + ['lastmod' => $entry['lastmod']];
        }

        return $out;
    }

    /**
     * One product record.
     *
     * Verified live on ids 1, 68616 and 46873: fifteen stable keys, including rootCategoryId /
     * rootCategoryName — 101046 "Sports", 1855 "Supplements" — which is the authoritative relevance
     * filter. Not disallowed by robots.txt.
     *
     * @return array{status: int, payload: array<string, mixed>|null}
     */
    public function product(string $externalId): array
    {
        $url = 'https://tn.iherb.com/ugc/api/product/v2/'.rawurlencode($externalId);

        $response = $this->fetch($url, ['Accept' => 'application/json']);

        if ($response === null) {
            // Refused before the wire: robots, an open circuit breaker, or a transport failure.
            // Reported as 0 so the caller can retry later rather than marking the product dead.
            return ['status' => 0, 'payload' => null];
        }

        $status = (int) ($response['status'] ?? 0);
        if ($status !== 200) {
            return ['status' => $status, 'payload' => null];
        }

        $payload = json_decode((string) $response['body'], true);

        // A 200 carrying non-JSON is an interstitial or an error page, not a product. Treating it as
        // one would write a row of nulls over a product that was fine yesterday.
        return ['status' => is_array($payload) && isset($payload['id']) ? 200 : 422, 'payload' => is_array($payload) ? $payload : null];
    }

    /**
     * The product-image URL iHerb serves.
     *
     * Recorded as a reference, not mirrored by default — see the media notes in
     * docs/catalog-import/iherb.md. `l` is the large variant.
     */
    public static function imageUrl(?string $partNumber, ?int $imageIndex, string $size = 'l'): ?string
    {
        $part = strtolower(trim((string) $partNumber));
        if ($part === '' || $imageIndex === null || ! in_array($size, ['s', 'm', 'l', 'k', 'r'], true)) {
            return null;
        }

        // "OPN-02385" → brand folder "opn", asset folder "opn02385"
        if (preg_match('~^([a-z]{2,4})-?(\w+)$~', $part, $m) !== 1) {
            return null;
        }

        return sprintf(
            'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/%s/%s%s/%s/%d.jpg',
            $m[1], $m[1], $m[2], $size, $imageIndex
        );
    }

    /**
     * `https://www.iherb.com/pr/{slug}/{id}` → its parts.
     *
     * @return array{external_product_id: string, url: string, slug: string}|null
     */
    public static function parseProductUrl(string $url): ?array
    {
        if (preg_match('~/pr/([^/]+)/(\d+)/?$~', $url, $m) !== 1) {
            return null;
        }

        return [
            'external_product_id' => $m[2],
            'url' => $url,
            'slug' => $m[1],
        ];
    }

    /**
     * `<loc>` / `<lastmod>` pairs from a sitemap or sitemap index.
     *
     * Deliberately regex rather than a DOM parse: these documents are 20,500 entries and several
     * megabytes, the structure is trivial, and loading them into DOMDocument costs far more memory
     * than the job container needs to spend.
     *
     * @return list<array{url: string, lastmod: ?string}>
     */
    private function sitemapEntries(string $xml): array
    {
        if (! preg_match_all('~<(?:sitemap|url)>(.*?)</(?:sitemap|url)>~s', $xml, $blocks)) {
            return [];
        }

        $out = [];
        foreach ($blocks[1] as $block) {
            if (preg_match('~<loc>\s*([^<]+?)\s*</loc>~', $block, $loc) !== 1) {
                continue;
            }

            $lastmod = preg_match('~<lastmod>\s*([^<]+?)\s*</lastmod>~', $block, $lm) === 1 ? $lm[1] : null;

            $out[] = ['url' => html_entity_decode($loc[1], ENT_QUOTES | ENT_XML1, 'UTF-8'), 'lastmod' => $lastmod];
        }

        return $out;
    }
}
