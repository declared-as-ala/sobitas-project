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

    protected static ?int $sort = 6;

    protected int | string | array $columnSpan = 'full';

    protected ?string $maxHeight = '320px';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    public function getHeading(): ?string
    {
        $period = $this->getCurrentPeriod();
        $label = $period['label'] ?? 'Période';

        return "Évolution des ventes ({$label})";
    }

    /**
     * CA Policy: Ticket caisse + Bon de livraison + Facture TVA standalone only.
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
        $endDate   = $period['end'];

        $ticketsData  = $this->getDailyTotals('tickets', $startDate, $endDate, "type = '" . Ticket::TYPE_TICKET_CAISSE . "'");
        $blsData      = $this->getDailyTotals('factures', $startDate, $endDate);

        $invoicesQuery = DB::table('facture_tvas')->whereBetween('created_at', [$startDate, $endDate]);
        if (Schema::hasColumn('facture_tvas', 'source_ticket_id')) {
            $invoicesQuery->whereNull('source_ticket_id');
        }
        if (Schema::hasColumn('facture_tvas', 'commande_id')) {
            $invoicesQuery->whereNull('commande_id');
        }
        if (Schema::hasColumn('facture_tvas', 'facture_id')) {
            $invoicesQuery->whereNull('facture_id');
        }
        $invoicesData = $invoicesQuery
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('ROUND(SUM(prix_ht), 2) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $labels = [];
        $days   = [];
        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            $labels[] = $current->format('d M');
            $days[]   = $current->format('Y-m-d');
            $current->addDay();
        }

        // Merge all sources into one combined total per day
        $totals = [];
        foreach ($days as $day) {
            $totals[] = round(
                (float) ($ticketsData[$day] ?? 0)
                + (float) ($blsData[$day]     ?? 0)
                + (float) ($invoicesData[$day] ?? 0),
                2
            );
        }

        return [
            'datasets' => [
                [
                    'label'           => 'Ventes HT (DT)',
                    'data'            => $totals,
                    'backgroundColor' => 'rgba(59, 130, 246, 0.65)',
                    'borderColor'     => '#2563eb',
                    'borderWidth'     => 1,
                    'borderRadius'    => 4,
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
        return 'bar';
    }
}
