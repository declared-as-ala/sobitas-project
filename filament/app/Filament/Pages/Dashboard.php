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
use Filament\Notifications\Notification;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-presentation-chart-line';

    protected static ?string $title = 'Tableau de bord';

    // ── Dashboard state (incl. client search widget) ────────────────────────
    // Filament renders dashboard widgets’ Blade *inside* this Livewire page, so
    // wire:model / wire:submit on widget views bind here — not on the Widget class.
    public string $preset = '30d';

    public ?string $tel = null;

    public ?string $name = null;

    public bool $isRefreshing = false;

    public bool $isExporting = false;

    public function submitClientHistoriqueSearch(): mixed
    {
        $tel = trim((string) $this->tel);
        $name = trim((string) $this->name);
        if ($tel === '' && $name === '') {
            Notification::make()
                ->title('Saisissez un numéro de téléphone ou un nom')
                ->warning()
                ->send();

            return null;
        }

        $params = array_filter([
            'tel' => $tel !== '' ? $tel : null,
            'name' => $name !== '' ? $name : null,
        ]);

        return $this->redirect(HistoriqueClient::getUrl($params), navigate: false);
    }

    public function clearClientHistoriqueFields(): void
    {
        $this->tel = null;
        $this->name = null;
    }

    public function hasSearchCriteria(): bool
    {
        return trim((string) $this->tel) !== '' || trim((string) $this->name) !== '';
    }

    /** @deprecated Old Livewire snapshots — forwards to {@see submitClientHistoriqueSearch()} */
    public function searchHistorique(): void
    {
        $this->submitClientHistoriqueSearch();
    }

    /** @deprecated Old Livewire snapshots — forwards to {@see clearClientHistoriqueFields()} */
    public function clearHistorique(): void
    {
        $this->clearClientHistoriqueFields();
    }

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
