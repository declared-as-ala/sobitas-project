<?php

namespace App\Models;

use App\Enums\BlStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facture extends Model
{
    protected $table = 'factures';

    protected $fillable = [
        'numero', 'client_id', 'commande_id', 'status', 'prix_ht', 'prix_ttc', 'remise',
        'pourcentage_remise', 'timbre', 'net_a_payer',
    ];

    protected $casts = [
        'prix_ht' => 'decimal:3',
        'remise' => 'decimal:3',
        'pourcentage_remise' => 'decimal:3',
        'prix_ht_apres_remise' => 'decimal:3',
        'tva' => 'decimal:3',
        'timbre' => 'decimal:3',
        'prix_ttc' => 'decimal:3',
        'net_a_payer' => 'decimal:3',
        'status' => BlStatus::class,
    ];

    protected static function booted()
    {
        static::creating(function ($facture) {
            if (empty($facture->status)) {
                $facture->status = BlStatus::Issued;
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsFacture::class, 'facture_id');
    }

    public function factureTvas(): HasMany
    {
        return $this->hasMany(FactureTva::class, 'facture_id');
    }
}
