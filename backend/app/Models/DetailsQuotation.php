<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailsQuotation extends Model
{
    protected $fillable = [
        'quotation_id',
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

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }
}
