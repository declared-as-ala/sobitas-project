<?php

namespace App\Filament\Widgets;

use App\Services\StockReportService;
use Filament\Widgets\ChartWidget;

class StockDistributionPieChartWidget extends ChartWidget
{
    protected ?string $heading = 'Répartition du stock par catégorie';

    protected static bool $isLazy = true;

    protected int | string | array $columnSpan = 1;

    protected ?string $maxHeight = '320px';

    protected ?string $pollingInterval = null;

    protected function getData(): array
    {
        $rows = app(StockReportService::class)->getDistributionByCategory();
        $labels = array_map(fn ($r) => $r->name, $rows);
        $data = array_map(fn ($r) => round($r->value, 2), $rows);

        $colors = [
            'rgba(59, 130, 246, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(251, 191, 36, 0.85)',
            'rgba(239, 68, 68, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(14, 165, 233, 0.85)',
            'rgba(20, 184, 166, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(107, 114, 128, 0.85)',
        ];
        $backgrounds = array_slice(array_merge($colors, $colors, $colors), 0, count($data));

        return [
            'datasets' => [
                [
                    'data' => $data,
                    'backgroundColor' => $backgrounds,
                    'borderWidth' => 1,
                    'hoverOffset' => 4,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
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
