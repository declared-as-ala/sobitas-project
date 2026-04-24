<?php

namespace App\Enums;

enum LoyaltyCardStatus: string
{
    case Active    = 'active';
    case Suspended = 'suspended';
    case Lost      = 'lost';

    public function label(): string
    {
        return match ($this) {
            self::Active    => 'Active',
            self::Suspended => 'Suspendue',
            self::Lost      => 'Perdue',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Active    => 'success',
            self::Suspended => 'warning',
            self::Lost      => 'danger',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn ($c) => [$c->value => $c->label()])->all();
    }
}
