<?php

namespace App\Filament\Widgets;

use App\Models\Client;
use App\Models\Commande;
use App\Models\Product;
use App\Services\RevenueService;
use Carbon\Carbon;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

use Livewire\Attributes\On;

class StatsOverview extends BaseWidget
{
    public string $preset = '30_days';

    /**
     * Sync with global dashboard filter (no argument: read from session).
     * Livewire cannot inject primitive $preset when event is dispatched without payload.
     */
    #[On('dashboardFilterUpdated')]
    public function updateFilter(): void
    {
        $sessionPreset = session('dashboard.filter.preset', '30d');
        $this->preset = match ($sessionPreset) {
            '7d' => '7_days',
            '30d' => '30_days',
            '90d' => '90_days',
            'mtd' => 'this_month',
            'last_month' => 'last_month',
            'ytd' => '90_days',
            'all' => '90_days',
            default => '30_days',
        };
    }

    protected static ?int $sort = -97;

    protected int | string | array $columnSpan = 'full';

    // Poll every 60s — data is cached anyway, polling just refreshes the view
    protected ?string $pollingInterval = '60s';

    protected function getStats(): array
    {
        // Sync preset from session so initial load respects global dashboard filter
        $sessionPreset = session('dashboard.filter.preset', '30d');
        $this->preset = match ($sessionPreset) {
            '7d' => '7_days',
            '30d' => '30_days',
            '90d' => '90_days',
            'mtd' => 'this_month',
            'last_month' => 'last_month',
            'ytd' => '90_days',
            'all' => '90_days',
            default => '30_days',
        };

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

        // Current period always ends at end of today
        $end = $now->copy()->endOfDay();

        // ── Revenue (CA) — Policy 1: no double counting ──
        // Boutique: tickets (type=ticket_caisse). Delivery: commandes (etat=expidee). Standalone facture_tvas only.
        $revenueService = app(RevenueService::class);

        $periodRevenue = $revenueService->revenueHt($start, $end);
        $lastPeriodRevenue = $revenueService->revenueHt($lastStart, $lastEnd);
        $todayRevenue = $revenueService->revenueHtToday();

        $revenueGrowth = $lastPeriodRevenue > 0
            ? round((($periodRevenue - $lastPeriodRevenue) / $lastPeriodRevenue) * 100, 1)
            : 0;

        // ── Sparkline: daily CA HT (same policy) ──
        $sparklineDays = $preset === '90_days' ? 30 : ($preset === 'last_month' ? 30 : 7);
        $sparkStart = $now->copy()->subDays($sparklineDays - 1)->startOfDay();
        $dailyHt = $revenueService->dailyRevenueHt($sparkStart, $sparklineDays);
        $dailyChart = array_values($dailyHt);

        // ── Single query for order counts ──
        $orderStats = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN etat IN ('nouvelle_commande', 'en_cours_de_preparation') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN etat = 'expidee' THEN 1 ELSE 0 END) as shipped
            FROM commandes
        ");

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

        $periodTtc = $revenueService->revenueTtc($start, $end);

        $shipped = (int) $orderStats->shipped;
        $totalCommandesDescription = $shipped > 0 ? $shipped . ' expédiées' : 'Total période';

        return [
            Stat::make("Chiffre d'affaires HT ($label)", number_format($periodRevenue, 3, '.', ' ') . ' DT')
                ->description(($revenueGrowth >= 0 ? "+{$revenueGrowth}% " : "{$revenueGrowth}% ") . "vs période précédente · TTC : " . number_format($periodTtc, 0, '.', ' ') . ' DT')
                ->descriptionIcon($revenueGrowth >= 0 ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->chart($dailyChart)
                ->color($revenueGrowth >= 0 ? 'success' : 'danger'),

            Stat::make('Total Produits', $productStats->total)
                ->description($productStats->published . ' publiés')
                ->descriptionIcon('heroicon-m-cube')
                ->color('primary'),

            Stat::make('Total Clients', $clientStats->total)
                ->description($clientStats->period_new . ' nouveaux')
                ->descriptionIcon('heroicon-m-users')
                ->color('success'),

            Stat::make('Total Commandes', $orderStats->total)
                ->description($totalCommandesDescription)
                ->descriptionIcon('heroicon-m-shopping-cart')
                ->color('primary'),
        ];
    }
}
