<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    case Draft = 'draft';
    case Issued = 'issued';
    case Paid = 'paid';
    case PartiallyPaid = 'partially_paid';
    case Canceled = 'canceled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::Issued => 'Émise',
            self::Paid => 'Payée',
            self::PartiallyPaid => 'Partiellement payée',
            self::Canceled => 'Annulée',
        };
    }
}
