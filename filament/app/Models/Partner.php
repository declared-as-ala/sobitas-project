<?php

namespace App\Models;

use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Partner extends Model
{
    protected $table = 'partners';

    protected $fillable = [
        'user_id', 'type', 'name', 'business_name', 'email', 'phone', 'address',
        'avatar', 'status', 'commission_rate', 'payout_method',
        'bank_name', 'rib_or_iban', 'notes',
    ];

    protected $casts = [
        'commission_rate' => 'float',
        'type'            => PartnerType::class,
        'status'          => PartnerStatus::class,
    ];

    // ── Relationships ────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class);
    }

    public function commissionTransactions(): HasMany
    {
        return $this->hasMany(PartnerCommissionTransaction::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(PartnerPayout::class);
    }

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class);
    }

    // ── Balance (ledger calculation) ─────────────────────

    /** Confirmed commissions minus paid/payout transactions. */
    public function getAvailableBalanceAttribute(): float
    {
        $earned = $this->commissionTransactions()
            ->where('type', 'commission')
            ->where('status', 'confirmed')
            ->sum('amount');

        $paid = $this->commissionTransactions()
            ->whereIn('type', ['payout', 'reversal'])
            ->whereIn('status', ['confirmed', 'paid'])
            ->sum('amount');

        return max(0, round((float) $earned - (float) $paid, 3));
    }

    public function getTotalEarnedAttribute(): float
    {
        return (float) $this->commissionTransactions()
            ->where('type', 'commission')
            ->where('status', 'confirmed')
            ->sum('amount');
    }

    public function getTotalPaidAttribute(): float
    {
        return (float) $this->commissionTransactions()
            ->where('type', 'payout')
            ->where('status', 'paid')
            ->sum('amount');
    }

    public function getPendingEarningsAttribute(): float
    {
        return (float) $this->commissionTransactions()
            ->where('type', 'commission')
            ->where('status', 'pending')
            ->sum('amount');
    }

    // ── Helpers ──────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === PartnerStatus::Active;
    }

    public function getEffectiveCommissionRate(): float
    {
        return $this->commission_rate ?? 10.0;
    }
}
