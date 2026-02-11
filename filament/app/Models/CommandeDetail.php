<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommandeDetail extends Model
{
    protected $table = 'commande_details';

    protected $guarded = ['id'];

    protected $casts = [
        'qte' => 'integer',
        'prix_unitaire' => 'float',
    ];

    public $timestamps = false;

    // ── Relationships ──────────────────────────────────

    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }

    // ── Accessors ──────────────────────────────────────

    public function getQuantiteAttribute()
    {
        return $this->qte;
    }

    public function getTotalAttribute(): float
    {
        return $this->qte * $this->prix_unitaire;
    }
}
