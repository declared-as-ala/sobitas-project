<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CoordinateResource\Pages;
use App\Models\Coordinate;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class CoordinateResource extends Resource
{
    protected static ?string $model = Coordinate::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-map-pin';
    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';
    protected static ?int $navigationSort = 1;
    protected static ?string $modelLabel = 'Coordonnées';
    protected static ?string $pluralModelLabel = 'Coordonnées';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Grid::make(2)->schema([
                Forms\Components\TextInput::make('abbreviation')->maxLength(255),
                Forms\Components\TextInput::make('email')->email()->maxLength(255),
                Forms\Components\TextInput::make('phone_1')->label('Téléphone 1')->maxLength(255),
                Forms\Components\TextInput::make('phone_2')->label('Téléphone 2')->maxLength(255),
                Forms\Components\TextInput::make('adresse_fr')->label('Adresse')->maxLength(500),
                Forms\Components\TextInput::make('registre_commerce')->label('Registre commerce')->maxLength(255),
                Forms\Components\TextInput::make('matricule')->label('Matricule fiscal')->maxLength(255),
                Forms\Components\TextInput::make('logo_facture')->label('Logo facture (chemin)')->maxLength(500),
            ]),
            Forms\Components\Textarea::make('note')->columnSpanFull(),
            Forms\Components\TextInput::make('facebook')->maxLength(500),
            Forms\Components\TextInput::make('instagram')->maxLength(500),
            Forms\Components\TextInput::make('tiktok')->maxLength(500),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('abbreviation'),
                Tables\Columns\TextColumn::make('email'),
                Tables\Columns\TextColumn::make('phone_1')->label('Tél.'),
                Tables\Columns\TextColumn::make('adresse_fr')->label('Adresse')->limit(40),
            ])
            ->actions([Actions\EditAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageCoordinates::route('/'),
        ];
    }
}

