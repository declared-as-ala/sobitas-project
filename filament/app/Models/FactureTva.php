<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FactureTva extends Model
{
    protected $table = 'facture_tvas';

    protected $guarded = ['id'];

    protected $casts = [
        'date_facture' => 'date',
        'prix_total' => 'float',
        'tva' => 'float',
        'timbre' => 'float',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsFactureTva::class, 'facture_tva_id');
    }
}
