<?php

namespace App\Models;

use App\Enums\LoyaltyTransactionType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyPointTransaction extends Model
{
    protected $table = 'loyalty_point_transactions';

    protected $fillable = [
        'client_id',
        'loyalty_card_id',
        'ticket_id',
        'type',
        'points',
        'balance_after',
        'description',
        'processed_by',
    ];

    protected $casts = [
        'type'          => LoyaltyTransactionType::class,
        'points'        => 'integer',
        'balance_after' => 'integer',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(LoyaltyCard::class, 'loyalty_card_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeForClient(Builder $query, int $clientId): Builder
    {
        return $query->where('client_id', $clientId);
    }

    public function scopeEarned(Builder $query): Builder
    {
        return $query->where('type', LoyaltyTransactionType::Earn);
    }

    public function scopeRedeemed(Builder $query): Builder
    {
        return $query->where('type', LoyaltyTransactionType::Redeem);
    }
}
