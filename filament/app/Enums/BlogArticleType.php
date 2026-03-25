<?php

namespace App\Enums;

enum BlogArticleType: string
{
    case Complements = 'complements';
    case Lifestyle = 'lifestyle';
    case Nutrition = 'nutrition';
    case Recettes = 'recettes';
    case Sport = 'sport';

    public function label(): string
    {
        return match ($this) {
            self::Complements => 'Compléments',
            self::Lifestyle => 'Lifestyle',
            self::Nutrition => 'Nutrition',
            self::Recettes => 'Recettes',
            self::Sport => 'Sport',
        };
    }

    /** @return array<string, string> value => label */
    public static function options(): array
    {
        $out = [];
        foreach (self::cases() as $case) {
            $out[$case->value] = $case->label();
        }

        return $out;
    }
}
