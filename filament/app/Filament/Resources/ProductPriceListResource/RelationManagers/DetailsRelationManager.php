<?php

namespace App\Filament\Resources\ProductPriceListResource\RelationManagers;

use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class DetailsRelationManager extends RelationManager
{
    protected static string $relationship = 'details';

    protected static ?string $title = 'Produits de la liste';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\Select::make('product_id')
                    ->label('Produit')
                    ->relationship('product', 'designation_fr')
                    ->searchable()
                    ->preload()
                    ->required(),
                Forms\Components\TextInput::make('prix_unitaire')
                    ->label('Prix unitaire')
                    ->numeric()
                    ->required()
                    ->default(0),
                Forms\Components\TextInput::make('prix_gros')
                    ->label('Prix de gros')
                    ->numeric()
                    ->required()
                    ->default(0),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query->with('product:id,designation_fr'))
            ->columns([
                Tables\Columns\TextColumn::make('product.designation_fr')
                    ->label('Produit')
                    ->searchable(),
                Tables\Columns\TextColumn::make('prix_unitaire')
                    ->label('Prix unitaire')
                    ->money('TND'),
                Tables\Columns\TextColumn::make('prix_gros')
                    ->label('Prix de gros')
                    ->money('TND'),
            ])
            ->headerActions([
                Actions\CreateAction::make(),
            ])
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
}
