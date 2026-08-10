<?php

namespace App\Jobs;

use App\Models\ExternalCatalogProduct;
use App\Models\ExternalCategoryMapping;
use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\IHerb\IHerbNormalizer;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

/**
 * Fetch and normalise ONE staged product. One product, one job, one row.
 *
 * ── WHY PER-PRODUCT AND NOT A BATCH LOOP ──────────────────────────────────────────────────
 * A single long-running loop over 42,882 products has one failure mode that matters: any product
 * that throws takes the whole run with it, and everything after it is simply never fetched. With a
 * job per row, a poisoned product fails its own row, is marked with the reason, and the other
 * 42,881 are untouched. Restarting is not a concept — the rows that never ran are still `queued`.
 *
 * ── ERROR CLASSIFICATION IS THE POINT ─────────────────────────────────────────────────────
 * "Failed" is not one thing, and treating it as one thing is how a run either retries a dead
 * product forever or gives up on a temporary blip:
 *
 *   0        refused before the wire — robots, open circuit breaker, transport. TRANSIENT:
 *            the product is fine, we are the ones who cannot ask right now.
 *   404/410  the product is gone from iHerb. PERMANENT — retrying is pure waste.
 *   429      we are being throttled. TRANSIENT, and the row goes back with a longer wait.
 *   5xx      their side. TRANSIENT.
 *   422      a 200 carrying something that is not a product (an interstitial, an error page).
 *            PERMANENT for this attempt: writing it would overwrite good data with nulls.
 *
 * Transient failures return the row to `queued` and burn an attempt. Once attempts run out the row
 * lands in `failed` WITH the status code, so "3,000 products failed" can always be resolved into
 * "2,980 were 404 and 20 hit the breaker" instead of being a number nobody can act on.
 */
class HydrateExternalProductJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /**
     * `tries = 1` and manual re-queueing, rather than Laravel's retry.
     *
     * Laravel's `tries` counts attempts of the JOB. What has to be bounded here is attempts against
     * the PRODUCT, and those two diverge the moment a worker is restarted mid-run — the job is
     * gone, its attempt count with it, and the row would be retried forever. `attempts` lives on the
     * row, which is the thing that actually persists.
     */
    public function __construct(public int $stagingId) {}

    public function uniqueId(): string
    {
        return 'hydrate-external-'.$this->stagingId;
    }

    /**
     * A crashed job must not strand its row in `hydrating` for ever.
     *
     * ── THE BUG THIS CLOSES, OBSERVED ON PRODUCTION 10/08/2026 ────────────────────────────
     * 500 jobs were dispatched. Two minutes later `hydrating` was 10 and rising, `hydrated` was 0,
     * and `failed` was 0. With ONE queue worker processing serially, at most one row can genuinely
     * be in flight at a time — so a dozen simultaneous `hydrating` rows meant a dozen jobs had
     * claimed a row and then died before writing anything back.
     *
     * claim() deliberately moves the row OUT of `queued` so no second worker can take it. That is
     * correct, and it is exactly why a crash between the claim and the store is unrecoverable
     * without this hook: the row is no longer selected by awaitingHydration(), so no future run
     * ever picks it up, and nothing reports it except a "stuck for over an hour" warning that only
     * appears if somebody happens to run --status.
     *
     * `tries = 1` means Laravel calls this on the first and only failure. The row goes back to
     * `queued` while attempts remain, so the next window retries it; once attempts are exhausted it
     * lands in `failed` WITH the exception message, which is a fact somebody can act on rather
     * than a row that quietly stopped existing.
     */
    public function failed(?\Throwable $e): void
    {
        $row = ExternalCatalogProduct::find($this->stagingId);

        if ($row === null || $row->status !== ExternalCatalogProduct::STATUS_HYDRATING) {
            return;
        }

        $attempts = (int) $row->attempts + 1;
        $exhausted = $attempts >= (int) config('catalog.hydration.max_attempts', 3);

        $row->forceFill([
            'attempts' => $attempts,
            'status' => $exhausted
                ? ExternalCatalogProduct::STATUS_FAILED
                : ExternalCatalogProduct::STATUS_QUEUED,
            'status_reason' => 'crashed: '.mb_substr($e?->getMessage() ?? 'unknown error', 0, 200),
            'last_synced_at' => now(),
        ])->save();
    }

    public function handle(IHerbClient $client, IHerbNormalizer $normalizer): void
    {
        $row = $this->claim();

        // Somebody else got there first, or the row moved on. Not an error.
        if ($row === null) {
            return;
        }

        $maxAttempts = (int) config('catalog.hydration.max_attempts', 3);
        $result = $client->product((string) $row->external_product_id);
        $status = (int) $result['status'];

        if ($status !== 200 || ! is_array($result['payload'])) {
            $this->recordFailure($row, $status, $maxAttempts);

            return;
        }

        $this->store($row, $normalizer->normalize($result['payload']), $result['payload']);
    }

    /**
     * Move the row to `hydrating` only if it is still waiting — atomically.
     *
     * The WHERE clause on status is what makes this safe with several workers: two of them can read
     * the same row, but only one UPDATE matches, so only one gets a non-zero affected-row count and
     * proceeds. Without it, both would fetch the same product and spend two requests from a budget
     * paced at one every two seconds.
     */
    private function claim(): ?ExternalCatalogProduct
    {
        $claimed = ExternalCatalogProduct::whereKey($this->stagingId)
            ->whereIn('status', [
                ExternalCatalogProduct::STATUS_QUEUED,
                ExternalCatalogProduct::STATUS_DISCOVERED,
            ])
            ->update([
                'status' => ExternalCatalogProduct::STATUS_HYDRATING,
                'updated_at' => now(),
            ]);

        return $claimed === 1 ? ExternalCatalogProduct::find($this->stagingId) : null;
    }

    private function recordFailure(ExternalCatalogProduct $row, int $status, int $maxAttempts): void
    {
        $permanent = in_array($status, [404, 410, 422], true);
        $attempts = (int) $row->attempts + 1;

        $exhausted = $attempts >= $maxAttempts;

        $row->forceFill([
            'attempts' => $attempts,
            'status' => ($permanent || $exhausted)
                ? ExternalCatalogProduct::STATUS_FAILED
                : ExternalCatalogProduct::STATUS_QUEUED,
            'status_reason' => sprintf(
                'http:%d %s (attempt %d/%d)',
                $status,
                $permanent ? 'permanent' : 'transient',
                $attempts,
                $maxAttempts,
            ),
            'last_synced_at' => now(),
        ])->save();
    }

    /**
     * Write the normalised product, then let stage 2 decide whether it belongs here at all.
     *
     * Order matters: the source data is stored BEFORE the relevance decision, so a product filtered
     * out for its category still carries everything we fetched. Re-deciding later — after adding a
     * category to the allow list, say — then costs no HTTP request at all.
     */
    private function store(ExternalCatalogProduct $row, array $normalized, array $payload): void
    {
        $categoryId = $normalized['source_root_category_id'] ?? null;

        // Record the source category whether or not we keep the product. An admin mapping iHerb
        // categories to protein.tn subcategories needs the full list, including the ones we reject,
        // or the worklist silently omits whatever the allow list happens to exclude today.
        if ($categoryId !== null && $categoryId !== '') {
            ExternalCategoryMapping::remember($categoryId, $normalized['source_root_category_name'] ?? null);
        }

        $relevant = in_array(
            (string) $categoryId,
            array_map('strval', (array) config('catalog.relevance.root_category_ids', [])),
            true,
        );

        // `external_product_id` is the identity and must never be rewritten from a payload — a
        // mismatch there would move the row onto a different product.
        unset($normalized['external_product_id']);

        /*
         * `source_discontinued` used to be derived here, from $payload['isDiscontinued'].
         *
         * It moved into IHerbNormalizer::normalize() — not for tidiness, but because
         * `catalog:iherb:hydrate --renormalize` re-derives columns by calling THAT method and
         * nothing else. A payload-derived column computed in this file is one the recovery path
         * cannot fix without re-fetching 955 products from a host paced at 0.5 req/s.
         *
         * The stored value does not change: PHP's `+` keeps the LEFT operand's key, so the
         * normaliser's answer already won over the literal that used to sit here, and both read the
         * same key of the same payload.
         */
        $attributes = $normalized + [
            'source_payload' => $payload,
            'computed_price' => self::tunisianPrice($normalized),
            'completeness' => self::completeness($normalized),
            'last_synced_at' => now(),
            'status' => $relevant
                ? ExternalCatalogProduct::STATUS_HYDRATED
                : ExternalCatalogProduct::STATUS_FILTERED_OUT,
            'status_reason' => $relevant
                ? null
                : 'root_category:'.($normalized['source_root_category_name'] ?? $categoryId ?? 'unknown'),
        ];

        DB::transaction(fn () => $row->forceFill($attributes)->save());
    }

    /**
     * iHerb's price → a Tunisian one. Reference in, ours out.
     *
     * The LIST price is the base, never the discount price: a discount is a promotion on their
     * shop, on their timetable, and pricing our catalogue off it would make our prices move
     * whenever they run a sale. `round_to` rounds UP, because rounding a computed cost down eats
     * the margin the formula was configured to produce.
     *
     * PUBLIC STATIC so `catalog:iherb:hydrate --renormalize` recomputes it with THIS function rather
     * than a copy. That command re-derives every normalised field from the stored `source_payload`
     * after a normaliser fix, and a second implementation of the price there would be a second thing
     * to keep in step — the defect that has already cost this project a 2.5x rate error, a 3.4x
     * throughput error and a 1000x pack size, all in one day.
     */
    public static function tunisianPrice(array $normalized): ?float
    {
        $base = $normalized['source_list_price'] ?? $normalized['source_discount_price'] ?? null;
        if ($base === null || (float) $base <= 0) {
            return null;
        }

        $config = (array) config('catalog.pricing', []);

        $price = (float) $base
            * (float) ($config['usd_to_tnd'] ?? 3.15)
            * (1 + (float) ($config['margin'] ?? 0))
            * (1 + (float) ($config['customs'] ?? 0));

        $step = (float) ($config['round_to'] ?? 0);

        return $step > 0 ? ceil($price / $step) * $step : round($price, 3);
    }

    /**
     * How much of what a product page needs do we actually have? 0-100.
     *
     * This is the number the promotion gate leans on in place of a human reading 42,882 rows, so it
     * only counts things that genuinely make a page publishable. Nothing here rewards data we have
     * not got: a product missing a price and a title scores low and stays in staging, which is the
     * correct outcome rather than a problem to be tuned away.
     *
     * Public static for the same reason as tunisianPrice() above: --renormalize must rescore rows
     * with this exact function, because a normaliser fix can change whether `pack_size` parses at all
     * and the score has to move with it.
     */
    public static function completeness(array $normalized): int
    {
        $score = 0;

        $score += ! empty($normalized['normalized_title']) ? 30 : 0;
        $score += ! empty($normalized['source_brand_name']) ? 20 : 0;
        $score += ($normalized['source_list_price'] ?? 0) > 0 ? 25 : 0;
        $score += ! empty($normalized['pack_size']) ? 10 : 0;
        $score += $normalized['source_primary_image_index'] !== null ? 10 : 0;
        $score += ! empty($normalized['external_part_number']) ? 5 : 0;

        return min(100, $score);
    }
}
