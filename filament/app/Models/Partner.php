<?php

namespace App\Models;

use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Partner extends Model
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
        'type' => PartnerType::class,
        'status' => PartnerStatus::class,
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
        return $this->hasMany(PartnerCode::class);
    }

    /** @deprecated Use codes() — alias for older relation name */
    public function coupons(): HasMany
    {
        return $this->codes();
    }

    public function partnerTransactions(): HasMany
    {
        return $this->hasMany(PartnerTransaction::class);
    }

    /** @deprecated Prefer partnerTransactions() */
    public function commissionTransactions(): HasMany
    {
        return $this->partnerTransactions();
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(PartnerPayout::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'partner_id');
    }

    public function isActive(): bool
    {
        return $this->status === PartnerStatus::Active;
    }

    public function effectiveCommissionRate(): float
    {
        $attrs = $this->getAttributes();

        return (float) ($attrs['commission_rate'] ?? $attrs['default_commission_rate'] ?? 10);
    }

    public static function availableCommissionRoleId(): int
    {
        return (int) config('partners.partner_role_id', 4);
    }
}
