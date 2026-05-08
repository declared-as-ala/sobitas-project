<?php

namespace App\Enums;

enum PartnerTransactionType: string
{
    case Commission = 'commission';
    case Payment = 'payment';
    case Adjustment = 'adjustment';
    case Reversal = 'reversal';

    public function label(): string
    {
        return match ($this) {
            self::Commission => 'Commission',
            self::Payment => 'Paiement',
            self::Adjustment => 'Ajustement',
            self::Reversal => 'Annulation',
        };
    }
}
