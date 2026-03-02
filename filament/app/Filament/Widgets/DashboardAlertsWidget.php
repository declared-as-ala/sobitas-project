<?php

namespace App\Filament\Widgets;

use App\Enums\BlStatus;
use App\Enums\InvoiceStatus;
use App\Filament\Pages\Stock\StockReportsPage;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\ProductResource;
use App\Models\Commande;
use App\Models\Facture;
use App\Models\FactureTva;
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

        // 3) Commandes à préparer / en attente
        $pendingCommandes = Commande::query()
            ->whereIn('etat', ['nouvelle_commande', 'en_cours_de_preparation'])
            ->count();
        $commandesUrl = CommandeResource::getUrl('index') . '?tableFilters[etat][value]=nouvelle_commande';
        $alerts['commandes_attente'] = [
            'icon' => 'heroicon-o-clock',
            'title' => 'Commandes à préparer',
            'description' => 'Nouvelles ou en cours de préparation',
            'metric' => (string) $pendingCommandes,
            'badge_label' => 'Info',
            'badge_color' => 'blue',
            'button_label' => 'Voir les commandes',
            'button_url' => $commandesUrl,
            'type' => 'info',
        ];

        // 4) Factures / BL en brouillon
        $blDraftCount = Facture::query()->where('status', BlStatus::Draft)->count();
        $factureDraftCount = FactureTva::query()->where('status', InvoiceStatus::Draft)->count();
        $draftTotal = $blDraftCount + $factureDraftCount;
        $blUrl = FactureResource::getUrl('index') . '?tableFilters[status][value]=draft';
        $alerts['brouillon'] = [
            'icon' => 'heroicon-o-document-text',
            'title' => 'Factures / BL en brouillon',
            'description' => $blDraftCount . ' BL, ' . $factureDraftCount . ' facture(s) TVA',
            'metric' => (string) $draftTotal,
            'badge_label' => 'Info',
            'badge_color' => 'blue',
            'button_label' => 'Voir les brouillons',
            'button_url' => $blUrl,
            'type' => 'info',
        ];

        return $alerts;
    }
}
