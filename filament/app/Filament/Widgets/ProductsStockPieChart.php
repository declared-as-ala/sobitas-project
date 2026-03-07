<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProductsStockPieChart extends ChartWidget
{
    protected ?string $heading = 'Répartition des produits';

    protected static bool $isLazy = true;

    protected static ?int $sort = 52;

    protected int | string | array $columnSpan = 1;

    protected ?string $maxHeight = '320px';

    protected ?string $pollingInterval = null;

    protected function getData(): array
    {
        $cacheKey = 'dashboard:products_stock_pie:v1';

        return Cache::remember($cacheKey, 300, function () {
            return $this->buildData();
        });
    }

    private function buildData(): array
    {
        // Mutually exclusive: En rupture → Non publié → Publié (en stock).
        $outOfStock = (int) DB::table('products')->where('rupture', 1)->count();

        $notPublished = (int) DB::table('products')
            ->where('publier', 0)
            ->where(function ($q) {
                $q->where('rupture', 0)->orWhereNull('rupture');
            })
            ->count();

        $publishedInStock = (int) DB::table('products')
            ->where('publier', 1)
            ->where(function ($q) {
                $q->where('rupture', 0)->orWhereNull('rupture');
            })
            ->count();

        $labels = ['Publié (en stock)', 'Non publié', 'En rupture'];
        $data = [$publishedInStock, $notPublished, $outOfStock];
        $colors = [
            'rgba(34, 197, 94, 0.85)',
            'rgba(107, 114, 128, 0.85)',
            'rgba(239, 68, 68, 0.85)',
        ];

        return [
            'datasets' => [
                [
                    'data' => $data,
                    'backgroundColor' => $colors,
                    'borderWidth' => 1,
                    'hoverOffset' => 4,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'pie';
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'display' => true,
                    'position' => 'bottom',
                ],
            ],
        ];
    }
}
