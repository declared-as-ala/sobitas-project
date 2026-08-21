<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One message in the thread under a review.
 *
 * A reply has NO star rating and never enters `Review::scopeAttested`, so nothing here can move a
 * product's aggregateRating or its JSON-LD. That separation is the reason replies are their own
 * table — see the migration for the argument.
 *
 * Authorship is one of three things, and the accessors below are the only place that is decided:
 *   - `user_id`    a signed-in customer
 *   - `is_staff`   the shop, answering from the admin panel
 *   - `author_name` a guest, with no account
 */
class ReviewReply extends Model
{
    protected $table = 'review_replies';

    protected $guarded = ['id'];

    protected $casts = [
        'publier'       => 'boolean',
        'is_staff'      => 'boolean',
        'ai_moderation' => 'array',
        'ai_checked_at' => 'datetime',
    ];

    /**
     * NEVER serialise these. `author_email` and `ip_hash` exist for moderation and abuse handling
     * only; a reply endpoint that returned either would publish a customer's address to anyone
     * reading a product page. The API layer selects columns explicitly as well — this is the second
     * lock, for the day somebody returns a model straight out of a controller.
     */
    protected $hidden = ['author_email', 'ip_hash'];

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class, 'review_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** The reply this one answers, when it answers a reply rather than the review itself. */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function scopePublished($query)
    {
        return $query->where('publier', 1);
    }

    /**
     * The name to print above the message.
     *
     * Staff first, because a shop reply must never be attributed to whichever admin happened to be
     * logged in — the customer is talking to Protein.tn, not to an employee, and printing a real
     * staff name on a public page is an unnecessary disclosure.
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->is_staff) {
            return 'Protein.tn';
        }

        $name = trim((string) ($this->relationLoaded('user') && $this->user ? $this->user->name : ''));
        if ($name === '') {
            $name = trim((string) $this->author_name);
        }

        return $name !== '' ? $name : 'Client';
    }
}
