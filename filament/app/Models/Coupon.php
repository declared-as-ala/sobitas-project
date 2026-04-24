<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    protected $table = 'coupons';

    public const TYPE_PERCENT = 'percent';
    public const TYPE_FIXED = 'fixed';
    public const TYPE_FREE_SHIPPING = 'free_shipping';

    public const APPLIES_TO_ORDER = 'order';

    protected $fillable = [
        'code', 'type', 'value', 'starts_at', 'ends_at', 'is_active',
        'min_order_amount', 'max_discount_amount', 'usage_limit_total', 'usage_limit_per_client',
        'applies_to', 'notes', 'partner_id', 'commission_rate',
    ];

    protected $casts = [
        'value' => 'float',
        'min_order_amount' => 'float',
        'max_discount_amount' => 'float',
        'commission_rate' => 'float',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_active' => 'boolean',
        'usage_limit_total' => 'integer',
        'usage_limit_per_client' => 'integer',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class, 'coupon_id');
    }

    public function getRedemptionsCountAttribute(): int
    {
        return $this->redemptions()->count();
    }
}
