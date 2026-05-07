<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponRedemption extends Model
{
    protected $table = 'coupon_redemptions';

    protected $fillable = [
        'coupon_id', 'order_id', 'ticket_id', 'client_id',
        'phone_snapshot', 'email_snapshot',
        'discount_amount_ht', 'discount_amount_ttc',
    ];

    protected $casts = [
        'discount_amount_ht' => 'float',
        'discount_amount_ttc' => 'float',
    ];

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'order_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}
