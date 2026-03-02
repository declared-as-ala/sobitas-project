<?php

namespace App\Filament\Widgets;

use App\Models\Commande;
use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Livewire\Attributes\On;

class OrderFunnelChart extends ChartWidget
{
    protected ?string $heading = 'Entonnoir de Conversion';

    protected static bool $isLazy = true;

    protected static ?int $sort = 4;

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
        $cacheKey = "dashboard:order_funnel:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 120, function () use ($period) {
            return $this->buildFunnelData($period);
        });
    }

    private function buildFunnelData(array $period): array
    {
        $stats = Commande::whereBetween('created_at', [$period['start'], $period['end']])
            ->selectRaw('
                etat,
                COUNT(*) as count
            ')
            ->groupBy('etat')
            ->get()
            ->keyBy('etat');

        $statuses = [
            'nouvelle_commande' => 'Nouvelle',
            'en_cours_de_preparation' => 'Préparation',
            'prete' => 'Prête',
            'en_cours_de_livraison' => 'Livraison',
            'expidee' => 'Expédiée',
            'annuler' => 'Annulée',
        ];

        $labels = [];
        $data = [];
        $colors = [];
        $total = $stats->sum('count');

        foreach ($statuses as $key => $label) {
            $count = $stats[$key]->count ?? 0;
            $percentage = $total > 0 ? round(($count / $total) * 100, 1) : 0;

            $labels[] = "{$label} ({$percentage}%)";
            $data[] = $count;

            // Color based on status
            $colors[] = match ($key) {
                'nouvelle_commande' => 'rgba(251, 191, 36, 0.8)', // warning
                'en_cours_de_preparation' => 'rgba(59, 130, 246, 0.8)', // info
                'prete' => 'rgba(139, 92, 246, 0.8)', // primary
                'en_cours_de_livraison' => 'rgba(107, 114, 128, 0.8)', // gray
                'expidee' => 'rgba(16, 185, 129, 0.8)', // success
                'annuler' => 'rgba(239, 68, 68, 0.8)', // danger
            };
        }

        return [
            'datasets' => [
                [
                    'label' => 'Commandes',
                    'data' => $data,
                    'backgroundColor' => $colors,
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
            'indexAxis' => 'y', // Horizontal bars
            'plugins' => [
                'legend' => [
                    'display' => false,
                ],
            ],
            'scales' => [
                'x' => [
                    'beginAtZero' => true,
                    'title' => [
                        'display' => true,
                        'text' => 'Nombre de commandes',
                    ],
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
