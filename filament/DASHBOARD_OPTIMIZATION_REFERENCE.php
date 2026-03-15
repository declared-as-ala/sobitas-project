<?php
/**
 * DASHBOARD OPTIMIZATION - Critical Widget Updates
 * 
 * Apply these changes to optimize dashboard rendering
 * File: app/Filament/Pages/Dashboard.php
 */

namespace App\Filament\Pages;

use App\Filament\Support\DashboardHeaderActions;
use App\Filament\Widgets\DashboardAlertsWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\GeographicChart;
use App\Filament\Widgets\LatestCommandes;
use App\Filament\Widgets\MarketplaceKpis;
use App\Filament\Widgets\MonthlyRevenueComparison;
use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\RevenueBySourcePieChart;
use App\Filament\Widgets\RevenueChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\TopCategoriesChart;
use App\Filament\Widgets\TopCustomersTable;
use App\Filament\Widgets\TopProductsWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    use DashboardHeaderActions;

    protected $queryString = [
        'preset' => ['as' => 'period', 'except' => '30d'],
    ];

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-presentation-chart-line';
    protected static ?string $title = 'Tableau de bord Marketplace';

    public function mount(): void
    {
        $period = request()->query('period');
        if ($period !== null && $period !== '') {
            session(['dashboard.filter.preset' => $period]);
            $this->preset = $period;
        } else {
            $this->preset = session('dashboard.filter.preset', '30d');
        }
        if (!request()->has('period')) {
            $this->redirect($this->getDashboardUrlWithPeriod($this->preset), navigate: true);
        }
    }

    /**
     * OPTIMIZATION: Header widgets are sync-rendered (must be as fast as possible)
     */
    public function getHeaderWidgets(): array
    {
        return [
            \App\Filament\Widgets\ClientHistoriqueSearchWidget::class,
            DashboardHeaderWidget::class,
        ];
    }

    /**
     * OPTIMIZATION: Main widgets are organized in two groups:
     * 1. SYNC (render immediately)
     * 2. DEFERRED (render after page load via lazy loading)
     * 
     * This ensures dashboard is interactive ASAP, then details load async.
     */
    public function getWidgets(): array
    {
        return [
            // ════════════════════════════════════════════════════════════
            // SYNC WIDGETS (< 200ms each, optional: no N queries)
            // Render immediately so user sees dashboard instantly
            // ════════════════════════════════════════════════════════════
            
            QuickActionsWidget::class,           // Buttons only (no queries)
            DashboardAlertsWidget::class,        // Minimal alerts

            // ════════════════════════════════════════════════════════════
            // DEFERRED WIDGETS (lazy=true, render after page interactive)
            // These load in background after page ready event fires
            // ════════════════════════════════════════════════════════════
            
            StatsOverview::class,                // Caches 4 KPI calculations
            MarketplaceKpis::class,              // Caches marketplace metrics
            
            RevenueChart::class,                 // ✅ Has isLazy=true
            TopCategoriesChart::class,           // ✅ Has isLazy=true
            MonthlyRevenueComparison::class,     // ✅ Has isLazy=true
            GeographicChart::class,              // ✅ Has isLazy=true
            
            RevenueBySourcePieChart::class,      // Cached
            
            LatestCommandes::class,              // ✅ Deferred, lazy
            TopProductsWidget::class,            // ✅ Deferred, lazy
            TopCustomersTable::class,            // ✅ Deferred, lazy
        ];
    }

    /**
     * PERFORMANCE TIP: Use layout columns to organize deferred widgets
     * This improves perceived performance by grouping related items
     */
    public function getColumns(): int | string | array
    {
        return [
            'md' => 2,
            'xl' => 3,
            'lg' => 2,
        ];
    }
}

?>
