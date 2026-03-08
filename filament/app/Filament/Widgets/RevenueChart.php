<?php

namespace App\Filament\Widgets;

use App\Models\Ticket;
use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Livewire\Attributes\On;

class RevenueChart extends ChartWidget
{
    protected static bool $isLazy = true;

    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected ?string $maxHeight = '300px';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    public function getHeading(): ?string
    {
        $period = $this->getCurrentPeriod();
        $label = $period['label'] ?? 'Période';

        return "Chiffre d'affaires HT ({$label})";
    }

    /**
     * CA Policy 1: Ticket caisse + Commande expidee + Facture TVA standalone only.
     */
    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:revenue_chart_v2:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 120, function () use ($period) {
            return $this->buildChartData($period);
        });
    }

    private function buildChartData(array $period): array
    {
        $startDate = $period['start'];
        $endDate = $period['end'];

        $ticketsData = $this->getDailyTotals('tickets', $startDate, $endDate, "type = '" . Ticket::TYPE_TICKET_CAISSE . "'");
        $commandesData = $this->getDailyTotals('commandes', $startDate, $endDate, "etat = 'expidee'");
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
        $days = [];
        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            $labels[] = $current->format('d M');
            $days[] = $current->format('Y-m-d');
            $current->addDay();
        }

        return [
            'datasets' => [
                [
                    'label' => 'Boutique (tickets caisse)',
                    'data' => $this->mapToOrderedArray($days, $ticketsData),
                    'borderColor' => '#f59e0b',
                    'backgroundColor' => 'rgba(245, 158, 11, 0.1)',
                    'fill' => true,
                ],
                [
                    'label' => 'Commandes expédiées',
                    'data' => $this->mapToOrderedArray($days, $commandesData),
                    'borderColor' => '#ef4444',
                    'backgroundColor' => 'rgba(239, 68, 68, 0.1)',
                    'fill' => true,
                ],
                [
                    'label' => 'Factures TVA (standalone)',
                    'data' => $this->mapToOrderedArray($days, $invoicesData),
                    'borderColor' => '#10b981',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                    'fill' => true,
                ],
            ],
            'labels' => $labels,
        ];
    }

    private function getDailyTotals(string $table, Carbon $startDate, Carbon $endDate, ?string $extraWhere = null): array
    {
        try {
            $query = DB::table($table)
                ->select(DB::raw('DATE(created_at) as day'), DB::raw('ROUND(SUM(prix_ht), 2) as total'))
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy(DB::raw('DATE(created_at)'));

            if ($extraWhere) {
                $query->whereRaw($extraWhere);
            }

            return $query->pluck('total', 'day')->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function mapToOrderedArray(array $days, array $dailyTotals): array
    {
        $result = [];
        foreach ($days as $key) {
            $result[] = round((float) ($dailyTotals[$key] ?? 0), 2);
        }

        return $result;
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

    protected function getType(): string
    {
        return 'line';
    }
}
