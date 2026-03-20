<?php

namespace App\Filament\Pages;

use App\Filament\Support\DashboardHeaderActions;
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
    use DashboardHeaderActions;

    /** Keep preset in sync with ?period= in the URL so refresh and bookmarking work. */
    protected $queryString = [
        'preset' => ['as' => 'period', 'except' => '30d'],
    ];

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
            $this->preset = $period;
        } else {
            $this->preset = session('dashboard.filter.preset', '30d');
        }
        if (! request()->has('period')) {
            $this->redirect($this->getDashboardUrlWithPeriod($this->preset), navigate: true);
        }
    }

    public function getHeaderWidgets(): array
    {
        return [
            DashboardHeaderWidget::class,
        ];
    }

    public function getWidgets(): array
    {
        return [
            QuickActionsWidget::class,          // sort=5   — Actions Rapides (full)
            StatsOverview::class,               // sort=6   — KPIs financiers (full)
            MarketplaceKpis::class,             // sort=8   — KPIs commandes (col=1) ─┐ side-by-side
            RevenueBySourcePieChart::class,     // sort=9   — Répartition CA (col=1)  ─┘
            StatusCardsWidget::class,           // sort=20  — Statuts temps réel (full)
            ClientHistoriqueSearchWidget::class, // sort=25  — Recherche client (full)
            RevenueChart::class,                // sort=40  — Graphique CA (full)
            TopProductsWidget::class,           // sort=50  — Top produits
            GeographicChart::class,             // sort=60  — Géographie (full)
            TopCustomersTable::class,           // sort=80  — Top clients (full)
        ];
    }

    public function getColumns(): int | array
    {
        return 2; // 2-column grid
    }
}
