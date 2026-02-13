<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    protected $fillable = [
        'client_id',
        'numero',
        'remise',
        'pourcentage_remise',
        'prix_ht',
        'prix_ttc',
        'tva',
        'timbre',
    ];

    protected function casts(): array
    {
        return [
            'remise' => 'decimal:2',
            'prix_ht' => 'decimal:2',
            'prix_ttc' => 'decimal:2',
            'tva' => 'decimal:2',
            'timbre' => 'decimal:2',
            'pourcentage_remise' => 'decimal:2',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsTicket::class);
    }
}
