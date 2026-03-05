<?php

namespace App\Models;

use App\Enums\QuotationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $table = 'quotations';

    protected $guarded = ['id'];

    protected $casts = [
        'date_quotation' => 'date',
        'prix_ht' => 'decimal:3',
        'remise' => 'decimal:3',
        'pourcentage_remise' => 'decimal:3',
        'prix_ht_apres_remise' => 'decimal:3',
        'tva' => 'decimal:3',
        'timbre' => 'decimal:3',
        'prix_ttc' => 'decimal:3',
        'net_a_payer' => 'decimal:3',
        'prix_total' => 'decimal:3',
        'status' => QuotationStatus::class,
    ];

    protected static function booted()
    {
        static::creating(function ($quotation) {
            if (empty($quotation->status)) {
                $quotation->status = QuotationStatus::Accepted; // Defaults to Valide directly
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsQuotation::class, 'quotation_id');
    }

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class, 'quotation_id');
    }
}
