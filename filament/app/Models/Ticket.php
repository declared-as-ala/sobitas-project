<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    protected $table = 'tickets';

    protected $guarded = ['id'];

    protected $casts = [
        'date_ticket' => 'date',
        'prix_total' => 'float',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsTicket::class, 'ticket_id');
    }
}
