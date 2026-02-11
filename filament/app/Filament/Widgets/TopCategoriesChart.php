<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class TopCategoriesChart extends ChartWidget
{
    protected ?string $heading = 'Top Catégories';

    protected static bool $isLazy = true;

    protected static ?int $sort = 5;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
        // Trigger refresh
    }

    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:top_categories:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 300, function () use ($period) {
            return $this->buildCategoryData($period);
        });
    }

    private function buildCategoryData(array $period): array
    {
        $topCategories = DB::table('commande_details')
            ->join('commandes', 'commande_details.commande_id', '=', 'commandes.id')
            ->join('products', 'commande_details.produit_id', '=', 'products.id')
            ->join('sous_categories', 'products.sous_categorie_id', '=', 'sous_categories.id')
            ->join('categs', 'sous_categories.categorie_id', '=', 'categs.id')
            ->whereBetween('commandes.created_at', [$period['start'], $period['end']])
            ->whereNotIn('commandes.etat', ['annuler'])
            ->select(
                'categs.designation_fr as category_name',
                DB::raw('SUM(commande_details.qte * commande_details.prix_unitaire) as total_revenue'),
                DB::raw('COUNT(DISTINCT commandes.id) as order_count')
            )
            ->groupBy('categs.id', 'categs.designation_fr')
            ->orderByDesc('total_revenue')
            ->limit(10)
            ->get();

        $labels = [];
        $data = [];

        foreach ($topCategories as $category) {
            $labels[] = $category->category_name;
            $data[] = round($category->total_revenue, 2);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Revenue (DT)',
                    'data' => $data,
                    'backgroundColor' => [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(14, 165, 233, 0.8)',
                        'rgba(20, 184, 166, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(107, 114, 128, 0.8)',
                    ],
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }

    protected function getOptions(): array
    {
        return [
            'scales' => [
                'y' => [
                    'beginAtZero' => true,
                    'title' => [
                        'display' => true,
                        'text' => 'Revenue (DT)',
                    ],
                ],
            ],
            'plugins' => [
                'legend' => [
                    'display' => false,
                ],
            ],
        ];
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
