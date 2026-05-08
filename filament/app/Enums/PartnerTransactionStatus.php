<?php

namespace App\Enums;

enum PartnerTransactionStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Paid = 'paid';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Confirmed => 'Confirmé',
            self::Paid => 'Payé',
            self::Cancelled => 'Annulé',
        };
    }
}
