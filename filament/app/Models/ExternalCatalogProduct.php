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

    protected $table = 'external_catalog_products';

    protected $guarded = ['id'];

    protected $casts = [
        'source_payload' => 'array',
        'source_list_price' => 'decimal:2',
        'source_discount_price' => 'decimal:2',
        'source_rating' => 'decimal:2',
        'source_available' => 'boolean',
        'source_discontinued' => 'boolean',
        'category_mapping_required' => 'boolean',
        'pack_size' => 'decimal:3',
        'computed_price' => 'decimal:3',
        'first_seen_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'promoted_at' => 'datetime',
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
}
