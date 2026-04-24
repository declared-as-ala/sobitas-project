<?php

namespace App\Models;

use App\Enums\LoyaltyCardStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class LoyaltyCard extends Model
{
    protected $table = 'loyalty_cards';

    protected $fillable = [
        'client_id', 'card_number', 'qr_token', 'status', 'issued_at',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'status'    => LoyaltyCardStatus::class,
    ];

    // ── Relationships ────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function pointTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyPointTransaction::class, 'client_id', 'client_id');
    }

    // ── Points balance ───────────────────────────────────

    /** Sum of all points transactions for this card's client. */
    public function getCurrentPointsAttribute(): int
    {
        return (int) LoyaltyPointTransaction::where('client_id', $this->client_id)->sum('points');
    }

    /** DT value of current points. */
    public function getCurrentValueAttribute(): float
    {
        $rate = (int) config('loyalty.points_per_dt', 10);

        return $rate > 0
            ? round($this->current_points / $rate, 3)
            : 0;
    }

    // ── Factory helpers ──────────────────────────────────

    public static function generateCardNumber(): string
    {
        do {
            $number = 'PROT-' . strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4));
        } while (static::where('card_number', $number)->exists());

        return $number;
    }

    public static function generateQrToken(): string
    {
        do {
            $token = Str::random(48);
        } while (static::where('qr_token', $token)->exists());

        return $token;
    }

    public function isActive(): bool
    {
        return $this->status === LoyaltyCardStatus::Active;
    }
}
