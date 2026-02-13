<?php

namespace App\Filament\Widgets;

use App\Product;
use Filament\Tables;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Database\Eloquent\Builder;

class TopProductsWidget extends BaseWidget
{
    protected static ?string $heading = 'Top Products';

    protected static ?int $sort = 5;

    protected function getTableQuery(): Builder
    {
        return Product::query()
            ->orderBy('qte', 'desc')
            ->limit(10);
    }

    protected function getTableColumns(): array
    {
        return [
            Tables\Columns\TextColumn::make('designation_fr')
                ->label('Product')
                ->searchable()
                ->sortable(),
            Tables\Columns\BadgeColumn::make('qte')
                ->label('Stock')
                ->sortable()
                ->color(fn (int $state): string => match (true) {
                    $state < 10 => 'danger',
                    $state < 50 => 'warning',
                    default => 'success',
                })
                ->formatStateUsing(fn (int $state): string => (string) $state),
            
            Tables\Columns\TextColumn::make('prix')
                ->label('Price')
                ->money('TND')
                ->sortable(),
        ];
    }

    protected function getDefaultTableSortColumn(): ?string
    {
        return 'qte';
    }

    protected function getDefaultTableSortDirection(): ?string
    {
        return 'desc';
    }

    protected function isTablePaginationEnabled(): bool
    {
        return false;
    }
}
