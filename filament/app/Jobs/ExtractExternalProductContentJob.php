<?php

namespace App\Jobs;

use App\Models\ExternalCatalogProduct;
use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\IHerb\IHerbPageExtractor;
use App\Services\Enrichment\PoliteFetcher;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

/**
 * Read ONE product's HTML page, store what it carries, throw the document away.
 *
 * ── THE SAME SHAPE AS HydrateExternalProductJob, ON PURPOSE ───────────────────────────────
 * One product, one job, one row; the state lives on the row, not in the queue; `tries = 1` with
 * manual re-queueing because what has to be bounded is attempts against the PRODUCT, and a worker
 * restart takes a job's attempt count with it. Every one of those decisions is argued in that
 * class's docblock and none of them changes here, so they are not re-argued.
 *
 * What IS different is worth saying:
 *
 * ── THE DOCUMENT IS NOT KEPT, AND THAT IS NOT A DETAIL ────────────────────────────────────
 * Hydration writes the whole JSON response to `source_payload`, which is what makes
 * `catalog:iherb:hydrate --renormalize` free. A product page is ~2 MB; 47,537 of them is ~95 GB
 * against ~43 GB free. So this job extracts, writes the fields, and lets the body go out of scope.
 *
 * The honest consequence: after an extractor fix there is NO free re-derivation of the prose. Only
 * what can be recomputed from the stored columns can be recomputed (`--rederive`); anything else
 * needs the page again (`--refetch`), and that command prints the cost in hours before it queues a
 * single row. Implying otherwise would be the more comfortable lie.
 *
 * ── `blocked` IS A STATE, NOT A FAILURE ───────────────────────────────────────────────────
 * iHerb's robots.txt disallows `/*discontinued`, and a large share of its urlNames end in
 * "-discontinued-item" — five of the six ids that returned a product at all, out of seven probed at
 * random on 10/08/2026 (200, 3000, 12000, 25000, 60000, 90000, 110000). PoliteFetcher refuses those
 * before the wire, which arrives here as status 0, exactly like an open circuit breaker.
 *
 * Those two must not be conflated: one is permanent and correct, the other is temporary and ours.
 * So on a refusal this job asks PoliteFetcher::disallows() — the same rule set that took the
 * decision, never a second copy of the rule list — and a forbidden URL goes to `blocked`, never to
 * `failed`, where somebody would eventually retry thousands of rows to re-learn the same answer.
 *
 * ── AND IT CHECKS THAT THE PAGE IS THE PRODUCT ────────────────────────────────────────────
 * The specs list prints the part number. We already know it from hydration. If they disagree, the
 * URL resolved to something else — a redirect to a replacement product, most likely — and writing
 * that page's ingredients onto this row would be a factual error about what is in the tub. The row
 * is failed with both values in the reason instead.
 */
class ExtractExternalProductContentJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $stagingId) {}

    public function uniqueId(): string
    {
        return 'content-external-'.$this->stagingId;
    }

    /** A crashed job must not strand its row in `fetching` for ever. Same hook, same reason. */
    public function failed(?\Throwable $e): void
    {
        $row = ExternalCatalogProduct::find($this->stagingId);

        if ($row === null || $row->source_content_status !== ExternalCatalogProduct::CONTENT_FETCHING) {
            return;
        }

        $attempts = (int) $row->source_content_attempts + 1;
        $exhausted = $attempts >= self::maxAttempts();

        $row->forceFill([
            'source_content_attempts' => $attempts,
            'source_content_status' => $exhausted
                ? ExternalCatalogProduct::CONTENT_FAILED
                : ExternalCatalogProduct::CONTENT_QUEUED,
            'source_content_reason' => 'crashed: '.mb_substr($e?->getMessage() ?? 'unknown error', 0, 200),
        ])->save();
    }

    public function handle(IHerbClient $client, IHerbPageExtractor $extractor, PoliteFetcher $fetcher): void
    {
        $row = $this->claim();

        if ($row === null) {
            return;     // somebody else got there first, or the row moved on. Not an error.
        }

        $url = IHerbClient::pageUrl(
            (string) $row->external_product_id,
            $row->external_url_name,
            $row->external_url,
        );

        if ($url === null) {
            $this->finish($row, ExternalCatalogProduct::CONTENT_FAILED, 'no product URL on the row (never hydrated?)');

            return;
        }

        $result = $client->productPage(
            (string) $row->external_product_id,
            $row->external_url_name,
            $row->external_url,
        );

        $status = (int) $result['status'];

        if ($status !== 200 || ! is_string($result['body'])) {
            $this->recordFailure($row, $status, $url, $fetcher);

            return;
        }

        $body = (string) $result['body'];
        $extracted = $extractor->extract($body);

        // The page must be THIS product. See the class docblock — a silent redirect to a
        // replacement item would otherwise write another product's ingredients onto this row.
        $expected = strtoupper(trim((string) $row->external_part_number));
        $found = (string) ($extracted['spec_part_number'] ?? '');

        if ($expected !== '' && $found !== '' && $expected !== $found) {
            $this->finish(
                $row,
                ExternalCatalogProduct::CONTENT_FAILED,
                sprintf('part number mismatch: row %s, page %s — the URL resolved to another product', $expected, $found),
            );

            return;
        }

        $this->store($row, $extracted, $body, (string) ($result['url'] ?? $url));
    }

    /** Move the row to `fetching` only if it is still waiting — atomically, as claim() does. */
    private function claim(): ?ExternalCatalogProduct
    {
        $claimed = ExternalCatalogProduct::whereKey($this->stagingId)
            ->where(function ($q): void {
                $q->whereNull('source_content_status')
                    ->orWhere('source_content_status', ExternalCatalogProduct::CONTENT_QUEUED);
            })
            ->update([
                'source_content_status' => ExternalCatalogProduct::CONTENT_FETCHING,
                'updated_at' => now(),
            ]);

        return $claimed === 1 ? ExternalCatalogProduct::find($this->stagingId) : null;
    }

    /**
     * Write the transcription. Nothing here is generated, summarised or translated.
     *
     * The extractor's field names are deliberately NOT the column names — `overview_html` versus
     * `source_overview_html` — so this map is the one place the two vocabularies meet, and it is
     * asserted by page-extractor-check.php against both IHerbPageExtractor::FIELDS and the migration.
     */
    private function store(ExternalCatalogProduct $row, array $extracted, string $body, string $finalUrl): void
    {
        $empty = IHerbPageExtractor::isEmpty($extracted);

        $attributes = [
            'source_overview_html' => $extracted['overview_html'],
            'source_suggested_use_html' => $extracted['suggested_use_html'],
            'source_other_ingredients_html' => $extracted['other_ingredients_html'],
            'source_warnings_html' => $extracted['warnings_html'],
            'source_supplement_facts_html' => $extracted['supplement_facts_html'],
            'source_manufacturer_url' => $extracted['manufacturer_url'],
            'source_gallery_images' => $extracted['gallery_image_urls'],
            'source_spec_first_available' => $extracted['spec_first_available'],
            'source_spec_shipping_weight' => $extracted['spec_shipping_weight'],
            'source_spec_package_quantity' => $extracted['spec_package_quantity'],
            'source_spec_dimensions' => $extracted['spec_dimensions'],
            'source_spec_actual_weight' => $extracted['spec_actual_weight'],
            'source_gtin' => $extracted['gtin'],
            'source_content_locale' => $extracted['content_locale'],
            'source_content_translated' => $extracted['content_machine_translated'],
            'source_content_word_count' => $extracted['content_word_count'],
            'source_content_unmapped_sections' => $extracted['unmapped_sections'],
            'source_content_url' => $extracted['content_canonical_url'] ?: $finalUrl,
            'source_content_hash' => hash('sha256', $body),
            'source_content_bytes' => strlen($body),
            'source_content_fetched_at' => now(),
            'source_content_status' => $empty
                ? ExternalCatalogProduct::CONTENT_EMPTY
                : ExternalCatalogProduct::CONTENT_EXTRACTED,
            'source_content_reason' => $empty
                ? 'fetched 200 but no transcribable section was found'
                : null,
            /**
             * The ONE bounded thing kept raw, and only when there is nothing else to keep.
             *
             * A page that yielded nothing is either a markup change on iHerb's side or a document
             * that is not a product page at all, and after the body is discarded those two are
             * indistinguishable for ever. 4,000 characters tells them apart. On a successful row it
             * is explicitly nulled, so a row that starts failing and later succeeds does not keep a
             * stale excerpt that contradicts its own content.
             */
            'source_content_excerpt' => $empty ? IHerbPageExtractor::debugExcerpt($body) : null,
        ];

        /*
         * A PAGE THAT YIELDED NOTHING DOES NOT ERASE A PAGE THAT YIELDED SOMETHING.
         *
         * IHerbClient's not-a-product-page guard only requires the substring `product-overview` OR
         * `product-specs-list` anywhere in the body, while the extractor needs the literal
         * `<div class="container product-overview"`. Those are not the same test, so a real iHerb
         * markup change — reordered classes, a stray `</div>` inside a script string — passes the 422
         * guard and extracts all-nulls. Writing that whole null set unconditionally is what turned a
         * documented `--refetch` into an operation that silently strips the sections, the Supplement
         * Facts panel and the gallery off LIVE product pages (ProductDetailResource reads these
         * columns on every request), with the source HTML discarded by design so nothing can restore
         * them without another full crawl of a corrected extractor.
         *
         * So when this read produced nothing AND the row already holds a transcription, the content
         * columns are left exactly as they are and only the bookkeeping moves: the row goes to
         * `empty`, keeps a debug excerpt of what we just fetched, and says in `source_content_reason`
         * that the previous transcription was kept. That is a visible state a human can act on;
         * silently emptying 19,000 live pages is not.
         */
        if ($empty && self::hasStoredContent($row)) {
            $attributes = array_diff_key($attributes, array_flip(self::CONTENT_COLUMNS));
            $attributes['source_content_reason'] =
                'fetched 200 but nothing could be transcribed — the PREVIOUS transcription was kept. '
                .'Check the excerpt: iHerb markup change, or an interstitial.';
        }

        DB::transaction(fn () => $row->forceFill($attributes)->save());
    }

    /**
     * The columns that hold what a customer reads. Never overwritten by an extraction that failed.
     *
     * `source_content_locale`, the hash, the byte count and the timestamps are NOT here on purpose:
     * they describe THIS fetch and must keep describing it.
     */
    private const CONTENT_COLUMNS = [
        'source_overview_html',
        'source_suggested_use_html',
        'source_other_ingredients_html',
        'source_warnings_html',
        'source_supplement_facts_html',
        'source_manufacturer_url',
        'source_gallery_images',
        'source_spec_first_available',
        'source_spec_shipping_weight',
        'source_spec_package_quantity',
        'source_spec_dimensions',
        'source_spec_actual_weight',
        'source_gtin',
        'source_content_word_count',
    ];

    /** Does this row already carry prose a page is rendering right now? */
    private static function hasStoredContent(ExternalCatalogProduct $row): bool
    {
        foreach ([
            'source_overview_html',
            'source_suggested_use_html',
            'source_other_ingredients_html',
            'source_warnings_html',
            'source_supplement_facts_html',
        ] as $column) {
            if (trim((string) $row->{$column}) !== '') {
                return true;
            }
        }

        return false;
    }

    /**
     * Classify the refusal. The distinction between "forbidden" and "not right now" is the point.
     *
     *   robots  the URL is disallowed. PERMANENT — `blocked`, never retried, rule recorded.
     *   0       refused before the wire for some other reason: open breaker, transport. TRANSIENT.
     *   404/410 the page is gone from iHerb. PERMANENT.
     *   422     a 200 that is not a product page (interstitial, country splash). PERMANENT for now.
     *   429/5xx their side, or us being throttled. TRANSIENT.
     */
    private function recordFailure(ExternalCatalogProduct $row, int $status, string $url, PoliteFetcher $fetcher): void
    {
        if ($status === 0 && $fetcher->disallows($url)) {
            $this->finish(
                $row,
                ExternalCatalogProduct::CONTENT_BLOCKED,
                'robots.txt disallows this URL (iHerb forbids /*discontinued)',
            );

            return;
        }

        $permanent = in_array($status, [404, 410, 422], true);
        $attempts = (int) $row->source_content_attempts + 1;
        $exhausted = $attempts >= self::maxAttempts();

        $row->forceFill([
            'source_content_attempts' => $attempts,
            'source_content_status' => ($permanent || $exhausted)
                ? ExternalCatalogProduct::CONTENT_FAILED
                : ExternalCatalogProduct::CONTENT_QUEUED,
            'source_content_reason' => sprintf(
                'http:%d %s (attempt %d/%d)',
                $status,
                $permanent ? 'permanent' : 'transient',
                $attempts,
                self::maxAttempts(),
            ),
        ])->save();
    }

    private function finish(ExternalCatalogProduct $row, string $status, string $reason): void
    {
        $row->forceFill([
            'source_content_status' => $status,
            'source_content_reason' => mb_substr($reason, 0, 250),
            'source_content_attempts' => (int) $row->source_content_attempts + 1,
        ])->save();
    }

    private static function maxAttempts(): int
    {
        return max(1, (int) config('catalog.content.max_attempts', 3));
    }
}
