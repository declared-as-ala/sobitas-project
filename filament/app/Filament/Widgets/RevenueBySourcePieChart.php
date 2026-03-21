<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use App\Services\RevenueService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Livewire\Attributes\On;

class RevenueBySourcePieChart extends ChartWidget
{
    protected ?string $heading = 'Répartition du chiffre d\'affaires HT';

    protected static bool $isLazy = true;

    protected static ?int $sort = 5;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm'      => 1,
        'md'      => 1,
        'xl'      => 1,
    ];

    protected ?string $maxHeight = '320px';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:revenue_by_source_pie:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 180, function () use ($period) {
            $rows = app(RevenueService::class)->revenueSourcesHt($period['start'], $period['end']);
            $total = array_sum($rows);

            $labels = [];
            $data = [];
            $map = [
                'tickets' => 'Tickets caisse',
                'bls' => 'Bons de livraison',
                'facture_tvas' => 'Factures TVA standalone',
            ];

            foreach ($map as $key => $label) {
                $value = round((float) ($rows[$key] ?? 0), 3);
                if ($value <= 0) {
                    continue;
                }

                $pct = $total > 0 ? round(($value / $total) * 100, 1) : 0;
                $labels[] = $label . ' — ' . number_format($value, 3, ',', ' ') . ' DT (' . $pct . ' %)';
                $data[] = $value;
            }

            return [
                'datasets' => [[
                    'data' => $data,
                    'backgroundColor' => [
                        'rgba(245, 158, 11, 0.85)',
                        'rgba(239, 68, 68, 0.85)',
                        'rgba(16, 185, 129, 0.85)',
                    ],
                    'borderWidth' => 1,
                    'hoverOffset' => 4,
                ]],
                'labels' => $labels,
            ];
        });
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

    private function getCurrentPeriod(): array
    {
        $preset = session('dashboard.filter.preset', '30d');
        $customStart = session('dashboard.filter.custom_start')
            ? Carbon::parse(session('dashboard.filter.custom_start'))
            : null;
        $customEnd = session('dashboard.filter.custom_end')
            ? Carbon::parse(session('dashboard.filter.custom_end'))
            : null;

        $result = DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);

        return [
            'start' => $result['start'],
            'end' => $result['end'],
        ];
    }
}
