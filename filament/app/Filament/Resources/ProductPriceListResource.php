<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductPriceListResource\Pages;
use App\Filament\Resources\ProductPriceListResource\RelationManagers;
use App\Models\ProductPriceList;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class ProductPriceListResource extends Resource
{
    protected static ?string $model = ProductPriceList::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-clipboard-document-list';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?string $navigationLabel = 'Listes de Prix';

    protected static ?string $modelLabel = 'Liste de Prix';

    protected static ?string $pluralModelLabel = 'Listes de Prix';

    protected static ?int $navigationSort = 5;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\Section::make('Liste de prix')
                    ->schema([
                        Forms\Components\TextInput::make('designation')
                            ->label('Désignation')
                            ->required()
                            ->maxLength(255),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('ID')
                    ->sortable(),
                Tables\Columns\TextColumn::make('designation')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('details_count')
                    ->label('Nb Produits')
                    ->counts('details')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\DetailsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListProductPriceLists::route('/'),
            'create' => Pages\CreateProductPriceList::route('/create'),
            'edit'   => Pages\EditProductPriceList::route('/{record}/edit'),
        ];
    }
}

