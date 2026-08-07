<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One externally-sourced fact about one product, with everything needed to defend or retract it.
 *
 * @see database/migrations/2026_08_07_000001_create_product_source_observations_table.php
 */
class ProductSourceObservation extends Model
{
    /**
     * Confidence bands, from the source report's precedence table. These are about IDENTITY —
     * how sure we are the record describes the product we sell — not about how much we like
     * the source.
     */
    public const CONFIDENCE_GTIN_MATCH = 0.95;

    public const CONFIDENCE_BRAND_NAME_MATCH = 0.60;

    /**
     * Below this, a fact may be stored and shown to a reviewer but never published. A brand+name
     * match sits under it deliberately: "Gold Standard Whey" exists in US and EU formulations whose
     * panels differ, so a name match is a candidate, not an identification.
     */
    public const PUBLISHABLE_CONFIDENCE = 0.90;

    protected $table = 'product_source_observations';

    protected $fillable = [
        'product_id', 'field_path', 'normalized_value', 'raw_value',
        'source_id', 'source_record_id', 'source_url', 'source_type',
        'retrieved_at', 'source_published_at', 'content_hash',
        'license_id', 'attribution', 'confidence', 'match_method',
        'extraction_method', 'extractor_version',
        'status', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected $casts = [
        'normalized_value' => 'array',
        'raw_value' => 'array',
        'retrieved_at' => 'datetime',
        'source_published_at' => 'date',
        'reviewed_at' => 'datetime',
        'confidence' => 'float',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Identified confidently enough that a human is confirming rather than deciding.
     *
     * Note this gates on identity only. Even at 1.0 it is not permission to publish: these are
     * supplements, and the category always gets a human on the approval step.
     */
    public function isConfidentlyMatched(): bool
    {
        return $this->confidence >= self::PUBLISHABLE_CONFIDENCE;
    }

    /**
     * Everything a reviewer needs to judge the observation, in the order they need it.
     *
     * @return array<string, string>
     */
    public function provenanceSummary(): array
    {
        return array_filter([
            'source' => $this->source_id,
            'matched by' => $this->match_method,
            'confidence' => number_format($this->confidence, 2),
            'label dated' => $this->source_published_at?->format('Y-m-d') ?? 'inconnue',
            'retrieved' => $this->retrieved_at?->format('Y-m-d') ?? '',
            'licence' => $this->license_id ?? '',
            'url' => (string) $this->source_url,
        ]);
    }
}
