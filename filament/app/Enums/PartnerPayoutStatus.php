<?php

namespace App\Enums;

enum PartnerPayoutStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Paid => 'Payé',
            self::Cancelled => 'Annulé',
        };
    }
}
