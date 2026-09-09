<?php

namespace App\Models;

use App\Enums\AffiliePayoutStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AffiliePayout extends Model
{
    protected $fillable = [
        'affilie_id',
        'amount',
        'status',
        'paid_at',
        'payment_reference',
        'admin_note',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'status' => AffiliePayoutStatus::class,
        'paid_at' => 'datetime',
    ];

    public function affilie(): BelongsTo
    {
        return $this->belongsTo(Affilie::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
