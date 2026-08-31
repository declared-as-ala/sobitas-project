<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    protected $table = 'reviews';

    protected $guarded = ['id'];

    protected $casts = [
        'note' => 'integer',
        'publier' => 'integer',
        'ai_moderation' => 'array',
        'ai_checked_at' => 'datetime',
        'authenticity_signals' => 'array',
        'points_awarded' => 'boolean',
        'compose_ms' => 'integer',
    ];

    /**
     * NEVER serialise these.
     *
     * `author_email` is how an admin reaches a guest reviewer and how the moderator recognises one
     * person filing eight reviews in a minute; `ip_hash` is the same question without storing an
     * address. Neither is a fact the storefront is entitled to, and a product page is about as
     * public as a page gets. The API selects review columns explicitly too — this is the second
     * lock, for the day somebody returns a model straight out of a controller.
     */
    /**
     * NEVER serialise these.
     *
     * `author_email` and `ip_hash` are moderation handles, not facts the storefront is entitled to.
     * `text_hash` and `authenticity_signals` joined them for a different reason: publishing what
     * the bot detector looks at, and what it concluded about a specific review, is publishing the
     * evasion instructions. A reviewer is told their review is being checked; they are not told
     * which checks it passed.
     */
    protected $hidden = ['author_email', 'ip_hash', 'text_hash', 'authenticity_signals', 'authenticity_score'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * The thread under this review. Ordered oldest-first: a conversation reads downward, and the
     * reply that answers a question should never appear above the question.
     */
    public function replies(): HasMany
    {
        return $this->hasMany(ReviewReply::class, 'review_id')->oldest();
    }

    /**
     * The name to print above the review.
     *
     * A guest review carries its author on the row (`author_name`); an account review carries it on
     * the user. Falling back to "Client" rather than an empty line matters because the fallback is
     * what the legacy backlog renders — those rows have neither a user nor an author_name.
     */
    public function getDisplayNameAttribute(): string
    {
        $name = trim((string) ($this->relationLoaded('user') && $this->user ? $this->user->name : ''));
        if ($name === '') {
            $name = trim((string) ($this->author_name ?? ''));
        }

        return $name !== '' ? $name : 'Client';
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
