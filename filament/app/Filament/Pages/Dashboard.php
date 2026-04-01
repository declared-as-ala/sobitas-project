<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\ClientHistoriqueSearchWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\RevenueBySourcePieChart;
use App\Filament\Widgets\RevenueChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\TopProductsWidget;
use App\Filament\Widgets\TopRegionsWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-presentation-chart-line';

    protected static ?string $title = '';

    protected static ?string $navigationLabel = 'Tableau de bord';

    public function getHeading(): string
    {
        return '';
    }

    // ── Stale-snapshot shims (see ClientHistoriqueSearchWidget for real search) ─
    public string $preset = '30d';

    public ?string $tel = null;

    public ?string $name = null;

    public bool $isRefreshing = false;

    public bool $isExporting = false;

    /** @deprecated Old browser snapshots only */
    public function searchHistorique(): void {}

    /** @deprecated Old browser snapshots only */
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
            QuickActionsWidget::class,           // sort=-200 — Action buttons (very top)
            ClientHistoriqueSearchWidget::class,  // sort=-150 — Client search
            DashboardHeaderWidget::class,        // sort=-100 — Period filter
            StatsOverview::class,               // sort=4    — 4 KPI cards (span=2 of 3 cols)
            RevenueBySourcePieChart::class,     // sort=5    — Répartition HT (span=1, same row)
            RevenueChart::class,                // sort=6    — Évolution des ventes (full-width)
            TopProductsWidget::class,           // sort=8    — Top Produits table (full-width)
            TopRegionsWidget::class,            // sort=9    — Top Régions + Top Clients (full-width)
        ];
    }

    public function getColumns(): int | array
    {
        return [
            'default' => 1,
            'sm'      => 1,
            'md'      => 3,
            'xl'      => 3,
        ];
    }
}
