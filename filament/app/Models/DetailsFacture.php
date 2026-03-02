<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailsFacture extends Model
{
    protected $table = 'details_factures';

    protected $guarded = ['id'];

    protected $casts = [
        'qte' => 'integer',
        'quantite' => 'integer',
        'prix_unitaire' => 'float',
    ];

    public $timestamps = false;

    public function facture(): BelongsTo
    {
        return $this->belongsTo(Facture::class, 'facture_id');
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
