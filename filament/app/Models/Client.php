<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $table = 'clients';

    protected $fillable = [
        'name', 'email', 'phone_1', 'phone_2', 'adresse', 'matricule',
        'sms', 'password',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'sms' => 'boolean',
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
