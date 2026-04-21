<?php

namespace App\Filament\Components\Forms;

use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;

class ContactFields
{
    public static function make(bool $includeSms = false): array
    {
        $fields = [
            TextInput::make('name')
                ->label('Name')
                ->required()
                ->maxLength(255),
            TextInput::make('email')
                ->email()
                ->maxLength(255)
                ->unique(ignoreRecord: true),
            TextInput::make('phone_1')
                ->label('Phone 1')
                ->maxLength(255)
                ->unique(ignoreRecord: true),
            TextInput::make('phone_2')
                ->label('Phone 2')
                ->maxLength(255),
            TextInput::make('matricule')
                ->label('Matricule')
                ->maxLength(255),
            Textarea::make('adresse')
                ->label('Address')
                ->rows(3),
        ];

        if ($includeSms) {
            $fields[] = Toggle::make('sms')
                ->label('SMS');
        }

        return $fields;
    }
}
