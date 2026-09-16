<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\Stock\StockReportsPage;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\ProductResource;
use App\Models\Commande;
use App\Models\Facture;
use App\Models\Product;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
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
        return Cache::remember('dashboard:alerts_widget', 60, function () {
            return $this->buildAlerts();
        });
    }

    /**
     * @return array<string, array{icon: string, title: string, description: string, metric: string, badge_label: string, badge_color: string, button_label: string, button_url: string, type: string}>
     */
    private function buildAlerts(): array
    {
        $alerts = [];

        // 1) Nouvelles commandes à traiter — the first thing staff should see on login.
        //    Guarded: a schema surprise must never 500 the dashboard landing page.
        try {
            $newOrders = Commande::query()->where('etat', Commande::STATUS_NEW)->count();
            if ($newOrders > 0) {
                $alerts['nouvelles_commandes'] = [
                    'icon' => 'heroicon-o-inbox-arrow-down',
                    'title' => 'Nouvelles commandes',
                    'description' => 'Commandes reçues, en attente de traitement',
                    'metric' => (string) $newOrders,
                    'badge_label' => 'À traiter',
                    'badge_color' => 'blue',
                    'button_label' => 'Traiter les commandes',
                    'button_url' => CommandeResource::getUrl('index'),
                    'type' => 'info',
                ];
            }
        } catch (\Throwable) {
            // skip — never break the dashboard
        }

        // 2) Expéditions Aramex en échec — a failed courier push blocks the delivery; surface it.
        try {
            $aramexFailed = Facture::query()
                ->whereNotNull('aramex_error')
                ->where('aramex_error', '<>', '')
                ->count();
            if ($aramexFailed > 0) {
                $alerts['aramex_echec'] = [
                    'icon' => 'heroicon-o-truck',
                    'title' => 'Expéditions Aramex en échec',
                    'description' => 'Bons de livraison dont l’envoi vers Aramex a échoué',
                    'metric' => (string) $aramexFailed,
                    'badge_label' => 'Critique',
                    'badge_color' => 'red',
                    'button_label' => 'Voir les BL',
                    'button_url' => FactureResource::getUrl('index'),
                    'type' => 'critical',
                ];
            }
        } catch (\Throwable) {
            // skip — never break the dashboard
        }

        // 3) Rupture (produits indisponibles)
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

        // 4) Stock faible
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
