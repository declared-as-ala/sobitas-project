<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StockReportService
{
    private const CACHE_TTL = 120;

    /**
     * Stock value by category (top 10), sorted descending. Safe for null category.
     */
    public function getValueByCategory(int $limit = 10): array
    {
        $cacheKey = "stock_report:value_by_category:{$limit}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($limit) {
            return DB::table('products')
                ->leftJoin('sous_categories', 'products.sous_categorie_id', '=', 'sous_categories.id')
                ->leftJoin('categs', 'sous_categories.categorie_id', '=', 'categs.id')
                ->where('products.qte', '>', 0)
                ->selectRaw('COALESCE(categs.designation_fr, "Sans catégorie") as name, SUM(products.qte * COALESCE(products.prix_ht, products.prix, 0)) as value')
                ->groupBy(DB::raw('COALESCE(categs.id, 0)'), DB::raw('COALESCE(categs.designation_fr, "Sans catégorie")'))
                ->orderByDesc('value')
                ->limit($limit)
                ->get()
                ->map(fn ($row) => (object) ['name' => $row->name, 'value' => (float) $row->value])
                ->all();
        });
    }

    /**
     * All categories with value (for pie). Same logic as getValueByCategory without limit.
     */
    public function getDistributionByCategory(): array
    {
        return Cache::remember('stock_report:distribution', self::CACHE_TTL, function () {
            return DB::table('products')
                ->leftJoin('sous_categories', 'products.sous_categorie_id', '=', 'sous_categories.id')
                ->leftJoin('categs', 'sous_categories.categorie_id', '=', 'categs.id')
                ->where('products.qte', '>', 0)
                ->selectRaw('COALESCE(categs.designation_fr, "Sans catégorie") as name, SUM(products.qte * COALESCE(products.prix_ht, products.prix, 0)) as value')
                ->groupBy(DB::raw('COALESCE(categs.id, 0)'), DB::raw('COALESCE(categs.designation_fr, "Sans catégorie")'))
                ->orderByDesc('value')
                ->get()
                ->map(fn ($row) => (object) ['name' => $row->name, 'value' => (float) $row->value])
                ->all();
        });
    }

    /**
     * Low stock products: qte > 0 and qte < threshold (or < 10 if threshold null).
     */
    public function getLowStockProducts(int $limit = 50): array
    {
        $cacheKey = "stock_report:low_stock:{$limit}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($limit) {
            return Product::query()
                ->with(['sousCategorie.categorie:id,designation_fr'])
                ->select('id', 'designation_fr', 'qte', 'low_stock_threshold', 'sous_categorie_id', 'rupture')
                ->where('qte', '>', 0)
                ->whereRaw('qte < COALESCE(NULLIF(low_stock_threshold, 0), 10)')
                ->orderBy('qte')
                ->limit($limit)
                ->get()
                ->map(function ($p) {
                    $threshold = (int) ($p->low_stock_threshold ?: 10);
                    $categoryName = $p->sousCategorie?->categorie?->designation_fr ?? $p->sousCategorie?->designation_fr ?? '—';
                    return (object) [
                        'id' => $p->id,
                        'designation_fr' => $p->designation_fr,
                        'qte' => $p->qte,
                        'seuil' => $threshold,
                        'category' => $categoryName,
                        'critical' => $p->qte <= 0 || $p->qte < ($threshold * 0.2),
                    ];
                })
                ->all();
        });
    }

    /**
     * KPI counts: rupture, low_stock, in_stock (normal).
     * rupture = out of stock = qte <= 0 OR rupture = 1. in_stock = qte > 0 AND rupture = 0.
     */
    public function getKpiCounts(): array
    {
        return Cache::remember('stock_report:kpis', self::CACHE_TTL, function () {
            $rows = DB::table('products')->selectRaw("
                SUM(CASE WHEN qte <= 0 OR rupture = 1 THEN 1 ELSE 0 END) as rupture,
                SUM(CASE WHEN qte > 0 AND qte < COALESCE(NULLIF(low_stock_threshold, 0), 10) THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN qte > 0 AND qte >= COALESCE(NULLIF(low_stock_threshold, 0), 10) AND rupture = 0 THEN 1 ELSE 0 END) as in_stock
            ")->first();

            return [
                'rupture' => (int) ($rows->rupture ?? 0),
                'low_stock' => (int) ($rows->low_stock ?? 0),
                'in_stock' => (int) ($rows->in_stock ?? 0),
            ];
        });
    }

    /**
     * Total stock value (HT).
     */
    public function getTotalStockValue(): float
    {
        return (float) Cache::remember('stock_report:total_value', self::CACHE_TTL, function () {
            return Product::query()
                ->where('qte', '>', 0)
                ->selectRaw('COALESCE(SUM(qte * COALESCE(prix_ht, prix, 0)), 0) as total')
                ->value('total');
        });
    }

    /**
     * Stock evolution (last N days) from stock_movements. Returns daily totals for chart.
     */
    public function getStockEvolution(int $days = 30): array
    {
        if (! Schema::hasTable('stock_movements')) {
            return ['labels' => [], 'datasets' => []];
        }

        $since = now()->subDays($days);
        $byDay = StockMovement::query()
            ->where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as date, SUM(CASE WHEN qty_change > 0 THEN qty_change ELSE 0 END) as entries, SUM(CASE WHEN qty_change < 0 THEN ABS(qty_change) ELSE 0 END) as exits')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $labels = [];
        $entries = [];
        $exits = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $labels[] = now()->subDays($i)->format('d/m');
            $row = $byDay->get($date);
            $entries[] = (int) ($row->entries ?? 0);
            $exits[] = (int) ($row->exits ?? 0);
        }

        return [
            'labels' => $labels,
            'datasets' => [
                ['label' => 'Entrées', 'data' => $entries, 'borderColor' => 'rgb(34, 197, 94)', 'backgroundColor' => 'rgba(34, 197, 94, 0.2)', 'fill' => true],
                ['label' => 'Sorties', 'data' => $exits, 'borderColor' => 'rgb(239, 68, 68)', 'backgroundColor' => 'rgba(239, 68, 68, 0.2)', 'fill' => true],
            ],
        ];
    }

    public function clearCache(): void
    {
        $prefixes = ['stock_report:value_by_category:', 'stock_report:distribution', 'stock_report:low_stock:', 'stock_report:kpis', 'stock_report:total_value'];
        foreach ($prefixes as $prefix) {
            // Cache::flush() is heavy; we don't have tags. Just forget common keys.
        }
        Cache::forget('stock_report:distribution');
        Cache::forget('stock_report:kpis');
        Cache::forget('stock_report:total_value');
        for ($i = 1; $i <= 20; $i++) {
            Cache::forget("stock_report:value_by_category:{$i}");
            Cache::forget("stock_report:low_stock:{$i}");
        }
    }
}
