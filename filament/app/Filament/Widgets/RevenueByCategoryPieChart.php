<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class RevenueByCategoryPieChart extends ChartWidget
{
    protected ?string $heading = 'Chiffre d\'affaires par catégorie';

    protected static bool $isLazy = true;

    protected static ?int $sort = 51;

    protected int | string | array $columnSpan = 1;

    protected ?string $maxHeight = '320px';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:revenue_by_category_pie:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 180, function () use ($period) {
            return $this->buildData($period);
        });
    }

    private function buildData(array $period): array
    {
        $topN = 8;
        $rows = DB::table('commande_details')
            ->join('commandes', 'commande_details.commande_id', '=', 'commandes.id')
            ->join('products', 'commande_details.produit_id', '=', 'products.id')
            ->join('sous_categories', 'products.sous_categorie_id', '=', 'sous_categories.id')
            ->join('categs', 'sous_categories.categorie_id', '=', 'categs.id')
            ->whereBetween('commandes.created_at', [$period['start'], $period['end']])
            ->whereNotIn('commandes.etat', ['annuler'])
            ->select(
                'categs.designation_fr as category_name',
                DB::raw('SUM(commande_details.qte * commande_details.prix_unitaire) as total_revenue')
            )
            ->groupBy('categs.id', 'categs.designation_fr')
            ->orderByDesc('total_revenue')
            ->get();

        $labels = [];
        $data = [];
        $colors = [
            'rgba(59, 130, 246, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(251, 191, 36, 0.85)',
            'rgba(239, 68, 68, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(14, 165, 233, 0.85)',
            'rgba(20, 184, 166, 0.85)',
            'rgba(107, 114, 128, 0.85)', // Autres
        ];

        $autres = 0.0;
        $index = 0;
        foreach ($rows as $row) {
            $val = round((float) $row->total_revenue, 2);
            if ($val <= 0) {
                continue;
            }
            $name = $row->category_name ?: 'Sans catégorie';
            if ($index < $topN) {
                $labels[] = $name;
                $data[] = $val;
                $index++;
            } else {
                $autres += $val;
            }
        }
        if ($autres > 0) {
            $labels[] = 'Autres';
            $data[] = round($autres, 2);
        }

        $backgrounds = array_slice(array_merge($colors, $colors), 0, count($data));

        return [
            'datasets' => [
                [
                    'data' => $data,
                    'backgroundColor' => $backgrounds,
                    'borderWidth' => 1,
                    'hoverOffset' => 4,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'pie';
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'display' => true,
                    'position' => 'bottom',
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

        $result = DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);

        return [
            'start' => $result['start'],
            'end' => $result['end'],
        ];
    }
}
