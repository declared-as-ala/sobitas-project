<?php

namespace App\Models;

use App\Enums\LoyaltyCardStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class LoyaltyCard extends Model
{
    protected $table = 'loyalty_cards';

    protected $fillable = [
        'batch_id',
        'client_id',
        'card_number',
        'qr_token',
        'status',
        'printed_at',
        'assigned_at',
        'lost_at',
        'retired_at',
        'replacement_for_card_id',
        'notes',
    ];

    protected $casts = [
        'printed_at'  => 'datetime',
        'assigned_at' => 'datetime',
        'lost_at'     => 'datetime',
        'retired_at'  => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (LoyaltyCard $card) {
            if (empty($card->qr_token)) {
                $card->qr_token = (string) Str::uuid();
            }
        });
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LoyaltyCardBatch::class, 'batch_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LoyaltyPointTransaction::class, 'loyalty_card_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'loyalty_card_id');
    }

    public function replacementFor(): BelongsTo
    {
        return $this->belongsTo(LoyaltyCard::class, 'replacement_for_card_id');
    }

    public function replacedBy(): HasOne
    {
        return $this->hasOne(LoyaltyCard::class, 'replacement_for_card_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', LoyaltyCardStatus::Available->value);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', LoyaltyCardStatus::Active->value);
    }

    public function getStatusAttribute($value): LoyaltyCardStatus
    {
        if ($value instanceof LoyaltyCardStatus) {
            return $value;
        }

        $normalized = is_string($value) ? trim($value) : '';

        return LoyaltyCardStatus::tryFrom($normalized) ?? LoyaltyCardStatus::Available;
    }

    public function setStatusAttribute($value): void
    {
        if ($value instanceof LoyaltyCardStatus) {
            $this->attributes['status'] = $value->value;

            return;
        }

        $normalized = is_string($value) ? trim($value) : '';
        $enum = LoyaltyCardStatus::tryFrom($normalized) ?? LoyaltyCardStatus::Available;
        $this->attributes['status'] = $enum->value;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function isAssignable(): bool
    {
        return $this->status === LoyaltyCardStatus::Available;
    }

    public function isUsable(): bool
    {
        return $this->status === LoyaltyCardStatus::Active;
    }
}
