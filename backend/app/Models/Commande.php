<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Commande extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'nom',
        'prenom',
        'email',
        'phone',
        'pays',
        'region',
        'ville',
        'code_postale',
        'adresse1',
        'adresse2',
        'note',
        'livraison',
        'frais_livraison',
        'livraison_nom',
        'livraison_prenom',
        'livraison_email',
        'livraison_phone',
        'livraison_region',
        'livraison_ville',
        'livraison_code_postale',
        'livraison_adresse1',
        'livraison_adresse2',
        'etat',
        'numero',
        'prix_ht',
        'prix_ttc',
        'remise',
        'pourcentage_remise',
        'tva',
        'timbre',
        'historique',
    ];

    protected function casts(): array
    {
        return [
            'prix_ht' => 'decimal:2',
            'prix_ttc' => 'decimal:2',
            'remise' => 'decimal:2',
            'frais_livraison' => 'decimal:2',
            'etat' => OrderStatus::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(CommandeDetail::class);
    }

    public function scopePending($query)
    {
        return $query->whereIn('etat', [
            OrderStatus::NOUVELLE_COMMANDE,
            OrderStatus::EN_COURS_DE_PREPARATION,
        ]);
    }

    public function scopeShipped($query)
    {
        return $query->where('etat', OrderStatus::EXPEDIEE);
    }

    public function getFullNameAttribute(): string
    {
        return trim(($this->nom ?? '') . ' ' . ($this->prenom ?? ''));
    }
}
