<?php

namespace App\Filament\Components\Forms;

use App\Client;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;

class ClientSelectionFields
{
    public static function make(): array
    {
        return [
            Toggle::make('new_client')
                ->label('New client')
                ->reactive(),
            Select::make('client_id')
                ->label('Client')
                ->relationship('client', 'name')
                ->searchable()
                ->preload()
                ->visible(fn (callable $get) => ! $get('new_client')),
            TextInput::make('client_name')
                ->label('Name')
                ->maxLength(255)
                ->visible(fn (callable $get) => (bool) $get('new_client')),
            TextInput::make('client_adresse')
                ->label('Adresse')
                ->maxLength(255)
                ->visible(fn (callable $get) => (bool) $get('new_client')),
            TextInput::make('client_phone_1')
                ->label('Phone')
                ->maxLength(255)
                ->visible(fn (callable $get) => (bool) $get('new_client')),
            TextInput::make('client_matricule')
                ->label('Matricule')
                ->maxLength(255)
                ->visible(fn (callable $get) => (bool) $get('new_client')),
        ];
    }
}
