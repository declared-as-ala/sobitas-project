<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $table = 'reviews';

    protected $guarded = ['id'];

    protected $casts = [
        'note' => 'integer',
        'publier' => 'integer',
        'ai_moderation' => 'array',
        'ai_checked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function scopePublished($query)
    {
        return $query->where('publier', 1);
    }

    /**
     * Published AND backed by evidence of a real purchase — the only reviews allowed to move a
     * star rating, on the page or in structured data.
     *
     * This is the SQL twin of ProductSchemaBuilder::isAttestedPurchase(), which decides the same
     * thing in PHP for JSON-LD. The two must agree: if the page shows 4.5 from 8 reviews while
     * the markup claims something else, that is exactly the mismatch Google penalises. Change one,
     * change the other.
     *
     * "Evidence" is verified = 1 (an admin confirmed it) or a commande_id (the review came in
     * through the tokenised link in a post-delivery email, so an order is attached by
     * construction). The 203 reviews that used to power a sitewide 4.6 had neither.
     */
    public function scopeAttested($query)
    {
        return $query->where('publier', 1)
            ->where(function ($q) {
                $q->where('verified', 1)->orWhereNotNull('commande_id');
            });
    }
}
