<?php

namespace App\Filament\Components\Forms;

use Filament\Forms\Components\TextInput;

class PricingFields
{
    public static function make(bool $includePromo = false, bool $includeRemise = false): array
    {
        $fields = [
            TextInput::make('prix_ht')
                ->label('Price HT')
                ->numeric(),
            TextInput::make('prix')
                ->label('Price')
                ->numeric(),
        ];

        if ($includePromo) {
            $fields[] = TextInput::make('promo_ht')
                ->label('Promo HT')
                ->numeric();
            $fields[] = TextInput::make('promo')
                ->label('Promo')
                ->numeric();
        }

        if ($includeRemise) {
            $fields[] = TextInput::make('remise')
                ->label('Remise')
                ->numeric();
            $fields[] = TextInput::make('pourcentage_remise')
                ->label('Pourcentage remise')
                ->numeric();
            $fields[] = TextInput::make('timbre')
                ->label('Timbre fiscal')
                ->numeric();
        }

        return $fields;
    }
}
