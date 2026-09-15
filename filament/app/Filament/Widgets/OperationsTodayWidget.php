<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\Stock\StockDashboard;
use App\Filament\Resources\CommandeResource;
use App\Models\Commande;
use App\Models\Product;
use Carbon\Carbon;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
use Livewire\Attributes\On;

/**
 * "À traiter aujourd'hui" — the actionable daily-ops strip. Turns the dashboard from numbers
 * to look at into work to do: each card is the live count of an action state and CLICKS THROUGH
 * to the exact filtered list.
 *
 * Cheap by construction: one GROUP BY on the indexed `commandes.etat`, one delayed-orders count
 * (copying DelayedOrdersTable's prep>24h / prête>48h rule, on the composite etat,created_at index),
 * and one low-stock count (publier=1 so the ~10k never-stocked iHerb catalogue rows don't inflate
 * it). Only the scalar counts are cached (60s); the click-through URLs are built fresh per render
 * so nothing request-scoped is cached.
 */
class OperationsTodayWidget extends Widget
{
    protected string $view = 'filament.widgets.operations-today-widget';

    protected static ?int $sort = 5;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = true;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    private function counts(): array
    {
        return Cache::remember('dashboard:ops_today_v1', 60, function () {
            $byStatus = Commande::query()
                ->selectRaw('etat, count(*) as total')
                ->groupBy('etat')
                ->pluck('total', 'etat');

            $now = Carbon::now();
            $delayed = Commande::query()
                ->where(function ($q) use ($now) {
                    $q->where('etat', 'en_cours_de_preparation')
                        ->where('created_at', '<=', $now->copy()->subHours(24));
                })
                ->orWhere(function ($q) use ($now) {
                    $q->where('etat', 'prete')
                        ->where('created_at', '<=', $now->copy()->subHours(48));
                })
                ->count();

            return [
                'nouvelle'    => (int) ($byStatus['nouvelle_commande'] ?? 0),
                'preparation' => (int) ($byStatus['en_cours_de_preparation'] ?? 0),
                'prete'       => (int) ($byStatus['prete'] ?? 0),
                'delayed'     => $delayed,
                'low_stock'   => (int) Product::query()->lowStock(10)->where('publier', 1)->count(),
            ];
        });
    }

    public function getItems(): array
    {
        $c = $this->counts();

        $ordersUrl = fn (string $etat): string => CommandeResource::getUrl('index', [
            'tableFilters' => ['etat' => ['value' => $etat]],
        ]);

        return [
            [
                'label' => 'Nouvelles commandes',
                'hint'  => 'à traiter',
                'value' => $c['nouvelle'],
                'icon'  => 'heroicon-o-inbox-arrow-down',
                'tone'  => 'brand',
                'url'   => $ordersUrl('nouvelle_commande'),
            ],
            [
                'label' => 'En préparation',
                'hint'  => 'à finaliser',
                'value' => $c['preparation'],
                'icon'  => 'heroicon-o-cube',
                'tone'  => 'slate',
                'url'   => $ordersUrl('en_cours_de_preparation'),
            ],
            [
                'label' => 'Prêtes à expédier',
                'hint'  => 'à envoyer',
                'value' => $c['prete'],
                'icon'  => 'heroicon-o-truck',
                'tone'  => 'info',
                'url'   => $ordersUrl('prete'),
            ],
            [
                'label' => 'En retard',
                'hint'  => 'préparation > 24h',
                'value' => $c['delayed'],
                'icon'  => 'heroicon-o-exclamation-triangle',
                'tone'  => 'danger',
                'url'   => $ordersUrl('en_cours_de_preparation'),
            ],
            [
                'label' => 'Stock faible',
                'hint'  => 'à réapprovisionner',
                'value' => $c['low_stock'],
                'icon'  => 'heroicon-o-arrow-trending-down',
                'tone'  => 'amber',
                'url'   => StockDashboard::getUrl(),
            ],
        ];
    }
}
