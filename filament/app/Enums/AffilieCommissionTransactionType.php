<?php

namespace App\Enums;

enum AffilieCommissionTransactionType: string
{
    case Commission = 'commission';
    case Payout = 'payout';
    case Reversal = 'reversal';
    case Adjustment = 'adjustment';

    public function label(): string
    {
        return match ($this) {
            self::Commission => 'Commission',
            self::Payout => 'Paiement',
            self::Reversal => 'Annulation',
            self::Adjustment => 'Ajustement',
        };
    }
}
