<?php

namespace App\Filament\Widgets;

use App\Models\Client;
use App\Models\Commande;
use App\Models\Product;
use Carbon\Carbon;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

use Livewire\Attributes\On;

class StatsOverview extends BaseWidget
{
    public string $preset = '30_days';

    #[On('dashboardFilterUpdated')]
    public function updateFilter(string $preset): void
    {
        $this->preset = $preset;
        // The component will re-render and getStats will be called
    }

    protected static ?int $sort = -97;

    protected int | string | array $columnSpan = 'full';

    // Poll every 60s — data is cached anyway, polling just refreshes the view
    protected ?string $pollingInterval = '60s';

    protected function getStats(): array
    {
        // Cache for 2 minutes — dashboard stats don't need real-time precision
        // Use preset in cache key so different filters have different cached results
        return Cache::remember("dashboard:stats_overview:{$this->preset}", 120, function () {
            return $this->buildStats($this->preset);
        });
    }

    private function buildStats(string $preset): array
    {
        $now = Carbon::now();
        
        // Define ranges based on preset
        switch ($preset) {
            case '7_days':
                $start = $now->copy()->subDays(6)->startOfDay();
                $lastStart = $now->copy()->subDays(13)->startOfDay();
                $lastEnd = $now->copy()->subDays(7)->endOfDay();
                $label = "7 jours";
                break;
            case '90_days':
                $start = $now->copy()->subDays(89)->startOfDay();
                $lastStart = $now->copy()->subDays(179)->startOfDay();
                $lastEnd = $now->copy()->subDays(90)->endOfDay();
                $label = "90 jours";
                break;
            case 'this_month':
                $start = $now->copy()->startOfMonth();
                $lastStart = $now->copy()->subMonth()->startOfMonth();
                $lastEnd = $now->copy()->subMonth()->endOfMonth();
                $label = "ce mois";
                break;
            case 'last_month':
                $start = $now->copy()->subMonth()->startOfMonth();
                $lastStart = $now->copy()->subMonths(2)->startOfMonth();
                $lastEnd = $now->copy()->subMonths(2)->endOfMonth();
                $label = "mois dernier";
                break;
            case '30_days':
            default:
                $start = $now->copy()->subDays(29)->startOfDay();
                $lastStart = $now->copy()->subDays(59)->startOfDay();
                $lastEnd = $now->copy()->subDays(30)->endOfDay();
                $label = "30 jours";
                break;
        }

        // ── Single query for all revenue data (period, previous period, today) ──
        // Uses conditional aggregation instead of 6+ separate queries
        $revenue = DB::selectOne("
            SELECT
                COALESCE(SUM(CASE WHEN created_at >= ? THEN prix_ttc ELSE 0 END), 0) as period_revenue,
                COALESCE(SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN prix_ttc ELSE 0 END), 0) as last_period_revenue,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN prix_ttc ELSE 0 END), 0) as today_revenue
            FROM (
                SELECT prix_ttc, created_at FROM factures WHERE created_at >= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM facture_tvas WHERE created_at >= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM tickets WHERE created_at >= ?
            ) AS combined_revenue
        ", [
            $start, $lastStart, $lastEnd,
            $lastStart, $lastStart, $lastStart,
        ]);

        $periodRevenue = (float) $revenue->period_revenue;
        $lastPeriodRevenue = (float) $revenue->last_period_revenue;
        $todayRevenue = (float) $revenue->today_revenue;

        $revenueGrowth = $lastPeriodRevenue > 0
            ? round((($periodRevenue - $lastPeriodRevenue) / $lastPeriodRevenue) * 100, 1)
            : 0;

        // ── Sparkline based on the selected period (max 30 days for visual clarity) ──
        $sparklineDays = $preset === '90_days' ? 30 : ($preset === 'last_month' ? 30 : 7);
        $dailyData = DB::select("
            SELECT
                DATE(created_at) as day,
                SUM(prix_ttc) as daily_total
            FROM (
                SELECT prix_ttc, created_at FROM factures WHERE created_at >= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM facture_tvas WHERE created_at >= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM tickets WHERE created_at >= ?
            ) AS combined
            GROUP BY DATE(created_at)
            ORDER BY day
        ", [
            $now->copy()->subDays($sparklineDays - 1)->startOfDay(),
            $now->copy()->subDays($sparklineDays - 1)->startOfDay(),
            $now->copy()->subDays($sparklineDays - 1)->startOfDay(),
        ]);

        // Build sparkline array, filling gaps with 0
        $dailyMap = collect($dailyData)->keyBy('day');
        $dailyChart = [];
        for ($i = $sparklineDays - 1; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i)->format('Y-m-d');
            $dailyChart[] = (float) ($dailyMap[$date]->daily_total ?? 0);
        }

        // ── Single query for order counts ──
        $orderStats = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN etat IN ('nouvelle_commande', 'en_cours_de_preparation') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN etat = 'expidee' THEN 1 ELSE 0 END) as shipped
            FROM commandes
        ");

        $pendingCommandes = (int) $orderStats->pending;

        // ── Single query for product counts ──
        $productStats = DB::selectOne("
            SELECT COUNT(*) as total, SUM(CASE WHEN publier = 1 THEN 1 ELSE 0 END) as published
            FROM products
        ");

        // ── Single query for client counts ──
        $clientStats = DB::selectOne("
            SELECT COUNT(*) as total, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as period_new
            FROM clients
        ", [$start]);

        return [
            Stat::make("Chiffre d'affaires ($label)", number_format($periodRevenue, 3, '.', ' ') . ' DT')
                ->description($revenueGrowth >= 0 ? "+{$revenueGrowth}% vs période précédente" : "{$revenueGrowth}% vs période précédente")
                ->descriptionIcon($revenueGrowth >= 0 ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->chart($dailyChart)
                ->color($revenueGrowth >= 0 ? 'success' : 'danger'),

            Stat::make("Chiffre d'affaires (aujourd'hui)", number_format($todayRevenue, 3, '.', ' ') . ' DT')
                ->description("Aujourd'hui")
                ->descriptionIcon('heroicon-m-calendar')
                ->color('info'),

            Stat::make('Commandes en attente', $pendingCommandes)
                ->description('Nouvelles + Préparation')
                ->descriptionIcon('heroicon-m-clock')
                ->color($pendingCommandes > 0 ? 'warning' : 'success'),

            Stat::make('Total Produits', $productStats->total)
                ->description($productStats->published . ' publiés')
                ->descriptionIcon('heroicon-m-cube')
                ->color('primary'),

            Stat::make('Total Clients', $clientStats->total)
                ->description($clientStats->period_new . ' nouveaux')
                ->descriptionIcon('heroicon-m-users')
                ->color('success'),

            Stat::make('Total Commandes', $orderStats->total)
                ->description($orderStats->shipped . ' expédiées')
                ->descriptionIcon('heroicon-m-shopping-cart')
                ->color('primary'),
        ];
    }
}
