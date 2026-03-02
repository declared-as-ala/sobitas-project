<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailsFactureTva extends Model
{
    protected $table = 'details_facture_tvas';

    protected $guarded = ['id'];

    protected $casts = [
        'qte' => 'integer',
        'quantite' => 'integer',
        'prix_unitaire' => 'float',
    ];

    public $timestamps = false;

    public function factureTva(): BelongsTo
    {
        return $this->belongsTo(FactureTva::class, 'facture_tva_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }

    public function getTotalAttribute(): float
    {
        $qte = $this->qte ?? $this->quantite ?? 0;
        return $qte * $this->prix_unitaire;
    }
}
