<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailsFactureTva extends Model
{
    protected $fillable = [
        'facture_tva_id',
        'produit_id',
        'qte',
        'prix_unitaire',
        'prix_ht',
        'prix_ttc',
        'tva',
    ];

    protected function casts(): array
    {
        return [
            'prix_unitaire' => 'decimal:2',
            'prix_ht' => 'decimal:2',
            'prix_ttc' => 'decimal:2',
            'tva' => 'decimal:2',
            'qte' => 'integer',
        ];
    }

    public function factureTva(): BelongsTo
    {
        return $this->belongsTo(FactureTva::class);
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }
}
