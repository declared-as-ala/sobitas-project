<?php

namespace App\Filament\Pages;

use App\Filament\Support\DashboardHeaderActions;
use App\Filament\Widgets\DashboardAlertsWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\GeographicChart;
use App\Filament\Widgets\LatestCommandes;
use App\Filament\Widgets\MarketplaceKpis;
use App\Filament\Widgets\MonthlyRevenueComparison;
use App\Filament\Widgets\MultiMetricChart;
use App\Filament\Widgets\RevenueChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\TopCategoriesChart;
use App\Filament\Widgets\TopCustomersTable;
use App\Filament\Widgets\TopProductsWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    use DashboardHeaderActions;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-presentation-chart-line';

    protected static ?string $title = 'Tableau de bord Marketplace';

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
            MultiMetricChart::class,
            TopCategoriesChart::class,
            MonthlyRevenueComparison::class,
            GeographicChart::class,

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
