<?php

namespace App\Filament\Resources\SousCategoryResource\Widgets;

use App\Models\Product;
use App\Models\SousCategory;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class SousCategoryStatsWidget extends BaseWidget
{
    protected static ?int $sort = 0;

    protected int|string|array $columnSpan = 'full';

    protected function getStats(): array
    {
        $total = SousCategory::count();
        $withProducts = SousCategory::has('products')->count();
        $empty = SousCategory::doesntHave('products')->count();
        $productCount = Product::count();

        return [
            Stat::make('Sous-catégories', number_format($total))
                ->description('Total enregistrées')
                ->icon('heroicon-o-rectangle-group')
                ->color('primary'),
            Stat::make('Avec produits', number_format($withProducts))
                ->description('Au moins 1 produit')
                ->icon('heroicon-o-check-circle')
                ->color('success'),
            Stat::make('Vides', number_format($empty))
                ->description('Sans produit')
                ->icon('heroicon-o-archive-box-x-mark')
                ->color($empty > 0 ? 'warning' : 'gray'),
            Stat::make('Produits catalogue', number_format($productCount))
                ->description('Tous produits')
                ->icon('heroicon-o-cube')
                ->color('info'),
        ];
    }
}
