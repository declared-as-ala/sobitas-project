<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facture extends Model
{
    protected $table = 'factures';

    protected $fillable = [
        'numero', 'client_id', 'prix_ht', 'prix_ttc', 'remise',
        'pourcentage_remise', 'timbre',
    ];

    protected $casts = [
        'prix_ht' => 'float',
        'prix_ttc' => 'float',
        'remise' => 'float',
        'pourcentage_remise' => 'float',
        'timbre' => 'float',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsFacture::class, 'facture_id');
    }
}
