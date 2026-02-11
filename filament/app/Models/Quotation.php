<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $table = 'quotations';

    protected $guarded = ['id'];

    protected $casts = [
        'date_quotation' => 'date',
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
        return $this->hasMany(DetailsQuotation::class, 'quotation_id');
    }
}
