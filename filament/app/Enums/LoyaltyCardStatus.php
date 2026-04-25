<?php

namespace App\Enums;

enum LoyaltyCardStatus: string
{
    case Active    = 'active';
    case Suspended = 'suspended';
    case Lost      = 'lost';
    case Replaced  = 'replaced';

    public function label(): string
    {
        return match ($this) {
            self::Active    => 'Active',
            self::Suspended => 'Suspendue',
            self::Lost      => 'Perdue',
            self::Replaced  => 'Remplacée',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Active    => 'success',
            self::Suspended => 'warning',
            self::Lost      => 'danger',
            self::Replaced  => 'gray',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn ($c) => [$c->value => $c->label()])->all();
    }
}
