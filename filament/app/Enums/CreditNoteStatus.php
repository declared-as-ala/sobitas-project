<?php

namespace App\Enums;

enum CreditNoteStatus: string
{
    case Draft = 'draft';
    case Issued = 'issued';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::Issued => 'Émis',
        };
    }
}
