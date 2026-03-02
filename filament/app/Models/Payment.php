<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'facture_tva_id', 'commande_id', 'method', 'amount', 'currency',
        'status', 'provider_ref', 'paid_at',
    ];

    protected $casts = [
        'amount' => 'float',
        'status' => PaymentStatus::class,
        'paid_at' => 'datetime',
    ];

    public function factureTva(): BelongsTo
    {
        return $this->belongsTo(FactureTva::class, 'facture_tva_id');
    }

    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }
}
