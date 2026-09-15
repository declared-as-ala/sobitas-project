<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\ClientHistoriqueSearchWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\LatestCommandes;
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
        // ── TRIMMED so the dashboard actually LOADS ─────────────────────────────────────────────
        // Every widget below caches its result (Cache::remember), but with all 9 mounted the six
        // data widgets fired their COLD-cache queries concurrently on each load, overloaded the
        // origin, and returned 503 — so the cache never populated and every load repeated the
        // failure (blank skeletons that never fill). Keeping the three UI widgets plus the three
        // ESSENTIAL, lightest data widgets (KPIs, revenue trend, latest orders) drops the concurrent
        // cold-query count from six to three so they complete and warm the cache. The three heavy
        // GROUP-BY analytics are parked below — re-enable them once their queries are profiled/indexed
        // (or moved to a dedicated Analytics page), not on the default landing view.
        return [
            QuickActionsWidget::class,           // sort=-200 — Action buttons (very top), no query
            ClientHistoriqueSearchWidget::class,  // sort=-150 — Client search, no query
            DashboardHeaderWidget::class,        // sort=-100 — Period filter, no query
            StatsOverview::class,               // sort=4    — 4 KPI cards
            RevenueChart::class,                // sort=6    — Évolution des ventes (revenue trend)
            LatestCommandes::class,             // sort=4    — Latest orders
            // Parked (heavy GROUP-BY, caused the 503 storm) — re-enable when optimized:
            // RevenueBySourcePieChart::class,  // sort=5 — Répartition HT
            // TopProductsWidget::class,        // sort=8 — Top Produits
            // TopRegionsWidget::class,         // sort=9 — Top Régions + Top Clients
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
