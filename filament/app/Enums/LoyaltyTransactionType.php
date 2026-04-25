<?php

namespace App\Enums;

enum LoyaltyTransactionType: string
{
    case Earn       = 'earn';
    case Redeem     = 'redeem';
    case Adjustment = 'adjustment';
    case Expiry     = 'expiry';

    public function label(): string
    {
        return match($this) {
            self::Earn       => 'Gain',
            self::Redeem     => 'Utilisation',
            self::Adjustment => 'Ajustement',
            self::Expiry     => 'Expiration',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::Earn       => 'success',
            self::Redeem     => 'warning',
            self::Adjustment => 'info',
            self::Expiry     => 'danger',
        };
    }
}
