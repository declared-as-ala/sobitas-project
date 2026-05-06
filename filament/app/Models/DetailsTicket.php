<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailsTicket extends Model
{
    protected $table = 'details_tickets';

    protected $guarded = ['id'];

    protected $casts = [
        'qte' => 'float',
        'prix_unitaire' => 'float',
    ];

    public $timestamps = false;

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }

    public function getTotalAttribute(): float
    {
        return (float) ($this->qte ?? 0) * (float) ($this->prix_unitaire ?? 0);
    }
}
