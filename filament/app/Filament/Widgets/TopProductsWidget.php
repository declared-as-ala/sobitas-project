<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class TopProductsWidget extends ChartWidget
{
    protected static ?int $sort = 3;

    protected ?string $maxHeight = '250px';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    protected function getHeading(): ?string
    {
        $period = $this->getCurrentPeriod();
        $label = $period['label'] ?? 'Période';

        return "Top 5 Produits ({$label})";
    }

    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:top_products:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 300, function () use ($period) {
            return $this->buildChartData($period);
        });
    }

    private function buildChartData(array $period): array
    {
        $start = $period['start'];
        $end = $period['end'];

        try {
            $topProducts = DB::select("
                SELECT
                    p.id,
                    SUBSTRING(p.designation_fr, 1, 20) as name,
                    ROUND(SUM(sales.prix_ttc), 2) as revenue
                FROM (
                    SELECT df.produit_id, df.prix_ttc
                    FROM details_factures df
                    INNER JOIN factures f ON df.facture_id = f.id
                    WHERE f.created_at BETWEEN ? AND ?

                    UNION ALL

                    SELECT dft.produit_id, dft.prix_ttc
                    FROM details_facture_tvas dft
                    INNER JOIN facture_tvas ft ON dft.facture_tva_id = ft.id
                    WHERE ft.created_at BETWEEN ? AND ?

                    UNION ALL

                    SELECT dt.produit_id, dt.prix_ttc
                    FROM details_tickets dt
                    INNER JOIN tickets t ON dt.ticket_id = t.id
                    WHERE t.created_at BETWEEN ? AND ?
                ) AS sales
                INNER JOIN products p ON p.id = sales.produit_id
                GROUP BY p.id, p.designation_fr
                ORDER BY revenue DESC
                LIMIT 5
            ", [$start, $end, $start, $end, $start, $end]);
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

    private function getCurrentPeriod(): array
    {
        $preset = session('dashboard.filter.preset', '30d');
        $customStart = session('dashboard.filter.custom_start') ? Carbon::parse(session('dashboard.filter.custom_start')) : null;
        $customEnd = session('dashboard.filter.custom_end') ? Carbon::parse(session('dashboard.filter.custom_end')) : null;

        return DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);
    }

    protected function getType(): string
    {
        return 'bar';
    }
}
