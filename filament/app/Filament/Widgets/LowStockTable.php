<?php

namespace App\Filament\Widgets;

use App\Models\Product;
use App\Filament\Resources\ProductResource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class LowStockTable extends BaseWidget
{
    protected static ?string $heading = 'Stock Faible';

    protected static ?int $sort = 8;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Product::query()
                    ->lowStock(10)
                    ->where('publier', 1)
                    ->select(['id', 'designation_fr', 'qte', 'best_seller', 'updated_at'])
                    ->orderByRaw('best_seller DESC, qte ASC')
            )
            ->columns([
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Produit')
                    ->searchable()
                    ->limit(50),

                Tables\Columns\TextColumn::make('qte')
                    ->label('Stock')
                    ->badge()
                    ->color(fn ($state) => $this->getStockColor($state))
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

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Dernière MAJ')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultPaginationPageOption(15)
            ->recordUrl(fn (Product $record): string => ProductResource::getUrl('edit', ['record' => $record]));
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
            return 'Stock Critique';
        }
        if ($record->qte <= 5) {
            return 'Stock Faible';
        }

        return 'À Surveiller';
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
