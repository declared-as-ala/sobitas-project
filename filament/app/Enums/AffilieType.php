<?php

namespace App\Enums;

enum AffilieType: string
{
    case Coach = 'coach';
    case Gym = 'gym';

    public function label(): string
    {
        return match ($this) {
            self::Coach => 'Coach',
            self::Gym => 'Salle de sport',
        };
    }
}
