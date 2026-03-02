<?php

namespace App\Filament\Resources\QuotationResource\RelationManagers;

use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class DetailsRelationManager extends RelationManager
{
    protected static string $relationship = 'details';

    protected static ?string $title = 'Détails du devis';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\Select::make('produit_id')
                    ->label('Produit')
                    ->relationship('product', 'designation_fr')
                    ->searchable()
                    ->preload()
                    ->required(),
                Forms\Components\TextInput::make('designation')
                    ->label('Désignation'),
                Forms\Components\TextInput::make('qte')
                    ->label('Quantité')
                    ->numeric()
                    ->required()
                    ->default(1),
                Forms\Components\TextInput::make('prix_unitaire')
                    ->label('Prix unitaire')
                    ->numeric()
                    ->required(),
                Forms\Components\TextInput::make('prix_ttc')
                    ->label('Prix TTC')
                    ->numeric()
                    ->default(0),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query->with('product:id,designation_fr'))
            ->striped()
            ->columns([
                Tables\Columns\TextColumn::make('product.designation_fr')
                    ->label('Produit'),
                Tables\Columns\TextColumn::make('designation')
                    ->label('Désignation'),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Qté')
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('prix_unitaire')
                    ->label('P.U.')
                    ->money('TND')
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total')
                    ->money('TND')
                    ->alignEnd(),
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
