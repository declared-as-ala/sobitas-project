<?php

namespace App\Enums;

enum BlStatus: string
{
    case Draft = 'draft';
    case Issued = 'issued';
    case Delivered = 'delivered';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::Issued => 'Émis',
            self::Delivered => 'Livré',
        };
    }
}
