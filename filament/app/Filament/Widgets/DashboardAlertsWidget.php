<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\Stock\StockReportsPage;
use App\Filament\Resources\ProductResource;
use App\Models\Product;
use Filament\Widgets\Widget;
use Livewire\Attributes\On;

class DashboardAlertsWidget extends Widget
{
    protected string $view = 'filament.widgets.dashboard-alerts-widget';

    protected static ?int $sort = -98;

    protected int | string | array $columnSpan = 1;

    protected static bool $isLazy = false;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    public function getColumnSpan(): int | string | array
    {
        return 1;
    }

    protected function getViewData(): array
    {
        return [
            'alerts' => $this->getAlerts(),
        ];
    }

    /**
     * @return array<string, array{icon: string, title: string, description: string, metric: string, badge_label: string, badge_color: string, button_label: string, button_url: string, type: string}>
     */
    public function getAlerts(): array
    {
        $alerts = [];

        // 1) Rupture (produits indisponibles)
        $ruptureCount = Product::query()->outOfStock()->count();
        $alerts['rupture'] = [
            'icon' => 'heroicon-o-x-circle',
            'title' => 'Rupture de stock',
            'description' => 'Produits indisponibles (qte ≤ 0)',
            'metric' => (string) $ruptureCount,
            'badge_label' => 'Critique',
            'badge_color' => 'red',
            'button_label' => 'Voir les produits',
            'button_url' => ProductResource::getUrl('index'),
            'type' => 'critical',
        ];

        // 2) Stock faible
        $lowStockCount = Product::query()->lowStock(10)->where('publier', 1)->count();
        $alerts['stock_faible'] = [
            'icon' => 'heroicon-o-exclamation-triangle',
            'title' => 'Stock faible',
            'description' => 'Produits sous le seuil (1–9 unités)',
            'metric' => (string) $lowStockCount,
            'badge_label' => 'Attention',
            'badge_color' => 'orange',
            'button_label' => 'Voir stock faible',
            'button_url' => StockReportsPage::getUrl(),
            'type' => 'warning',
        ];

        return $alerts;
    }
}
