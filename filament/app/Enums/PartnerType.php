<?php

namespace App\Enums;

enum PartnerType: string
{
    case Coach = 'coach';
    case Gym = 'gym';

    public function label(): string
    {
        return match ($this) {
            self::Coach => 'Coach',
            self::Gym   => 'Salle de sport',
        };
    }

    public static function options(): array
    {
        return [
            self::Coach->value => self::Coach->label(),
            self::Gym->value   => self::Gym->label(),
        ];
    }
}
