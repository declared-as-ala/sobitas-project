<?php

namespace App\Filament\Widgets;

use App\Models\Ticket;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RevenueChart extends ChartWidget
{
    protected ?string $heading = 'Chiffre d\'affaires HT (30 derniers jours)';

    protected static bool $isLazy = true;

    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected ?string $maxHeight = '300px';

    protected ?string $pollingInterval = null;

    /**
     * CA Policy 1: Ticket caisse + Commande expidee + Facture TVA standalone only.
     */
    protected function getData(): array
    {
        return Cache::remember('dashboard:revenue_chart_v2', 120, function () {
            return $this->buildChartData();
        });
    }

    private function buildChartData(): array
    {
        $startDate = Carbon::now()->subDays(29)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        $ticketsData = $this->getDailyTotals('tickets', $startDate, "type = '" . Ticket::TYPE_TICKET_CAISSE . "'");
        $commandesData = $this->getDailyTotals('commandes', $startDate, "etat = 'expidee'");
        $invoicesQuery = DB::table('facture_tvas')->whereBetween('created_at', [$startDate, $endDate]);
        if (Schema::hasColumn('facture_tvas', 'source_ticket_id')) {
            $invoicesQuery->whereNull('source_ticket_id');
        }
        if (Schema::hasColumn('facture_tvas', 'commande_id')) {
            $invoicesQuery->whereNull('commande_id');
        }
        $invoicesData = $invoicesQuery
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('ROUND(SUM(prix_ht), 2) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $labels = [];
        for ($i = 29; $i >= 0; $i--) {
            $labels[] = Carbon::now()->subDays($i)->format('d M');
        }

        return [
            'datasets' => [
                [
                    'label' => 'Boutique (tickets caisse)',
                    'data' => $this->mapToOrderedArray($ticketsData),
                    'borderColor' => '#f59e0b',
                    'backgroundColor' => 'rgba(245, 158, 11, 0.1)',
                    'fill' => true,
                ],
                [
                    'label' => 'Commandes expédiées',
                    'data' => $this->mapToOrderedArray($commandesData),
                    'borderColor' => '#ef4444',
                    'backgroundColor' => 'rgba(239, 68, 68, 0.1)',
                    'fill' => true,
                ],
                [
                    'label' => 'Factures TVA (standalone)',
                    'data' => $this->mapToOrderedArray($invoicesData),
                    'borderColor' => '#10b981',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                    'fill' => true,
                ],
            ],
            'labels' => $labels,
        ];
    }

    private function getDailyTotals(string $table, Carbon $startDate, ?string $extraWhere = null): array
    {
        try {
            $query = DB::table($table)
                ->select(DB::raw('DATE(created_at) as day'), DB::raw('ROUND(SUM(prix_ht), 2) as total'))
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
