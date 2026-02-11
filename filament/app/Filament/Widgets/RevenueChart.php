<?php

namespace App\Filament\Widgets;

use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RevenueChart extends ChartWidget
{
    protected ?string $heading = 'Chiffre d\'affaires (30 derniers jours)';

    protected static bool $isLazy = true;

    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected ?string $maxHeight = '300px';

    protected ?string $pollingInterval = null; // Disable polling — data cached 2min, no need for auto-refresh

    /**
     * BEFORE: 120 separate queries (30 days × 4 tables).
     * AFTER: 4 queries total, one per revenue source, grouped by date.
     */
    protected function getData(): array
    {
        return Cache::remember('dashboard:revenue_chart', 120, function () {
            return $this->buildChartData();
        });
    }

    private function buildChartData(): array
    {
        $startDate = Carbon::now()->subDays(29)->startOfDay();

        // One query per source, grouped by day — 4 queries total instead of 120
        $facturesData = $this->getDailyTotals('factures', $startDate);
        $factureTvasData = $this->getDailyTotals('facture_tvas', $startDate);
        $ticketsData = $this->getDailyTotals('tickets', $startDate);
        $commandesData = $this->getDailyTotals('commandes', $startDate, "etat = 'expidee'");

        // Build labels and data arrays
        $labels = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $key = $date->format('Y-m-d');
            $labels[] = $date->format('d M');
        }

        return [
            'datasets' => [
                [
                    'label' => 'Bons de Livraison',
                    'data' => $this->mapToOrderedArray($facturesData),
                    'borderColor' => '#3b82f6',
                    'backgroundColor' => 'rgba(59, 130, 246, 0.1)',
                    'fill' => true,
                ],
                [
                    'label' => 'Factures TVA',
                    'data' => $this->mapToOrderedArray($factureTvasData),
                    'borderColor' => '#10b981',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                    'fill' => true,
                ],
                [
                    'label' => 'Tickets',
                    'data' => $this->mapToOrderedArray($ticketsData),
                    'borderColor' => '#f59e0b',
                    'backgroundColor' => 'rgba(245, 158, 11, 0.1)',
                    'fill' => true,
                ],
                [
                    'label' => 'Commandes',
                    'data' => $this->mapToOrderedArray($commandesData),
                    'borderColor' => '#ef4444',
                    'backgroundColor' => 'rgba(239, 68, 68, 0.1)',
                    'fill' => true,
                ],
            ],
            'labels' => $labels,
        ];
    }

    /**
     * Single query with GROUP BY date instead of 30 individual queries.
     */
    private function getDailyTotals(string $table, Carbon $startDate, ?string $extraWhere = null): array
    {
        try {
            $query = DB::table($table)
                ->select(DB::raw('DATE(created_at) as day'), DB::raw('ROUND(SUM(prix_ttc), 2) as total'))
                ->where('created_at', '>=', $startDate)
                ->groupBy(DB::raw('DATE(created_at)'));

            if ($extraWhere) {
                $query->whereRaw($extraWhere);
            }

            return $query->pluck('total', 'day')->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Maps date-keyed totals to an ordered array for last 30 days.
     */
    private function mapToOrderedArray(array $dailyTotals): array
    {
        $result = [];
        for ($i = 29; $i >= 0; $i--) {
            $key = Carbon::now()->subDays($i)->format('Y-m-d');
            $result[] = round((float) ($dailyTotals[$key] ?? 0), 2);
        }
        return $result;
    }

    protected function getType(): string
    {
        return 'line';
    }
}
