<?php

namespace App\Filament\Widgets;

use App\Models\StockMovement;
use Filament\Widgets\ChartWidget;
use Illuminate\Database\Eloquent\Builder;

class StockMovementChartWidget extends ChartWidget
{
    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected ?string $heading = 'Mouvements de stock (7 derniers jours)';

    protected ?string $maxHeight = '200px';

    public ?string $filter = '7';

    protected function getData(): array
    {
        $days = (int) ($this->filter ?? 7);
        $since = now()->subDays($days);

        $entries = StockMovement::query()
            ->where('created_at', '>=', $since)
            ->where('movement_type', 'entry')
            ->selectRaw('DATE(created_at) as date, SUM(qty_change) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('total', 'date')
            ->toArray();

        $exits = StockMovement::query()
            ->where('created_at', '>=', $since)
            ->whereIn('movement_type', ['exit', 'sale'])
            ->selectRaw('DATE(created_at) as date, ABS(SUM(qty_change)) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('total', 'date')
            ->toArray();

        $labels = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $labels[] = now()->subDays($i)->format('d/m');
        }

        $entryValues = [];
        $exitValues = [];
        foreach ($labels as $i => $_) {
            $date = now()->subDays($days - 1 - $i)->format('Y-m-d');
            $entryValues[] = (int) ($entries[$date] ?? 0);
            $exitValues[] = (int) ($exits[$date] ?? 0);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Entrées',
                    'data' => $entryValues,
                    'backgroundColor' => 'rgba(34, 197, 94, 0.5)',
                    'borderColor' => 'rgb(34, 197, 94)',
                    'fill' => true,
                ],
                [
                    'label' => 'Sorties',
                    'data' => $exitValues,
                    'backgroundColor' => 'rgba(239, 68, 68, 0.5)',
                    'borderColor' => 'rgb(239, 68, 68)',
                    'fill' => true,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
