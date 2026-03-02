<?php

namespace App\Filament\Widgets;

use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MonthlyRevenueComparison extends ChartWidget
{
    protected ?string $heading = 'Comparaison mensuelle du CA';

    protected static ?int $sort = 3;

    protected ?string $maxHeight = '250px';

    protected ?string $pollingInterval = null; // Disable polling — data cached 5min

    /**
     * BEFORE: 72 separate queries (12 months × 2 years × 3 tables).
     * AFTER: 1 single query with conditional aggregation.
     */
    protected function getData(): array
    {
        return Cache::remember('dashboard:monthly_revenue_comparison', 300, function () {
            return $this->buildChartData();
        });
    }

    private function buildChartData(): array
    {
        $now = Carbon::now();
        $startThisYear = $now->copy()->subMonths(11)->startOfMonth();
        $startLastYear = $startThisYear->copy()->subYear();

        // Single UNION query grouped by year-month
        $monthlyData = DB::select("
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') as ym,
                ROUND(SUM(prix_ttc), 2) as total
            FROM (
                SELECT prix_ttc, created_at FROM factures WHERE created_at >= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM facture_tvas WHERE created_at >= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM tickets WHERE created_at >= ?
            ) AS combined
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY ym
        ", [$startLastYear, $startLastYear, $startLastYear]);

        $dataMap = collect($monthlyData)->keyBy('ym');

        $labels = [];
        $thisYear = [];
        $lastYear = [];

        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $sameMonthLastYear = $month->copy()->subYear();

            $labels[] = $month->translatedFormat('M Y');
            $thisYear[] = round((float) ($dataMap[$month->format('Y-m')]->total ?? 0), 2);
            $lastYear[] = round((float) ($dataMap[$sameMonthLastYear->format('Y-m')]->total ?? 0), 2);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Cette année',
                    'data' => $thisYear,
                    'borderColor' => '#3b82f6',
                    'backgroundColor' => 'rgba(59, 130, 246, 0.3)',
                ],
                [
                    'label' => 'Année précédente',
                    'data' => $lastYear,
                    'borderColor' => '#94a3b8',
                    'backgroundColor' => 'rgba(148, 163, 184, 0.3)',
                    'borderDash' => [5, 5],
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}
