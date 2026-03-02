<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditNoteDetail extends Model
{
    protected $fillable = [
        'credit_note_id', 'produit_id', 'qte', 'unit_price_ht', 'discount',
        'tva_rate', 'total_ht', 'total_ttc',
    ];

    protected $casts = [
        'qte' => 'integer',
        'unit_price_ht' => 'float',
        'discount' => 'float',
        'tva_rate' => 'float',
        'total_ht' => 'float',
        'total_ttc' => 'float',
    ];

    public function creditNote(): BelongsTo
    {
        return $this->belongsTo(CreditNote::class, 'credit_note_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }
}
