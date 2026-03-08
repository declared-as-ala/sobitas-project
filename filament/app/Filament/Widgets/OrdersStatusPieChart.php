<?php

namespace App\Filament\Widgets;

use App\Models\Commande;
use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class OrdersStatusPieChart extends ChartWidget
{
    protected ?string $heading = 'Répartition des commandes par statut';

    protected static bool $isLazy = true;

    protected static ?int $sort = 50;

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
        $cacheKey = "dashboard:orders_status_pie:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 180, function () use ($period) {
            return $this->buildData($period);
        });
    }

    private function buildData(array $period): array
    {
        $rows = DB::table('commandes')
            ->whereBetween('created_at', [$period['start'], $period['end']])
            ->select('etat', DB::raw('COUNT(*) as cnt'))
            ->groupBy('etat')
            ->orderByDesc('cnt')
            ->get();

        $total = $rows->sum('cnt');
        $labels = [];
        $data = [];
        $colors = [
            'nouvelle_commande'       => 'rgba(251, 191, 36, 0.85)',
            'en_cours_de_preparation' => 'rgba(59, 130, 246, 0.85)',
            'prete'                   => 'rgba(139, 92, 246, 0.85)',
            'en_cours_de_livraison'   => 'rgba(107, 114, 128, 0.85)',
            'expidee'                 => 'rgba(34, 197, 94, 0.85)',
            'annuler'                 => 'rgba(239, 68, 68, 0.85)',
        ];

        foreach ($rows as $row) {
            $cnt = (int) $row->cnt;
            $pct = $total > 0 ? round(($cnt / $total) * 100, 1) : 0;
            $labels[] = Commande::getStatusLabel($row->etat ?? '') . ' — ' . $cnt . ' (' . $pct . ' %)';
            $data[] = $cnt;
        }

        $backgrounds = [];
        foreach ($rows as $row) {
            $backgrounds[] = $colors[$row->etat ?? ''] ?? 'rgba(156, 163, 175, 0.85)';
        }

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
