<?php

namespace App\Models;

use App\Enums\CommissionTransactionStatus;
use App\Enums\CommissionTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerCommissionTransaction extends Model
{
    protected $table = 'partner_commission_transactions';

    protected $fillable = [
        'partner_id', 'order_id', 'promo_code_id',
        'type', 'amount', 'balance_after', 'status',
        'description', 'metadata', 'created_by',
    ];

    protected $casts = [
        'amount'        => 'float',
        'balance_after' => 'float',
        'metadata'      => 'array',
        'type'          => CommissionTransactionType::class,
        'status'        => CommissionTransactionStatus::class,
    ];

    // ── Relationships ────────────────────────────────────

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'order_id');
    }

    public function promoCode(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'promo_code_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
