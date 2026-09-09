<?php

namespace App\Models;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AffilieTransaction extends Model
{
    protected $fillable = [
        'affilie_id',
        'ticket_id',
        // Order attribution. Added by migration 2026_09_09_120100 — without it in $fillable,
        // create(['commande_id' => ...]) drops the value SILENTLY and the ledger row is written
        // with no link to the order that earned it. Nothing errors; the money is just orphaned.
        'commande_id',
        'affilie_code_id',
        'type',
        'amount',
        'balance_after',
        'status',
        'description',
        'metadata',
        // Deterministic key with a UNIQUE index (migration 2026_09_09_120200). Same reason as
        // above, and worse: an unfillable idempotency key means every row is written with NULL,
        // MySQL treats NULLs as distinct, and the duplicate-payment guard quietly does nothing.
        'idempotency_key',
        'created_by',
    ];

    protected $casts = [
        'type' => AffilieTransactionType::class,
        'status' => AffilieTransactionStatus::class,
        'amount' => 'float',
        'balance_after' => 'float',
        'metadata' => 'array',
    ];

    public function affilie(): BelongsTo
    {
        return $this->belongsTo(Affilie::class);
    }

    public function affilieCode(): BelongsTo
    {
        return $this->belongsTo(AffilieCode::class, 'affilie_code_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /** Storefront order that earned (or reversed, or was charged for) this row. */
    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
