<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\DashboardAlertsWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\GeographicChart;
use App\Filament\Widgets\LatestCommandes;
use App\Filament\Widgets\MarketplaceKpis;
use App\Filament\Widgets\MonthlyRevenueComparison;
use App\Filament\Widgets\OrdersStatusPieChart;
use App\Filament\Widgets\ProductsStockPieChart;
use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\TopCategoriesListWidget;
use App\Filament\Widgets\RevenueByCategoryPieChart;
use App\Filament\Widgets\RevenueChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\TopCategoriesChart;
use App\Filament\Widgets\TopCustomersTable;
use App\Filament\Widgets\TopProductsWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-presentation-chart-line';

    protected static ?string $title = 'Tableau de bord Marketplace';

    /**
     * Sync period from URL to session so all widgets use the same filter.
     * Ensures URL is the source of truth when present (persists after refresh/Actualiser).
     */
    public function mount(): void
    {
        $period = request()->query('period');
        if ($period !== null && $period !== '') {
            session(['dashboard.filter.preset' => $period]);
        }
        if (! request()->has('period')) {
            $preset = session('dashboard.filter.preset', '30d');
            $this->redirect(request()->fullUrlWithQuery(['period' => $preset]), navigate: true);
        }
    }

    public function getHeaderWidgets(): array
    {
        return [
            \App\Filament\Widgets\ClientHistoriqueSearchWidget::class,
            DashboardHeaderWidget::class,
        ];
    }

    public function getWidgets(): array
    {
        return [
            QuickActionsWidget::class,
            DashboardAlertsWidget::class,

            StatsOverview::class,
            MarketplaceKpis::class,

            RevenueChart::class,
            TopCategoriesChart::class,
            MonthlyRevenueComparison::class,
            GeographicChart::class,

            // Section Analyses — camemberts + listes (7j/30j/90j via filtre global)
            OrdersStatusPieChart::class,
            RevenueByCategoryPieChart::class,
            TopCategoriesListWidget::class,
            ProductsStockPieChart::class,

            LatestCommandes::class,
            TopProductsWidget::class,
            TopCustomersTable::class,
        ];
    }

    public function getColumns(): int | array
    {
        return 2; // 2-column grid
    }
}
