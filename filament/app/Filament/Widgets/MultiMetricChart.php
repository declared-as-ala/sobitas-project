<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Livewire\Attributes\On;

class MultiMetricChart extends ChartWidget
{
    protected ?string $heading = 'Métriques Multi-Axes';

    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
        // Trigger data refresh
    }

    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:multi_metric_chart:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 120, function () use ($period) {
            return $this->buildChartData($period);
        });
    }

    private function buildChartData(array $period): array
    {
        $labels = [];
        $revenueData = [];
        $ordersData = [];
        $aovData = [];
        $refundsData = [];

        // Runtime check for column existence
        $hasRefundColumn = Schema::hasColumn('commandes', 'refund_amount');

        // Build robust SQL query
        // 1. Handle missing/null 'etat' safely safely using COALESCE
        // 2. Only include refund_amount if the column exists
        $selectQuery = "
            DATE(created_at) as date,
            COUNT(*) as orders_count,
            SUM(CASE WHEN COALESCE(etat, '') != ? THEN prix_ttc ELSE 0 END) as revenue,
            SUM(CASE WHEN COALESCE(etat, '') != ? THEN 1 ELSE 0 END) as paid_orders
        ";

        if ($hasRefundColumn) {
            $selectQuery .= ", SUM(COALESCE(refund_amount, 0)) as refunds";
        } else {
            // If column doesn't exist, we don't query it at all
            // We'll handle the zeroing in the PHP loop below
        }

        // Get daily data
        $dailyStats = DB::table('commandes')
            ->selectRaw($selectQuery, ['annuler', 'annuler'])
            ->whereBetween('created_at', [$period['start'], $period['end']])
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Fill all dates in range
        $current = $period['start']->copy();
        while ($current->lte($period['end'])) {
            $dateKey = $current->format('Y-m-d');
            $labels[] = $current->format('d/m');

            $stat = $dailyStats[$dateKey] ?? null;

            $revenue = $stat ? (float) $stat->revenue : 0;
            $orders = $stat ? (int) $stat->paid_orders : 0;
            
            // Safe access to refunds property, defaults to 0 if column didn't exist or no data
            $refunds = ($hasRefundColumn && $stat) ? (float) ($stat->refunds ?? 0) : 0;
            
            $aov = $orders > 0 ? round($revenue / $orders, 2) : 0;

            $revenueData[] = round($revenue, 2);
            $ordersData[] = $orders;
            $aovData[] = $aov;
            $refundsData[] = round($refunds, 2);

            $current->addDay();
        }

        return [
            'datasets' => [
                [
                    'label' => 'Revenue (DT)',
                    'data' => $revenueData,
                    'borderColor' => '#3b82f6',
                    'backgroundColor' => 'rgba(59, 130, 246, 0.1)',
                    'yAxisID' => 'y',
                    'tension' => 0.3,
                ],
                [
                    'label' => 'Commandes',
                    'data' => $ordersData,
                    'borderColor' => '#10b981',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                    'yAxisID' => 'y1',
                    'tension' => 0.3,
                ],
                [
                    'label' => 'Panier Moyen (DT)',
                    'data' => $aovData,
                    'borderColor' => '#f59e0b',
                    'backgroundColor' => 'rgba(245, 158, 11, 0.1)',
                    'yAxisID' => 'y',
                    'tension' => 0.3,
                ],
                [
                    'label' => 'Remboursements (DT)',
                    'data' => $refundsData,
                    'borderColor' => '#ef4444',
                    'backgroundColor' => 'rgba(239, 68, 68, 0.2)',
                    'fill' => true,
                    'yAxisID' => 'y',
                    'tension' => 0.3,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    protected function getOptions(): array
    {
        return [
            'scales' => [
                'y' => [
                    'type' => 'linear',
                    'display' => true,
                    'position' => 'left',
                    'title' => [
                        'display' => true,
                        'text' => 'Revenue / AOV (DT)',
                    ],
                ],
                'y1' => [
                    'type' => 'linear',
                    'display' => true,
                    'position' => 'right',
                    'title' => [
                        'display' => true,
                        'text' => 'Commandes',
                    ],
                    'grid' => [
                        'drawOnChartArea' => false,
                    ],
                ],
            ],
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

        return DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);
    }
}
