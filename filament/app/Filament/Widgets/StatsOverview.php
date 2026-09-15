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
    protected string $view = 'filament.widgets.stats-overview';

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    protected static ?int $sort = 4;

    protected static bool $isLazy = true;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm'      => 1,
        'md'      => 2,
        'xl'      => 2,
    ];

    protected ?string $pollingInterval = '60s';

    /**
     * Raw metrics for the period, cached. Both getCards() (the redesigned blade) and getStats()
     * (kept for Filament base-class compatibility) map from this, so the queries run once.
     */
    private function metrics(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:stats_metrics:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 120, function () use ($period) {
            $start = $period['start'];
            $end = $period['end'];
            $prevStart = $period['prev_start'];
            $prevEnd = $period['prev_end'];

            $revenueService = app(RevenueService::class);

            $periodRevenue = $revenueService->revenueHt($start, $end);
            $lastPeriodRevenue = $revenueService->revenueHt($prevStart, $prevEnd);
            $revenueGrowth = $lastPeriodRevenue > 0
                ? round((($periodRevenue - $lastPeriodRevenue) / $lastPeriodRevenue) * 100, 1)
                : 0.0;

            $days = min(30, $start->diffInDays($end) + 1);
            $dailyChart = array_values($revenueService->dailyRevenueHt($start, $days));

            $orderStats = DB::selectOne("
                SELECT
                    COUNT(*) as total,
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

            return [
                'label'            => $period['label'] ?? 'Période',
                'revenue_ht'       => (float) $periodRevenue,
                'revenue_ttc'      => (float) $revenueService->revenueTtc($start, $end),
                'revenue_growth'   => (float) $revenueGrowth,
                'daily_chart'      => $dailyChart,
                'orders_total'     => (int) $orderStats->total,
                'orders_shipped'   => (int) $orderStats->shipped,
                'products_total'   => (int) $productStats->total,
                'products_pub'     => (int) $productStats->published,
                'clients_total'    => (int) $clientStats->total,
                'clients_new'      => (int) $clientStats->period_new,
            ];
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

    private static function nf(float | int $n, int $decimals = 0): string
    {
        return number_format($n, $decimals, '.', ' ');
    }

    /**
     * Redesigned KPI card model consumed by stats-overview.blade.php.
     * Each card: label · value · optional delta pill · context · icon · tone · sparkline.
     */
    public function getCards(): array
    {
        $m = $this->metrics();
        $growth = $m['revenue_growth'];

        return [
            [
                'label'   => "Chiffre d'affaires HT",
                'value'   => self::nf($m['revenue_ht'], 3) . ' DT',
                'delta'   => $growth != 0.0
                    ? ['dir' => $growth > 0 ? 'up' : 'down', 'text' => ($growth > 0 ? '+' : '') . self::nf($growth, 1) . '%']
                    : null,
                'context' => 'vs période préc. · TTC ' . self::nf($m['revenue_ttc']) . ' DT',
                'icon'    => 'heroicon-m-banknotes',
                'tone'    => 'brand',
                'chart'   => $m['daily_chart'],
            ],
            [
                'label'   => 'Commandes',
                'value'   => self::nf($m['orders_total']),
                'delta'   => null,
                'context' => $m['orders_shipped'] > 0
                    ? $m['orders_shipped'] . ' expédiées sur la période'
                    : 'Sur la période sélectionnée',
                'icon'    => 'heroicon-m-shopping-cart',
                'tone'    => 'brand',
                'chart'   => [],
            ],
            [
                'label'   => 'Clients',
                'value'   => self::nf($m['clients_total']),
                'delta'   => $m['clients_new'] > 0 ? ['dir' => 'up', 'text' => '+' . self::nf($m['clients_new'])] : null,
                'context' => 'nouveaux sur la période',
                'icon'    => 'heroicon-m-users',
                'tone'    => 'success',
                'chart'   => [],
            ],
            [
                'label'   => 'Produits',
                'value'   => self::nf($m['products_total']),
                'delta'   => null,
                'context' => self::nf($m['products_pub']) . ' publiés en ligne',
                'icon'    => 'heroicon-m-cube',
                'tone'    => 'neutral',
                'chart'   => [],
            ],
        ];
    }

    /**
     * Kept for Filament base-class compatibility (getColumns() counts these). The redesigned
     * dashboard renders getCards() instead; this is never shown.
     */
    protected function getStats(): array
    {
        $m = $this->metrics();

        return [
            Stat::make("Chiffre d'affaires HT", self::nf($m['revenue_ht'], 3) . ' DT'),
            Stat::make('Commandes', self::nf($m['orders_total'])),
            Stat::make('Clients', self::nf($m['clients_total'])),
            Stat::make('Produits', self::nf($m['products_total'])),
        ];
    }
}
