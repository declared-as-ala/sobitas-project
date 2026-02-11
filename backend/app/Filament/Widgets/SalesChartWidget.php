<?php

namespace App\Filament\Widgets;

use App\Commande;
use App\Facture;
use App\FactureTva;
use App\Ticket;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;

class SalesChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Sales Trend';

    protected static ?string $description = 'Last 30 days revenue overview';

    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected static ?string $maxHeight = '300px';

    protected function getData(): array
    {
        $labels = [];
        $revenue = [];

        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $labels[] = $date->format('d M');

            $dayRevenue = Facture::whereDate('created_at', $date)->sum('prix_ttc') +
                FactureTva::whereDate('created_at', $date)->sum('prix_ttc') +
                Ticket::whereDate('created_at', $date)->sum('prix_ttc');

            $revenue[] = round($dayRevenue, 2);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Revenue (TND)',
                    'data' => $revenue,
                    'backgroundColor' => 'rgba(59, 130, 246, 0.1)',
                    'borderColor' => 'rgb(59, 130, 246)',
                    'borderWidth' => 2,
                    'fill' => true,
                    'tension' => 0.4,
                    'pointBackgroundColor' => 'rgb(59, 130, 246)',
                    'pointBorderColor' => '#fff',
                    'pointHoverBackgroundColor' => '#fff',
                    'pointHoverBorderColor' => 'rgb(59, 130, 246)',
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'display' => true,
                ],
            ],
            'scales' => [
                'y' => [
                    'beginAtZero' => true,
                ],
            ],
        ];
    }
}
