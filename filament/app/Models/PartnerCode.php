<?php

namespace App\Models;

use App\Enums\PartnerCodeStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartnerCode extends Model
{
    protected $fillable = [
        'partner_id',
        'code',
        'discount_type',
        'discount_value',
        'commission_rate',
        'status',
        'used_count',
        'legacy_coupon_id',
    ];

    protected $casts = [
        'discount_value' => 'float',
        'commission_rate' => 'float',
        'used_count' => 'integer',
        'status' => PartnerCodeStatus::class,
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'partner_code_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PartnerTransaction::class, 'partner_code_id');
    }

    public function isActive(): bool
    {
        return $this->status === PartnerCodeStatus::Active;
    }

    /** HT discount for POS (percentage or fixed on subtotal after regular remise). */
    public function computeDiscountHt(float $subtotalHt): float
    {
        $subtotalHt = max(0.0, $subtotalHt);
        $type = (string) ($this->discount_type ?? 'percentage');

        if ($type === 'fixed') {
            return min((float) $this->discount_value, $subtotalHt);
        }

        $pct = min(100.0, max(0.0, (float) $this->discount_value));

        return round($subtotalHt * ($pct / 100), 3);
    }
}
