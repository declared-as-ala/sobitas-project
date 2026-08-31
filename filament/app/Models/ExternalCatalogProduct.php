<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One externally-discovered product, staged. Never a customer-facing row.
 *
 * ── THE STATE MACHINE IS THE RESUME MECHANISM ─────────────────────────────────────────────
 *
 *     discovered ──┬── filtered_out        (slug prefilter said no, or the source category did)
 *                  └── queued ── hydrating ──┬── hydrated ── promoted
 *                                            └── failed
 *
 * Work is selected by querying for a state, never by holding a cursor. A worker killed mid-batch
 * loses nothing: the rows it had not finished are still `queued`, and the next worker picks them up
 * by asking the same question. That is why an interrupted 47,000-product import resumes instead of
 * restarting, and why there is no position to corrupt.
 *
 * `hydrating` exists so a crashed worker is visible rather than silent — a row stuck in it for an
 * hour is a fact you can query, where a row still marked `queued` would look like ordinary backlog.
 */
class ExternalCatalogProduct extends Model
{
    public const STATUS_DISCOVERED = 'discovered';
    public const STATUS_QUEUED = 'queued';
    public const STATUS_HYDRATING = 'hydrating';
    public const STATUS_HYDRATED = 'hydrated';
    public const STATUS_FILTERED_OUT = 'filtered_out';
    public const STATUS_FAILED = 'failed';
    public const STATUS_PROMOTED = 'promoted';

    /**
     * ── THE SECOND STATE MACHINE: reading the product PAGE ────────────────────────────────
     *
     *     (null) ── queued ── fetching ──┬── extracted
     *                                    ├── empty     the page loaded and carried no prose
     *                                    ├── blocked   robots.txt forbids this URL. PERMANENT.
     *                                    └── failed
     *
     * Deliberately a SECOND column rather than more values on `status`. `status` is the hydration
     * lifecycle and it ends at `promoted` — but a promoted product still needs its page read, so
     * folding the two would mean re-opening a finished state machine, and a single column could
     * never answer "hydrated but not yet read" at all.
     *
     * The resume mechanism is identical and for the identical reason: work is selected by querying
     * for a state, so a worker killed mid-pass loses nothing and there is no cursor to corrupt.
     *
     * `blocked` is separated from `failed` because it is not a failure and must never be retried.
     * iHerb's robots.txt disallows `/*discontinued`, and a large share of its urlNames end in
     * "-discontinued-item" — five of the six ids that returned a product at all, out of seven probed
     * at random on 10/08/2026. Filing thousands of permanently forbidden URLs under `failed`
     * guarantees somebody eventually runs a retry over them and spends the crawl budget re-learning
     * the same answer.
     */
    public const CONTENT_QUEUED = 'queued';
    public const CONTENT_FETCHING = 'fetching';
    public const CONTENT_EXTRACTED = 'extracted';
    public const CONTENT_EMPTY = 'empty';
    public const CONTENT_BLOCKED = 'blocked';
    public const CONTENT_FAILED = 'failed';

    protected $table = 'external_catalog_products';

    protected $guarded = ['id'];

    protected $casts = [
        'source_payload' => 'array',
        /**
         * Payload keys IHerbNormalizer did not consume. `[]` is a measurement ("the source sent
         * nothing we ignored"); NULL means the row has not been normalised since the column existed.
         * The two must stay distinguishable, so this is cast to array and never to a collection with
         * a default.
         */
        'source_unmapped_keys' => 'array',
        'source_list_price' => 'decimal:2',
        'source_discount_price' => 'decimal:2',
        'source_rating' => 'decimal:2',
        'source_available' => 'boolean',
        'source_discontinued' => 'boolean',
        'category_mapping_required' => 'boolean',
        'pack_size' => 'decimal:3',
        'computed_price' => 'decimal:3',
        /**
         * Words in the body promotion wrote into `products.description_fr`, measured the way
         * frontend/scripts/audit-pdp-content.mjs measures `bodyWords`. NULL means "never measured"
         * (promoted before migration 2026_08_10_000007), which is not the same as 0 and must not be
         * cast into one — CatalogIHerbPromote::bodyWords() falls back to measuring the product's own
         * stored body when it is null. The cast is here so a driver returning "96" cannot make a
         * `>= 250` comparison a string comparison.
         */
        'composed_word_count' => 'integer',
        'first_seen_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'promoted_at' => 'datetime',
        /**
         * The image gallery read from the page's og:image run, in document order.
         *
         * `[]` is a measurement ("the page listed no product image"); NULL means the page has not
         * been read since this column existed. Cast to array, never to a collection with a default,
         * so the two stay distinguishable — the same rule `source_unmapped_keys` follows.
         */
        'source_gallery_images' => 'array',
        'source_content_unmapped_sections' => 'array',
        /** true / false are measurements; NULL means "the locale's notice is not one we verified". */
        'source_content_translated' => 'boolean',
        'source_content_word_count' => 'integer',
        'source_content_fetched_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    /**
     * Rows a hydration worker may claim, most-likely-relevant first.
     *
     * `queued` is what the slug prefilter promoted because the name positively matched a sports or
     * supplement term. `discovered` is everything it could not decide — kept, because the slug is a
     * hint and `rootCategoryId` is the authority, but hydrated only after the confident ones so the
     * first hours of a run produce products we can actually sell.
     */
    public function scopeAwaitingHydration(Builder $query, bool $includeNeutral = false): Builder
    {
        $states = $includeNeutral
            ? [self::STATUS_QUEUED, self::STATUS_DISCOVERED]
            : [self::STATUS_QUEUED];

        return $query->whereIn('status', $states)
            ->orderByRaw("FIELD(status, 'queued', 'discovered')")
            ->orderBy('id');
    }

    /**
     * Rows whose product PAGE has not been read yet, most useful first.
     *
     * ── WHY IT STARTS AT `hydrated` AND NOT AT `discovered` ───────────────────────────────
     * A row that has not been hydrated has no `external_url` and no `external_url_name`, so there is
     * no page to ask for. A row that was filtered out on its root category is not going to be sold
     * here and its page is a request spent on nothing. `hydrated` and `promoted` are exactly the
     * rows whose content will end up in front of a customer.
     *
     * ── AND WHY `promoted` GOES FIRST ─────────────────────────────────────────────────────
     * Those 100 rows are LIVE PAGES, published today with a title, a price and no body. They are the
     * only rows where an extra 200 words changes something a visitor can see this week; the other
     * 712 are still at publier=0. Ordering by state rather than by id is what stops a run spending
     * its first eight hours on rows nobody can reach.
     *
     * `whereNull` on the content status is the resume: a killed run leaves its unfinished rows
     * exactly as it found them, and the next run selects them by asking the same question.
     */
    public function scopeAwaitingContent(Builder $query, bool $includeFiltered = false): Builder
    {
        $states = $includeFiltered
            ? [self::STATUS_HYDRATED, self::STATUS_PROMOTED, self::STATUS_FILTERED_OUT]
            : [self::STATUS_HYDRATED, self::STATUS_PROMOTED];

        return $query->whereIn('status', $states)
            ->where(function (Builder $q): void {
                $q->whereNull('source_content_status')
                    ->orWhere('source_content_status', self::CONTENT_QUEUED);
            })
            ->orderByRaw("FIELD(status, 'promoted', 'hydrated', 'filtered_out')")
            ->orderBy('id');
    }
}
