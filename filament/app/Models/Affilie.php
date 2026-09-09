<?php

namespace App\Models;

use App\Enums\AffilieStatus;
use App\Enums\AffilieType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Affilie extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'name',
        'business_name',
        'email',
        'phone',
        'address',
        'avatar',
        'status',
        'commission_rate',
        'default_commission_rate',
        'current_balance',
        'total_earned',
        'total_paid',
        'payment_method',
        'bank_name',
        'rib_or_iban',
        'payout_notes',
        'admin_notes',
        'notes',
    ];

    protected $casts = [
        'type' => AffilieType::class,
        'status' => AffilieStatus::class,
        'commission_rate' => 'float',
        'default_commission_rate' => 'float',
        'current_balance' => 'float',
        'total_earned' => 'float',
        'total_paid' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function codes(): HasMany
    {
        return $this->hasMany(AffilieCode::class);
    }

    /** @deprecated Use codes() — alias for older relation name */
    public function coupons(): HasMany
    {
        return $this->codes();
    }

    public function affilieTransactions(): HasMany
    {
        return $this->hasMany(AffilieTransaction::class);
    }

    /** @deprecated Prefer affilieTransactions() */
    public function commissionTransactions(): HasMany
    {
        return $this->affilieTransactions();
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(AffiliePayout::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'affilie_id');
    }

    public function isActive(): bool
    {
        return $this->status === AffilieStatus::Active;
    }

    public function effectiveCommissionRate(): float
    {
        $attrs = $this->getAttributes();

        return (float) ($attrs['commission_rate'] ?? $attrs['default_commission_rate'] ?? 10);
    }

    public static function availableCommissionRoleId(): int
    {
        return (int) config('affilies.affilie_role_id', 4);
    }
}
