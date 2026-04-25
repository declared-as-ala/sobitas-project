<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    public const TYPE_TICKET_CAISSE = 'ticket_caisse';

    public const TYPE_BON_LIVRAISON = 'bon_livraison';

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

    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsTicket::class, 'ticket_id');
    }

    public function factureTvasFromTicket(): HasMany
    {
        return $this->hasMany(FactureTva::class, 'source_ticket_id');
    }

    public function isTicketCaisse(): bool
    {
        return ($this->type ?? self::TYPE_TICKET_CAISSE) === self::TYPE_TICKET_CAISSE;
    }

    public function isBonLivraison(): bool
    {
        return ($this->type ?? '') === self::TYPE_BON_LIVRAISON;
    }

    public static function typeOptions(): array
    {
        return [
            self::TYPE_TICKET_CAISSE => 'Ticket de caisse (boutique)',
            self::TYPE_BON_LIVRAISON => 'Bon de livraison',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Ticket $ticket) {
            $type = $ticket->type ?? self::TYPE_TICKET_CAISSE;
            if ($type === self::TYPE_BON_LIVRAISON && empty($ticket->commande_id)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'commande_id' => ['Un Bon de livraison doit être lié à une commande.'],
                ]);
            }
            if ($type === self::TYPE_TICKET_CAISSE) {
                $ticket->commande_id = null;
            }
        });
    }
}
