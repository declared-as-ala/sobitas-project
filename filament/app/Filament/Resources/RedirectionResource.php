<?php

namespace App\Filament\Resources;

use App\Filament\Resources\RedirectionResource\Pages;
use App\Models\Redirection;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class RedirectionResource extends Resource
{
    protected static ?string $model = Redirection::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-arrow-path';
    protected static string | \UnitEnum | null $navigationGroup = 'SEO';
    protected static ?int $navigationSort = 2;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('old_url')->label('Ancien URL')->required()->maxLength(500),
            Forms\Components\TextInput::make('new_url')->label('Nouveau URL')->required()->maxLength(500),
            Forms\Components\Select::make('code')
                ->options(['301' => '301 (Permanent)', '302' => '302 (Temporary)'])
                ->default('301'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('old_url')->label('Ancien URL')->searchable()->limit(40),
                Tables\Columns\TextColumn::make('new_url')->label('Nouveau URL')->searchable()->limit(40),
                Tables\Columns\TextColumn::make('code')->badge(),
            ])
            ->actions([Actions\EditAction::make(), Actions\DeleteAction::make()])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ManageRedirections::route('/')];
    }
}

