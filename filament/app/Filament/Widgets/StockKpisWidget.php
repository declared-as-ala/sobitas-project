<?php

namespace App\Filament\Widgets;

use App\Services\StockService;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StockKpisWidget extends BaseWidget
{
    protected static ?int $sort = 1;

    protected int | string | array $columnSpan = 'full';

    public function getStats(): array
    {
        $service = app(StockService::class);
        $metrics = $service->getDashboardMetrics();

        return [
            Stat::make('Total produits', $metrics['total_products'])
                ->description('Catalogue')
                ->icon('heroicon-o-cube'),
            Stat::make('En stock', $metrics['in_stock'])
                ->description('Disponibles')
                ->icon('heroicon-o-check-circle')
                ->color('success'),
            Stat::make('Rupture / Indisponible', $metrics['out_of_stock'])
                ->description('À réapprovisionner')
                ->icon('heroicon-o-x-circle')
                ->color('danger'),
            Stat::make('Stock faible', $metrics['low_stock'])
                ->description('Sous le seuil')
                ->icon('heroicon-o-exclamation-triangle')
                ->color('warning'),
            Stat::make('Valeur totale stock', number_format($metrics['total_stock_value'], 0, ',', ' ') . ' DT')
                ->description('Prix HT × quantités')
                ->icon('heroicon-o-currency-dollar'),
            Stat::make('Incohérences', $metrics['inconsistent'])
                ->description('Qte > 0 mais Rupture')
                ->icon('heroicon-o-exclamation-circle')
                ->color($metrics['inconsistent'] > 0 ? 'danger' : 'gray'),
        ];
    }
}
