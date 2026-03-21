<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class TopProductsWidget extends Widget
{
    protected static ?int $sort = 8;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = true;

    protected string $view = 'filament.widgets.top-products-widget';

    public array $topProducts = [];

    public string $periodLabel = 'Période';

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
        $this->loadData();
    }

    public function mount(): void
    {
        $this->loadData();
    }

    private function loadData(): void
    {
        $period = $this->getCurrentPeriod();
        $this->periodLabel = $period['label'] ?? 'Période';
        $cacheKey = "dashboard:top_products_v2:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        $this->topProducts = Cache::remember($cacheKey, 300, function () use ($period) {
            return $this->fetchTopProducts($period['start'], $period['end']);
        });
    }

    private function fetchTopProducts(Carbon $start, Carbon $end): array
    {
        try {
            $rows = DB::select("
                SELECT
                    p.id,
                    p.designation_fr                          AS name,
                    SUM(sales.qte)                            AS total_qty,
                    ROUND(SUM(sales.revenue_ht), 3)           AS total_revenue_ht,
                    COUNT(DISTINCT sales.source_id)           AS total_orders
                FROM (

                    -- Factures (Bons de livraison)
                    SELECT
                        df.produit_id,
                        df.qte,
                        COALESCE(df.prix_ht, df.prix_ttc, 0) AS revenue_ht,
                        CONCAT('f_', f.id)                    AS source_id
                    FROM details_factures df
                    INNER JOIN factures f ON df.facture_id = f.id
                    WHERE f.created_at BETWEEN ? AND ?

                    UNION ALL

                    -- Factures TVA standalone
                    SELECT
                        dft.produit_id,
                        dft.qte,
                        COALESCE(dft.prix_ht, dft.prix_ttc, 0) AS revenue_ht,
                        CONCAT('ft_', ft.id)                    AS source_id
                    FROM details_facture_tvas dft
                    INNER JOIN facture_tvas ft ON dft.facture_tva_id = ft.id
                    WHERE ft.created_at BETWEEN ? AND ?

                    UNION ALL

                    -- Tickets caisse
                    SELECT
                        dt.produit_id,
                        dt.qte,
                        COALESCE(dt.prix_ht, dt.prix_ttc, 0) AS revenue_ht,
                        CONCAT('t_', t.id)                   AS source_id
                    FROM details_tickets dt
                    INNER JOIN tickets t ON dt.ticket_id = t.id
                    WHERE t.created_at BETWEEN ? AND ?

                    UNION ALL

                    -- Commandes
                    SELECT
                        cd.produit_id,
                        cd.qte,
                        COALESCE(cd.prix_ht, cd.prix_unitaire, 0) AS revenue_ht,
                        CONCAT('c_', c.id)                         AS source_id
                    FROM commande_details cd
                    INNER JOIN commandes c ON cd.commande_id = c.id
                    WHERE c.created_at BETWEEN ? AND ?
                      AND c.etat NOT IN ('annuler')

                ) AS sales
                INNER JOIN products p ON p.id = sales.produit_id
                GROUP BY p.id, p.designation_fr
                ORDER BY total_revenue_ht DESC
                LIMIT 10
            ", [$start, $end, $start, $end, $start, $end, $start, $end]);

            return array_map(fn ($r) => (array) $r, $rows);
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getCurrentPeriod(): array
    {
        $preset = session('dashboard.filter.preset', '30d');
        $customStart = session('dashboard.filter.custom_start')
            ? Carbon::parse(session('dashboard.filter.custom_start'))
            : null;
        $customEnd = session('dashboard.filter.custom_end')
            ? Carbon::parse(session('dashboard.filter.custom_end'))
            : null;

        return DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);
    }
}
