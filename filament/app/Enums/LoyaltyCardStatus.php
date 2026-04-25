<?php

namespace App\Enums;

enum LoyaltyCardStatus: string
{
    case Available = 'available';
    case Active    = 'active';
    case Lost      = 'lost';
    case Retired   = 'retired';

    public function label(): string
    {
        return match($this) {
            self::Available => 'Disponible',
            self::Active    => 'Active',
            self::Lost      => 'Perdue',
            self::Retired   => 'Archivée',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::Available => 'gray',
            self::Active    => 'success',
            self::Lost      => 'danger',
            self::Retired   => 'warning',
        };
    }

    public function icon(): string
    {
        return match($this) {
            self::Available => 'heroicon-o-inbox',
            self::Active    => 'heroicon-o-check-circle',
            self::Lost      => 'heroicon-o-x-circle',
            self::Retired   => 'heroicon-o-archive-box',
        };
    }

    public function isUsable(): bool
    {
        return $this === self::Active;
    }
}
