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

    // ── Stale-snapshot compatibility shims ──────────────────────────────────
    // Old browser sessions may still hold Livewire snapshots where these
    // properties/methods belonged to the Dashboard page (before the widget
    // split). Keeping them as no-ops prevents "property/method not found"
    // exceptions without re-introducing the old double-dispatch bugs.
    public string  $preset      = '30d';
    public ?string $tel         = null;
    public ?string $name        = null;
    public bool    $isRefreshing = false;
    public bool    $isExporting  = false;

    public function searchHistorique(): void {}
    public function clearHistorique(): void {}
    public function refreshStats(): void {}
    // ────────────────────────────────────────────────────────────────────────

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
            StatsOverview::class,              // sort=4     — 4 KPI cards (CA, Produits, Clients, Commandes)
            MarketplaceKpis::class,            // sort=5     — Commandes / Nouveaux Clients KPI cards
            RevenueChart::class,               // sort=6     — Évolution des ventes (bar, full-width)
            RevenueBySourcePieChart::class,    // sort=7     — Répartition par source (col=1)
            TopProductsWidget::class,          // sort=8     — Top 5 produits (full)
        ];
    }

    public function getColumns(): int | array
    {
        return 2;
    }
}
