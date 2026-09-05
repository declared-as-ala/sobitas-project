<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPointTransaction extends Model
{
    protected $table = 'user_point_transactions';

    protected $guarded = ['id'];

    protected $casts = [
        'points'        => 'integer',
        'balance_after' => 'integer',
    ];

    protected $hidden = ['idempotency_key'];

    // ── Relationships ────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Nullable — commandes may be legacy so no hard FK exists. */
    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }
}
