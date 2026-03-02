<?php

namespace App\Filament\Widgets;

use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TopProductsWidget extends ChartWidget
{
    protected ?string $heading = 'Top 5 Produits (30 jours)';

    protected static ?int $sort = 3;

    protected ?string $maxHeight = '250px';

    protected ?string $pollingInterval = null; // Disable polling — data cached 5min

    /**
     * BEFORE: 3 aggregate queries + N+1 Product::find() in a loop.
     * AFTER: 1 single UNION + JOIN query that returns product names directly.
     */
    protected function getData(): array
    {
        return Cache::remember('dashboard:top_products', 300, function () {
            return $this->buildChartData();
        });
    }

    private function buildChartData(): array
    {
        $start = Carbon::now()->subDays(30)->startOfDay();

        try {
            // Single query: UNION all sales sources, JOIN products, GROUP BY, LIMIT 5
            $topProducts = DB::select("
                SELECT
                    p.id,
                    SUBSTRING(p.designation_fr, 1, 20) as name,
                    ROUND(SUM(sales.prix_ttc), 2) as revenue
                FROM (
                    SELECT df.produit_id, df.prix_ttc
                    FROM details_factures df
                    INNER JOIN factures f ON df.facture_id = f.id
                    WHERE f.created_at >= ?

                    UNION ALL

                    SELECT dft.produit_id, dft.prix_ttc
                    FROM details_facture_tvas dft
                    INNER JOIN facture_tvas ft ON dft.facture_tva_id = ft.id
                    WHERE ft.created_at >= ?

                    UNION ALL

                    SELECT dt.produit_id, dt.prix_ttc
                    FROM details_tickets dt
                    INNER JOIN tickets t ON dt.ticket_id = t.id
                    WHERE t.created_at >= ?
                ) AS sales
                INNER JOIN products p ON p.id = sales.produit_id
                GROUP BY p.id, p.designation_fr
                ORDER BY revenue DESC
                LIMIT 5
            ", [$start, $start, $start]);
        } catch (\Exception $e) {
            return ['datasets' => [['data' => []]], 'labels' => []];
        }

        return [
            'datasets' => [
                [
                    'data' => array_column($topProducts, 'revenue'),
                    'backgroundColor' => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                ],
            ],
            'labels' => array_column($topProducts, 'name'),
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}
