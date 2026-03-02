<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class GeographicChart extends ChartWidget
{
    protected ?string $heading = 'Top 10 Régions';

    protected static ?int $sort = 6;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
        // Trigger refresh
    }

    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:geographic:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 300, function () use ($period) {
            return $this->buildGeographicData($period);
        });
    }

    private function buildGeographicData(array $period): array
    {
        $topRegions = DB::table('commandes')
            ->whereBetween('created_at', [$period['start'], $period['end']])
            ->whereNotIn('etat', ['annuler'])
            ->whereNotNull('region')
            ->where('region', '!=', '')
            ->selectRaw('
                region,
                COUNT(*) as order_count,
                SUM(prix_ttc) as total_revenue
            ')
            ->groupBy('region')
            ->orderByDesc('order_count')
            ->limit(10)
            ->get();

        $labels = [];
        $data = [];

        foreach ($topRegions as $region) {
            $labels[] = $region->region . ' (' . $region->order_count . ' cmd)';
            $data[] = round($region->total_revenue, 2);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Revenue (DT)',
                    'data' => $data,
                    'backgroundColor' => 'rgba(59, 130, 246, 0.8)',
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
                    'title' => [
                        'display' => true,
                        'text' => 'Revenue (DT)',
                    ],
                ],
            ],
            'plugins' => [
                'legend' => [
                    'display' => false,
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

        return DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);
    }
}
