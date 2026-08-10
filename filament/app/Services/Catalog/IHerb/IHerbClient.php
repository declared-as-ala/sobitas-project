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
     * How large a product PAGE may be. Measured, not guessed.
     *
     * Three real responses on 10/08/2026: 2,084,504 / 2,084,214 / 2,046,706 bytes. The default
     * `enrichment.fetch.max_bytes` is 4 MB, so the pages fit today with about half the budget spare
     * — but "fits today" is what the sitemap comment above is also about, and an oversize body
     * returns null, which is indistinguishable from an unreachable host. 6 MB is far enough above
     * 2.1 MB that ordinary growth cannot quietly reach it while still bounding the memory of a
     * container that also runs queue workers.
     */
    private const PAGE_MAX_BYTES = 6 * 1024 * 1024;

    /**
     * The product HTML page — the only place the real content lives.
     *
     * ── THE CANONICAL SHAPE, CONFIRMED RATHER THAN ASSUMED ────────────────────────────────
     * `/pr/{urlName}/{id}`, which is what parseProductUrl() has always parsed OUT of the sitemap and
     * what the v2 payload's own `url` key returns. Checked live for ids 1, 68616 and 46873:
     *
     *     https://www.iherb.com/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1
     *
     * This method PREFERS the stored `external_url`'s path when one is given and only falls back to
     * composing `/pr/{urlName}/{id}` — because the stored URL is what iHerb itself published in the
     * sitemap, and a composed one is our idea of what it should look like.
     *
     * ── ROBOTS.TXT SAYS YES TO THIS PATH, AND SAYS SO IN WRITING ──────────────────────────
     * Read in full before this method was written (tn.iherb.com/robots.txt and www.iherb.com/
     * robots.txt are byte-identical, 3,581 bytes, one `User-agent: *` group plus `ia_archiver`).
     * Every rule that mentions `/pr` is a rule about something else:
     *
     *     Disallow: /pr/*&#47;lib/*    JS bundles under a product — three path segments, not two
     *     Disallow: /pr/i/           a prefix that no real urlName produces
     *     Disallow: /pr/p/           likewise
     *
     * `/pr/{urlName}/{id}` appears in no Disallow line. Product pages are what iHerb publishes in
     * the sitemap it advertises in that same file, which would be incoherent otherwise.
     *
     * ── ONE RULE THAT DOES BITE, AND IT IS NOT AN EDGE CASE ───────────────────────────────
     *     Disallow: /*discontinued
     *     Disallow: /*Discontinued
     *
     * A great many iHerb urlNames end in `-discontinued-item` — five of the six ids that returned a
     * product at all, out of seven probed at random on 10/08/2026: 200, 3000, 12000, 60000 and 90000
     * were all "-discontinued-item"; 110000 was not; 25000 had no product. Those are FORBIDDEN, and
     * PoliteFetcher's rule matcher handles the leading wildcard correctly, so it refuses them before
     * the wire and this method returns status 0. The caller must treat that as a permanent skip
     * rather than a transient failure — see ExtractExternalProductContentJob, which does.
     *
     * @return array{status: int, body: string|null, url: string|null}
     *                                                                 status 0 means "refused before the wire": robots, an open breaker, or transport.
     */
    public function productPage(string $externalId, ?string $urlName, ?string $storedUrl = null): array
    {
        $url = self::pageUrl($externalId, $urlName, $storedUrl);

        if ($url === null) {
            return ['status' => 0, 'body' => null, 'url' => null];
        }

        $response = $this->fetch($url, ['Accept' => 'text/html,application/xhtml+xml'], self::PAGE_MAX_BYTES);

        if ($response === null) {
            return ['status' => 0, 'body' => null, 'url' => $url];
        }

        $status = (int) ($response['status'] ?? 0);
        if ($status !== 200) {
            return ['status' => $status, 'body' => null, 'url' => $url];
        }

        $body = (string) $response['body'];

        // A 200 that is not a product page is an interstitial, a country splash or an error page.
        // Storing extracted nulls from one would overwrite content that was fine yesterday, so it is
        // reported as 422 — the same code, with the same permanent meaning, that product() uses.
        if (! str_contains($body, 'product-overview') && ! str_contains($body, 'product-specs-list')) {
            return ['status' => 422, 'body' => null, 'url' => (string) ($response['url'] ?? $url)];
        }

        return ['status' => 200, 'body' => $body, 'url' => (string) ($response['url'] ?? $url)];
    }

    /**
     * Which host renders the page, and therefore WHICH LANGUAGE the transcribed text is in.
     *
     * ── THIS IS A PRODUCT DECISION, SO IT LIVES IN CONFIG ─────────────────────────────────
     * iHerb publishes the same product under 101 hreflang alternates and honours the country
     * subdomain rather than Accept-Language. Measured on product 1:
     *
     *     www.iherb.com   302 → tn.iherb.com from a Tunisian IP
     *     tn.iherb.com    lang="ar-TN", dir="rtl"  — Arabic
     *     fr.iherb.com    lang="fr"                — French, no redirect
     *     ca.iherb.com    lang="en-CA"             — English, no redirect
     *
     * The default is fr.iherb.com because protein.tn is a French shop. What that buys and what it
     * costs is written up in config/catalog.php under `content.host`, and the cost is real: iHerb's
     * French is machine translation, and iHerb says so on the page. IHerbPageExtractor records
     * which it was on every row rather than leaving it to a comment.
     */
    public static function contentHost(): string
    {
        $host = trim((string) config('catalog.content.host', 'fr.iherb.com'));

        return $host === '' ? 'fr.iherb.com' : $host;
    }

    /**
     * `/pr/{urlName}/{id}` on the configured content host.
     *
     * The PATH comes from the stored sitemap URL when there is one — iHerb's own answer to what this
     * product's address is — and only the host is swapped for the locale we read in. Composing the
     * path from `urlName` is the fallback for a row discovered before that column existed.
     */
    public static function pageUrl(string $externalId, ?string $urlName, ?string $storedUrl = null): ?string
    {
        $host = self::contentHost();

        $stored = trim((string) $storedUrl);
        if ($stored !== '') {
            $path = parse_url($stored, PHP_URL_PATH);
            if (is_string($path) && preg_match('~^/pr/[^/]+/\d+/?$~', $path) === 1) {
                return 'https://'.$host.$path;
            }
        }

        $slug = trim((string) $urlName);
        $id = trim($externalId);

        if ($slug === '' || $id === '' || preg_match('~^\d+$~', $id) !== 1) {
            return null;
        }

        return 'https://'.$host.'/pr/'.rawurlencode($slug).'/'.$id;
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
