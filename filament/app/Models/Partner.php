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
        'default_commission_rate',
        'payment_method',
        'bank_name',
        'rib_or_iban',
        'payout_notes',
        'admin_notes',
    ];

    protected $casts = [
        'type' => PartnerType::class,
        'status' => PartnerStatus::class,
        'default_commission_rate' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class, 'partner_id');
    }

    public function commissionTransactions(): HasMany
    {
        return $this->hasMany(PartnerCommissionTransaction::class);
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

    public static function availableCommissionRoleId(): int
    {
        return (int) config('partners.partner_role_id', 4);
    }
}
