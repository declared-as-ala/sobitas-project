<?php

namespace App\Models;

use App\Enums\AffilieCommissionTransactionStatus;
use App\Enums\AffilieCommissionTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AffilieCommissionTransaction extends Model
{
    protected $fillable = [
        'affilie_id',
        'affilie_code_id',
        'ticket_id',
        'type',
        'status',
        'commission_base',
        'commission_rate',
        'amount',
        'balance_after',
        'description',
        'metadata',
        'created_by',
    ];

    protected $casts = [
        'type' => AffilieCommissionTransactionType::class,
        'status' => AffilieCommissionTransactionStatus::class,
        'commission_base' => 'float',
        'commission_rate' => 'float',
        'amount' => 'float',
        'balance_after' => 'float',
        'metadata' => 'array',
    ];

    public function affilie(): BelongsTo
    {
        return $this->belongsTo(Affilie::class);
    }

    public function affilieCode(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'affilie_code_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
