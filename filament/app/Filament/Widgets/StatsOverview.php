<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use App\Services\RevenueService;
use Carbon\Carbon;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class StatsOverview extends BaseWidget
{
    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    protected static ?int $sort = 22;

    protected static bool $isLazy = true;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = '60s';

    protected function getStats(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:stats_overview:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 120, function () use ($period) {
            return $this->buildStats($period);
        });
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

    private function buildStats(array $period): array
    {
        $start = $period['start'];
        $end = $period['end'];
        $prevStart = $period['prev_start'];
        $prevEnd = $period['prev_end'];
        $label = $period['label'] ?? 'Période';

        $revenueService = app(RevenueService::class);

        $periodRevenue = $revenueService->revenueHt($start, $end);
        $lastPeriodRevenue = $revenueService->revenueHt($prevStart, $prevEnd);

        $revenueGrowth = $lastPeriodRevenue > 0
            ? round((($periodRevenue - $lastPeriodRevenue) / $lastPeriodRevenue) * 100, 1)
            : 0;

        $days = min(30, $start->diffInDays($end) + 1);
        $dailyHt = $revenueService->dailyRevenueHt($start, $days);
        $dailyChart = array_values($dailyHt);

        $orderStats = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN etat IN ('nouvelle_commande', 'en_cours_de_preparation') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN etat = 'expidee' THEN 1 ELSE 0 END) as shipped
            FROM commandes
            WHERE created_at BETWEEN ? AND ?
        ", [$start, $end]);

        $productStats = DB::selectOne("
            SELECT COUNT(*) as total, SUM(CASE WHEN publier = 1 THEN 1 ELSE 0 END) as published
            FROM products
        ");

        $clientStats = DB::selectOne("
            SELECT COUNT(*) as total, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as period_new
            FROM clients
        ", [$start]);

        $periodTtc = $revenueService->revenueTtc($start, $end);

        $shipped = (int) $orderStats->shipped;
        $totalCommandesDescription = $shipped > 0 ? $shipped . ' expédiées' : 'Total période';

        return [
            Stat::make("Chiffre d'affaires HT ({$label})", number_format($periodRevenue, 3, '.', ' ') . ' DT')
                ->description(($revenueGrowth >= 0 ? "+{$revenueGrowth}% " : "{$revenueGrowth}% ") . "vs période précédente · TTC : " . number_format($periodTtc, 0, '.', ' ') . ' DT')
                ->descriptionIcon($revenueGrowth >= 0 ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->chart($dailyChart)
                ->color($revenueGrowth >= 0 ? 'success' : 'danger'),

            Stat::make('Total Produits', $productStats->total)
                ->description($productStats->published . ' publiés')
                ->descriptionIcon('heroicon-m-cube')
                ->color('primary'),

            Stat::make('Total Clients', $clientStats->total)
                ->description($clientStats->period_new . ' nouveaux (période)')
                ->descriptionIcon('heroicon-m-users')
                ->color('success'),

            Stat::make('Total Commandes (période)', $orderStats->total)
                ->description($totalCommandesDescription)
                ->descriptionIcon('heroicon-m-shopping-cart')
                ->color('primary'),
        ];
    }
}
