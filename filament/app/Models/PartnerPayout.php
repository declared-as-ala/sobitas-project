<?php

namespace App\Models;

use App\Enums\PartnerPayoutStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerPayout extends Model
{
    protected $fillable = [
        'partner_id',
        'amount',
        'status',
        'paid_at',
        'payment_reference',
        'admin_note',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'status' => PartnerPayoutStatus::class,
        'paid_at' => 'datetime',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
