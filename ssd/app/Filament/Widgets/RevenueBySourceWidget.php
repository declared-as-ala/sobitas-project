<?php

namespace App\Filament\Widgets;

use App\Commande;
use App\Facture;
use App\FactureTva;
use App\Ticket;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;

class RevenueBySourceWidget extends ChartWidget
{
    protected static ?string $heading = 'Revenue by Source';

    protected static ?string $description = 'This month breakdown by transaction type';

    protected static ?int $sort = 3;

    protected function getData(): array
    {
        $monthStart = Carbon::now()->startOfMonth();

        $facturesRevenue = Facture::where('created_at', '>=', $monthStart)->sum('prix_ttc');
        $factureTvasRevenue = FactureTva::where('created_at', '>=', $monthStart)->sum('prix_ttc');
        $ticketsRevenue = Ticket::where('created_at', '>=', $monthStart)->sum('prix_ttc');
        $commandesRevenue = Commande::where('etat', 'expidee')
            ->where('created_at', '>=', $monthStart)
            ->sum('prix_ttc');

        return [
            'datasets' => [
                [
                    'data' => [
                        round($facturesRevenue, 2),
                        round($factureTvasRevenue, 2),
                        round($ticketsRevenue, 2),
                        round($commandesRevenue, 2),
                    ],
                    'backgroundColor' => [
                        'rgb(59, 130, 246)',   // Blue
                        'rgb(239, 68, 68)',    // Red
                        'rgb(34, 197, 94)',    // Green
                        'rgb(251, 146, 60)',   // Orange
                    ],
                    'borderColor' => [
                        'rgba(59, 130, 246, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(251, 146, 60, 1)',
                    ],
                    'borderWidth' => 2,
                ],
            ],
            'labels' => [
                'Bon de livraison',
                'Factures TVA',
                'Tickets',
                'Commandes',
            ],
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'position' => 'bottom',
                ],
            ],
        ];
    }
}
