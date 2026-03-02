<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AromaResource\Pages;
use App\Models\Aroma;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class AromaResource extends Resource
{
    protected static ?string $model = Aroma::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-sparkles';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 5;

    protected static ?string $modelLabel = 'Aroma';

    protected static ?string $pluralModelLabel = 'Aromas';

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('designation_fr')
                ->label('Désignation')
                ->required()
                ->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Aroma')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('products_count')
                    ->counts('products')
                    ->label('Produits'),
            ])
            ->actions([
                Actions\EditAction::make()->slideOver(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageAromas::route('/'),
        ];
    }
}
