<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Client extends Model
{
    protected $table = 'clients';

    protected $fillable = [
        'name',
        'email',
        'phone_1',
        'phone_2',
        'adresse',
        'region',
        'ville',
        'code_postale',
        'matricule',
        'sms',
        'email_unsubscribed_at',
        'sms_unsubscribed_at',
        'password',
        'source',
        'loyalty_enabled',
        'loyalty_percent',
        'loyalty_note',
        'loyalty_points_balance',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'sms'                    => 'boolean',
        'loyalty_enabled'        => 'boolean',
        'loyalty_points_balance' => 'integer',
        'email_unsubscribed_at'  => 'datetime',
        'sms_unsubscribed_at'    => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class, 'user_id');
    }

    public function factures(): HasMany
    {
        return $this->hasMany(Facture::class, 'client_id');
    }

    public function facturesTva(): HasMany
    {
        return $this->hasMany(FactureTva::class, 'client_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'client_id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class, 'client_id');
    }

    // ── Loyalty Relationships ──────────────────────────

    public function loyaltyCards(): HasMany
    {
        return $this->hasMany(LoyaltyCard::class, 'client_id');
    }

    public function activeCard(): HasOne
    {
        // Keep compatibility with deployments where assigned_at is not migrated yet.
        // Using id avoids SQL errors on legacy schemas and still returns the latest active card.
        return $this->hasOne(LoyaltyCard::class, 'client_id')
            ->where('status', 'active')
            ->latestOfMany('id');
    }

    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyPointTransaction::class, 'client_id')
            ->orderByDesc('created_at');
    }

    // ── Loyalty Helpers ────────────────────────────────

    public function pointsToTnd(int $points): string
    {
        return number_format($points / 10, 3, '.', ' ');
    }

    public function tndToPoints(float $tnd): int
    {
        return (int) floor($tnd);
    }

    // ── Accessors ──────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return $this->name ?? $this->email ?? "Client #{$this->id}";
    }
}
