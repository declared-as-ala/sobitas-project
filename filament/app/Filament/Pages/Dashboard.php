<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\ClientHistoriqueSearchWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\GeographicChart;
use App\Filament\Widgets\MarketplaceKpis;
use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\RevenueBySourcePieChart;
use App\Filament\Widgets\RevenueChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\StatusCardsWidget;
use App\Filament\Widgets\TopCustomersTable;
use App\Filament\Widgets\TopProductsWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-presentation-chart-line';

    protected static ?string $title = 'Tableau de bord Marketplace';

    /**
     * On first load, sync ?period= from URL into session so DashboardHeaderWidget
     * picks it up. No redirect — DashboardHeaderWidget owns the filter state entirely.
     */
    public function mount(): void
    {
        $period = request()->query('period');
        if ($period !== null && $period !== '') {
            session(['dashboard.filter.preset' => $period]);
        }
    }

    public function getHeaderWidgets(): array
    {
        // Empty: DashboardHeaderWidget lives in getWidgets() at sort=-100
        // so it stays in the same stable Livewire widget grid as everything else.
        return [];
    }

    public function getWidgets(): array
    {
        return [
            DashboardHeaderWidget::class,        // sort=-100 — Filter bar (always first)
            QuickActionsWidget::class,           // sort=5    — Actions Rapides
            StatsOverview::class,               // sort=6    — KPIs financiers (full)
            MarketplaceKpis::class,             // sort=8    — KPIs commandes (col=1) ─┐ side-by-side
            RevenueBySourcePieChart::class,     // sort=9    — Répartition CA (col=1)  ─┘
            StatusCardsWidget::class,           // sort=20   — Statuts temps réel (full)
            ClientHistoriqueSearchWidget::class, // sort=25   — Recherche client (full)
            RevenueChart::class,                // sort=40   — Graphique CA (full)
            TopProductsWidget::class,           // sort=50   — Top produits
            GeographicChart::class,             // sort=60   — Géographie (full)
            TopCustomersTable::class,           // sort=80   — Top clients (full)
        ];
    }

    public function getColumns(): int | array
    {
        return 2;
    }
}
