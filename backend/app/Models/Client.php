<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'name',
        'email',
        'adresse',
        'matricule',
        'phone_1',
        'phone_2',
        'sms',
    ];

    protected function casts(): array
    {
        return [
            'sms' => 'boolean',
        ];
    }

    public function factures(): HasMany
    {
        return $this->hasMany(Facture::class);
    }

    public function facturesTva(): HasMany
    {
        return $this->hasMany(FactureTva::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function scopeSmsEnabled($query)
    {
        return $query->where('sms', 1);
    }
}
