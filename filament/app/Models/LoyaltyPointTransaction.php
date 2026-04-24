<?php

namespace App\Models;

use App\Enums\LoyaltyTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyPointTransaction extends Model
{
    protected $table = 'loyalty_point_transactions';

    protected $fillable = [
        'client_id', 'order_id', 'type', 'points',
        'monetary_value', 'description', 'metadata', 'created_by',
    ];

    protected $casts = [
        'points'         => 'integer',
        'monetary_value' => 'float',
        'metadata'       => 'array',
        'type'           => LoyaltyTransactionType::class,
    ];

    // ── Relationships ────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'order_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
