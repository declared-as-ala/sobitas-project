<?php

namespace App\Filament\Widgets;

use App\Models\Commande;
use App\Models\Product;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
use Livewire\Attributes\On;

class StatusCardsWidget extends Widget
{
    protected string $view = 'filament.widgets.status-cards-widget';

    protected static ?int $sort = 20;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = true;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void {}

    public function getStatusCards(): array
    {
        return Cache::remember('dashboard.status_cards', 60, function () {
            $counts = Commande::query()
                ->selectRaw('etat, count(*) as total')
                ->groupBy('etat')
                ->pluck('total', 'etat');

            $ruptures = Product::where('rupture', 1)->count();

            return [
                [
                    'label'    => 'Nouvelles',
                    'sublabel' => 'commandes',
                    'count'    => (int) ($counts['nouvelle_commande'] ?? 0),
                    'icon'     => 'heroicon-o-bell-alert',
                    'accent'   => '#f97316',
                    'bg'       => '#fff7ed',
                    'dark_bg'  => 'rgba(249,115,22,0.12)',
                    'urgent'   => true,
                ],
                [
                    'label'    => 'En préparation',
                    'sublabel' => 'commandes',
                    'count'    => (int) ($counts['en_cours_de_preparation'] ?? 0),
                    'icon'     => 'heroicon-o-cog-6-tooth',
                    'accent'   => '#3b82f6',
                    'bg'       => '#eff6ff',
                    'dark_bg'  => 'rgba(59,130,246,0.12)',
                    'urgent'   => false,
                ],
                [
                    'label'    => 'Prêtes',
                    'sublabel' => 'à expédier',
                    'count'    => (int) ($counts['prete'] ?? 0),
                    'icon'     => 'heroicon-o-check-badge',
                    'accent'   => '#8b5cf6',
                    'bg'       => '#f5f3ff',
                    'dark_bg'  => 'rgba(139,92,246,0.12)',
                    'urgent'   => false,
                ],
                [
                    'label'    => 'En livraison',
                    'sublabel' => 'commandes',
                    'count'    => (int) ($counts['en_cours_de_livraison'] ?? 0),
                    'icon'     => 'heroicon-o-truck',
                    'accent'   => '#14b8a6',
                    'bg'       => '#f0fdfa',
                    'dark_bg'  => 'rgba(20,184,166,0.12)',
                    'urgent'   => false,
                ],
                [
                    'label'    => 'Expédiées',
                    'sublabel' => 'commandes',
                    'count'    => (int) ($counts['expidee'] ?? 0),
                    'icon'     => 'heroicon-o-check-circle',
                    'accent'   => '#22c55e',
                    'bg'       => '#f0fdf4',
                    'dark_bg'  => 'rgba(34,197,94,0.12)',
                    'urgent'   => false,
                ],
                [
                    'label'    => 'Annulées',
                    'sublabel' => 'commandes',
                    'count'    => (int) ($counts['annuler'] ?? 0),
                    'icon'     => 'heroicon-o-x-circle',
                    'accent'   => '#ef4444',
                    'bg'       => '#fef2f2',
                    'dark_bg'  => 'rgba(239,68,68,0.12)',
                    'urgent'   => false,
                ],
                [
                    'label'    => 'Ruptures',
                    'sublabel' => 'produits',
                    'count'    => $ruptures,
                    'icon'     => 'heroicon-o-archive-box-x-mark',
                    'accent'   => '#6b7280',
                    'bg'       => '#f9fafb',
                    'dark_bg'  => 'rgba(107,114,128,0.12)',
                    'urgent'   => $ruptures > 0,
                ],
            ];
        });
    }
}
