<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class TopCategoriesListWidget extends Widget
{
    protected static ?string $heading = 'Top 5 Catégories';

    protected string $view = 'filament.widgets.top-categories-list-widget';

    protected static bool $isLazy = true;

    protected static ?int $sort = 49;

    protected int | string | array $columnSpan = 1;

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    protected function getViewData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:top_categories_list:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        $items = Cache::remember($cacheKey, 300, function () use ($period) {
            return DB::table('commande_details')
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
                ->limit(5)
                ->get();
        });

        return ['items' => $items];
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
