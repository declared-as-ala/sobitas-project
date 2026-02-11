<?php

namespace App\Filament\Resources\FactureTvaResource\RelationManagers;

use Filament\Actions;
use Filament\Forms;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class DetailsRelationManager extends RelationManager
{
    protected static string $relationship = 'details';

    protected static ?string $title = 'Détails de la facture';

    public function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Select::make('produit_id')
                ->label('Produit')
                ->relationship('product', 'designation_fr')
                ->required()
                ->searchable()
                ->preload(),
            Forms\Components\TextInput::make('qte')
                ->label('Quantité')
                ->numeric()
                ->required()
                ->minValue(1),
            Forms\Components\TextInput::make('prix_unitaire')
                ->label('Prix unitaire')
                ->numeric()
                ->required()
                ->prefix('DT'),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('product:id,designation_fr'))
            ->columns([
                Tables\Columns\TextColumn::make('product.designation_fr')->label('Produit'),
                Tables\Columns\TextColumn::make('qte')->label('Quantité'),
                Tables\Columns\TextColumn::make('prix_unitaire')->label('Prix unitaire')->money('TND'),
                Tables\Columns\TextColumn::make('prix_ttc')->label('Total')->money('TND'),
            ])
            ->headerActions([Actions\CreateAction::make()])
            ->actions([Actions\EditAction::make(), Actions\DeleteAction::make()]);
    }
}
