<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class OrderStatusChart extends ChartWidget
{
    protected ?string $heading = 'Répartition des commandes';

    protected static ?int $sort = 3;

    protected ?string $maxHeight = '250px';

    protected ?string $pollingInterval = null; // Disable polling — data cached 2min

    /**
     * BEFORE: 6 separate COUNT queries (one per status).
     * AFTER: 1 single query with GROUP BY.
     */
    protected function getData(): array
    {
        return Cache::remember('dashboard:order_status_chart', 120, function () {
            $statusOrder = [
                'nouvelle_commande',
                'en_cours_de_preparation',
                'prete',
                'en_cours_de_livraison',
                'expidee',
                'annuler',
            ];

            // Single query with GROUP BY instead of 6 separate counts
            $counts = DB::table('commandes')
                ->select('etat', DB::raw('COUNT(*) as total'))
                ->whereIn('etat', $statusOrder)
                ->groupBy('etat')
                ->pluck('total', 'etat');

            $data = array_map(fn ($status) => (int) ($counts[$status] ?? 0), $statusOrder);

            return [
                'datasets' => [
                    [
                        'data' => $data,
                        'backgroundColor' => [
                            '#f59e0b', // warning - nouvelle
                            '#3b82f6', // blue - préparation
                            '#8b5cf6', // purple - prête
                            '#06b6d4', // cyan - livraison
                            '#10b981', // green - expédiée
                            '#ef4444', // red - annulée
                        ],
                    ],
                ],
                'labels' => [
                    'Nouvelle',
                    'Préparation',
                    'Prête',
                    'Livraison',
                    'Expédiée',
                    'Annulée',
                ],
            ];
        });
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
