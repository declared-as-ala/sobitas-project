<?php

namespace App\Filament\Widgets;

use App\Services\StockReportService;
use Filament\Widgets\ChartWidget;

class StockValueByCategoryChartWidget extends ChartWidget
{
    protected ?string $heading = 'Valeur du stock par catégorie (Top 10)';

    protected static bool $isLazy = true;

    protected int | string | array $columnSpan = 'full';

    protected ?string $maxHeight = '320px';

    protected ?string $pollingInterval = null;

    protected function getData(): array
    {
        $rows = app(StockReportService::class)->getValueByCategory(10);
        $labels = array_map(fn ($r) => $r->name, $rows);
        $data = array_map(fn ($r) => round($r->value, 2), $rows);

        return [
            'datasets' => [
                [
                    'label' => 'Valeur (DT)',
                    'data' => $data,
                    'backgroundColor' => [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(14, 165, 233, 0.8)',
                        'rgba(20, 184, 166, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(107, 114, 128, 0.8)',
                    ],
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }

    protected function getOptions(): array
    {
        return [
            'indexAxis' => 'y',
            'scales' => [
                'x' => [
                    'beginAtZero' => true,
                    'title' => ['display' => true, 'text' => 'Valeur (DT)'],
                ],
                'y' => ['display' => true],
            ],
            'plugins' => [
                'legend' => ['display' => false],
            ],
        ];
    }
}
