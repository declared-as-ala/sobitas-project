<?php

namespace App\Models;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AffilieTransaction extends Model
{
    protected $fillable = [
        'affilie_id',
        'ticket_id',
        'affilie_code_id',
        'type',
        'amount',
        'balance_after',
        'status',
        'description',
        'metadata',
        'created_by',
    ];

    protected $casts = [
        'type' => AffilieTransactionType::class,
        'status' => AffilieTransactionStatus::class,
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
        return $this->belongsTo(AffilieCode::class, 'affilie_code_id');
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
