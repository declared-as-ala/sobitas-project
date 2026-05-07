<?php

namespace App\Models;

use App\Enums\PartnerCommissionTransactionStatus;
use App\Enums\PartnerCommissionTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerCommissionTransaction extends Model
{
    protected $fillable = [
        'partner_id',
        'partner_code_id',
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
        'type' => PartnerCommissionTransactionType::class,
        'status' => PartnerCommissionTransactionStatus::class,
        'commission_base' => 'float',
        'commission_rate' => 'float',
        'amount' => 'float',
        'balance_after' => 'float',
        'metadata' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function partnerCode(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'partner_code_id');
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
