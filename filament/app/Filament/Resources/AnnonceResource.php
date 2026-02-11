<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AnnonceResource\Pages;
use App\Models\Annonce;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class AnnonceResource extends Resource
{
    protected static ?string $model = Annonce::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-megaphone';
    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';
    protected static ?int $navigationSort = 6;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('image')->label('Image (chemin)')->maxLength(500),
            Forms\Components\TextInput::make('lien')->label('Lien')->maxLength(500),
            Forms\Components\Textarea::make('texte')->label('Texte'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image')->label('Image'),
                Tables\Columns\TextColumn::make('texte')->limit(50),
                Tables\Columns\TextColumn::make('lien')->limit(30),
            ])
            ->actions([Actions\EditAction::make(), Actions\DeleteAction::make()])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ManageAnnonces::route('/')];
    }
}

