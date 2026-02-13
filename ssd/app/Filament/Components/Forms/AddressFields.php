<?php

namespace App\Filament\Components\Forms;

use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;

class AddressFields
{
    public static function make(string $prefix = ''): array
    {
        $name = $prefix ? "{$prefix}_" : '';

        return [
            TextInput::make("{$name}nom")
                ->label('Nom')
                ->maxLength(255),
            TextInput::make("{$name}prenom")
                ->label('Prénom')
                ->maxLength(255),
            TextInput::make("{$name}email")
                ->email()
                ->label('Email')
                ->maxLength(255),
            TextInput::make("{$name}phone")
                ->label('Téléphone')
                ->maxLength(255),
            TextInput::make("{$name}pays")
                ->label('Pays')
                ->maxLength(255),
            TextInput::make("{$name}region")
                ->label('Région')
                ->maxLength(255),
            TextInput::make("{$name}ville")
                ->label('Ville')
                ->maxLength(255),
            TextInput::make("{$name}code_postale")
                ->label('Code postal')
                ->numeric(),
            Textarea::make("{$name}adresse1")
                ->label('Adresse 1')
                ->rows(2),
            Textarea::make("{$name}adresse2")
                ->label('Adresse 2')
                ->rows(2),
        ];
    }
}
