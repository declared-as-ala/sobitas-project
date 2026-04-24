<?php

namespace App\Enums;

enum CommissionTransactionType: string
{
    case Commission  = 'commission';
    case Payout      = 'payout';
    case Reversal    = 'reversal';
    case Adjustment  = 'adjustment';

    public function label(): string
    {
        return match ($this) {
            self::Commission => 'Commission',
            self::Payout     => 'Paiement',
            self::Reversal   => 'Annulation',
            self::Adjustment => 'Ajustement',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Commission => 'success',
            self::Payout     => 'info',
            self::Reversal   => 'danger',
            self::Adjustment => 'warning',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn ($c) => [$c->value => $c->label()])->all();
    }
}
