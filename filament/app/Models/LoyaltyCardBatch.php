<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyCardBatch extends Model
{
    protected $table = 'loyalty_card_batches';

    protected $fillable = [
        'name',
        'prefix',
        'start_number',
        'quantity',
        'padding',
        'generated_count',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'start_number'    => 'integer',
        'quantity'        => 'integer',
        'padding'         => 'integer',
        'generated_count' => 'integer',
    ];

    public function cards(): HasMany
    {
        return $this->hasMany(LoyaltyCard::class, 'batch_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getAvailableCountAttribute(): int
    {
        return $this->cards()->where('status', 'available')->count();
    }

    public function getPrintedCountAttribute(): int
    {
        return $this->cards()->whereNotNull('printed_at')->count();
    }

    public function getActiveCountAttribute(): int
    {
        return $this->cards()->where('status', 'active')->count();
    }

    public function isGenerated(): bool
    {
        return $this->generated_count > 0;
    }
}
