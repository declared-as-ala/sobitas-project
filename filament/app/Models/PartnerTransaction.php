<?php

namespace App\Models;

use App\Enums\PartnerTransactionStatus;
use App\Enums\PartnerTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerTransaction extends Model
{
    protected $fillable = [
        'partner_id',
        'ticket_id',
        'partner_code_id',
        'type',
        'amount',
        'balance_after',
        'status',
        'description',
        'metadata',
        'created_by',
    ];

    protected $casts = [
        'type' => PartnerTransactionType::class,
        'status' => PartnerTransactionStatus::class,
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
        return $this->belongsTo(PartnerCode::class, 'partner_code_id');
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
