<?php

namespace App\Enums;

enum PartnerCommissionTransactionStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Confirmed => 'Confirmé',
            self::Cancelled => 'Annulé',
            self::Paid => 'Payé',
        };
    }
}
