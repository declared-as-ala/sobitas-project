<?php

namespace App\Enums;

enum PartnerStatus: string
{
    case Pending   = 'pending';
    case Active    = 'active';
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::Pending   => 'En attente',
            self::Active    => 'Actif',
            self::Suspended => 'Suspendu',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending   => 'warning',
            self::Active    => 'success',
            self::Suspended => 'danger',
        };
    }

    public static function options(): array
    {
        return [
            self::Pending->value   => self::Pending->label(),
            self::Active->value    => self::Active->label(),
            self::Suspended->value => self::Suspended->label(),
        ];
    }
}
