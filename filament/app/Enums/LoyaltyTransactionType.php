<?php

namespace App\Enums;

enum LoyaltyTransactionType: string
{
    case Earn       = 'earn';
    case Redeem     = 'redeem';
    case Reversal   = 'reversal';
    case Adjustment = 'adjustment';

    public function label(): string
    {
        return match ($this) {
            self::Earn       => 'Gain',
            self::Redeem     => 'Utilisation',
            self::Reversal   => 'Annulation',
            self::Adjustment => 'Ajustement',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Earn       => 'success',
            self::Redeem     => 'info',
            self::Reversal   => 'danger',
            self::Adjustment => 'warning',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn ($c) => [$c->value => $c->label()])->all();
    }
}
