<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'sms' => 'boolean',
        'loyalty_enabled' => 'boolean',
        'email_unsubscribed_at' => 'datetime',
        'sms_unsubscribed_at' => 'datetime',
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

    // ── Accessors ──────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return $this->name ?? $this->email ?? "Client #{$this->id}";
    }
}
