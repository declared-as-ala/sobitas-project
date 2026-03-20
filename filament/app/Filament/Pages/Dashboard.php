<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\ClientHistoriqueSearchWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\MarketplaceKpis;
use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\RevenueBySourcePieChart;
use App\Filament\Widgets\RevenueChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\TopProductsWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-presentation-chart-line';

    protected static ?string $title = 'Tableau de bord';

    /**
     * Kept as a public property so that stale Livewire browser snapshots
     * (from sessions before the DashboardHeaderActions trait was removed) can
     * still call $set('preset', ...) without throwing a
     * "Public property not found" exception.  It is intentionally unused —
     * the real source of truth is session('dashboard.filter.preset'),
     * managed entirely by DashboardHeaderWidget.
     */
    public string $preset = '30d';

    public function mount(): void
    {
        $period = request()->query('period');
        if ($period !== null && $period !== '') {
            session(['dashboard.filter.preset' => $period]);
        }
    }

    public function getHeaderWidgets(): array
    {
        return [];
    }

    public function getWidgets(): array
    {
        return [
            QuickActionsWidget::class,          // sort=-200  — Action buttons (very top)
            ClientHistoriqueSearchWidget::class, // sort=-150  — Client search
            DashboardHeaderWidget::class,       // sort=-100  — Period filter
            StatsOverview::class,              // sort=4     — 4 KPI cards
            RevenueChart::class,               // sort=5     — Évolution des ventes (col=1)
            RevenueBySourcePieChart::class,    // sort=6     — Répartition par source (col=1)
            TopProductsWidget::class,          // sort=7     — Top 5 produits (full)
            MarketplaceKpis::class,            // sort=8     — Nouvelles commandes / Clients / Produits
        ];
    }

    public function getColumns(): int | array
    {
        return 2;
    }
}
