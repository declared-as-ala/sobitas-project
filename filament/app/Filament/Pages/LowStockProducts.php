<?php

namespace App\Filament\Pages;

use App\Filament\Resources\ProductResource;
use App\Models\Product;
use Filament\Actions;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;

class LowStockProducts extends Page implements HasTable
{
    use InteractsWithTable;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-exclamation-triangle';

    protected static ?string $navigationLabel = 'Stock faible';

    protected static ?string $title = 'Produits en stock faible';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 2;

    protected string $view = 'filament.pages.low-stock-products';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Product::query()
                    ->with(['sousCategorie', 'brand'])
                    ->lowStock(10)
                    ->where('publier', 1)
                    ->orderByRaw('best_seller DESC, qte ASC')
            )
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->circular()
                    ->size(48),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Produit')
                    ->searchable()
                    ->sortable()
                    ->limit(50),
                Tables\Columns\TextColumn::make('sousCategorie.designation_fr')
                    ->label('Sous-catégorie')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Marque')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Stock')
                    ->sortable()
                    ->badge()
                    ->color(fn ($state) => $this->getStockColor((int) $state))
                    ->formatStateUsing(fn ($state) => $state . ' unités'),
                Tables\Columns\IconColumn::make('best_seller')
                    ->label('Best Seller')
                    ->boolean()
                    ->trueIcon('heroicon-m-star')
                    ->falseIcon('heroicon-o-star')
                    ->trueColor('warning'),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->color(fn ($record) => $this->getStatusColor($record))
                    ->formatStateUsing(fn ($record) => $this->getStatusLabel($record)),
                Tables\Columns\TextColumn::make('prix')
                    ->label('Prix')
                    ->money('TND')
                    ->sortable(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Dernière MAJ')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultPaginationPageOption(25)
            ->recordUrl(fn (Product $record): string => ProductResource::getUrl('edit', ['record' => $record]))
            ->actions([
                Actions\EditAction::make()
                    ->url(fn (Product $record): string => ProductResource::getUrl('edit', ['record' => $record])),
            ]);
    }

    private function getStockColor(int $qte): string
    {
        if ($qte <= 2) {
            return 'danger';
        }
        if ($qte <= 5) {
            return 'warning';
        }

        return 'info';
    }

    private function getStatusLabel(Product $record): string
    {
        if ($record->best_seller && $record->qte <= 5) {
            return 'URGENT: Best Seller';
        }
        if ($record->qte <= 2) {
            return 'Stock critique';
        }
        if ($record->qte <= 5) {
            return 'Stock faible';
        }

        return 'À surveiller';
    }

    private function getStatusColor(Product $record): string
    {
        if ($record->best_seller && $record->qte <= 5) {
            return 'danger';
        }
        if ($record->qte <= 2) {
            return 'danger';
        }
        if ($record->qte <= 5) {
            return 'warning';
        }

        return 'info';
    }
}
