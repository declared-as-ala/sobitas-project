<?php

namespace App\Filament\Widgets;

use App\Services\DashboardMetricsService;
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
        // This will trigger re-render
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

    public function getAlerts(): array
    {
        // Simplified alerts matching screenshot design
        return [
            'critical' => [
                'icon' => 'heroicon-o-arrow-trending-down',
                'title' => 'Chiffre de Revenu',
                'description' => 'Le revenu aujourd\'hui est 40% sous la moyenne',
                'metric' => '0.00 €',
                'badge_label' => 'Critique',
                'badge_color' => 'red',
                'button_label' => 'Voir Commandes',
                'button_url' => \App\Filament\Resources\CommandeResource::getUrl('index'),
                'button_color' => 'danger',
                'bg_color' => 'red-50',
                'border_color' => 'red-200',
                'text_color' => 'red-600',
            ],
            'attention' => [
                'icon' => 'heroicon-o-exclamation-triangle',
                'title' => 'Stock Faible',
                'description' => '4 produits best-sellers bientôt épuisés',
                'metric' => '4',
                'badge_label' => 'Attention',
                'badge_color' => 'orange',
                'button_label' => 'Voir Stock',
                'button_url' => \App\Filament\Resources\ProductResource::getUrl('index'),
                'button_color' => 'warning',
                'bg_color' => 'orange-50',
                'border_color' => 'orange-200',
                'text_color' => 'orange-600',
            ],
            'info' => [
                'icon' => 'heroicon-o-clock',
                'title' => 'Retards Expédition',
                'description' => '2 commandes en attente > 24h',
                'metric' => '2',
                'badge_label' => 'Info',
                'badge_color' => 'blue',
                'button_label' => 'Voir Commandes',
                'button_url' => \App\Filament\Resources\CommandeResource::getUrl('index'),
                'button_color' => 'primary',
                'bg_color' => 'blue-50',
                'border_color' => 'blue-200',
                'text_color' => 'blue-600',
            ],
        ];
    }
}
