<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use App\Services\RevenueService;
use Carbon\Carbon;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;
use Livewire\Attributes\On;

class RevenueBySourcePieChart extends ChartWidget
{
    protected ?string $heading = 'Répartition du chiffre d\'affaires HT';

    protected static bool $isLazy = true;

    protected static ?int $sort = 5;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm'      => 1,
        'md'      => 1,
        'xl'      => 1,
    ];

    protected ?string $maxHeight = '380px';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
    }

    protected function getData(): array
    {
        $period = $this->getCurrentPeriod();
        $cacheKey = "dashboard:revenue_by_source_pie:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 180, function () use ($period) {
            $rows = app(RevenueService::class)->revenueSourcesHt($period['start'], $period['end']);
            $total = array_sum($rows);

            $labels = [];
            $data = [];
            $map = [
                'tickets' => 'Tickets caisse',
                'bls' => 'Bons de livraison',
                'facture_tvas' => 'Factures TVA standalone',
            ];

            foreach ($map as $key => $label) {
                $value = round((float) ($rows[$key] ?? 0), 3);
                if ($value <= 0) {
                    continue;
                }

                $pct = $total > 0 ? round(($value / $total) * 100, 1) : 0;
                $labels[] = $label . ' — ' . number_format($value, 3, ',', ' ') . ' DT (' . $pct . ' %)';
                $data[] = $value;
            }

            return [
                'datasets' => [[
                    'data' => $data,
                    'backgroundColor' => [
                        'rgba(99,  102, 241, 0.88)',  // indigo  – Tickets caisse
                        'rgba(245, 158,  11, 0.88)',  // amber   – Bons de livraison
                        'rgba( 16, 185, 129, 0.88)',  // emerald – Factures TVA
                    ],
                    'hoverBackgroundColor' => [
                        'rgba(99,  102, 241, 1)',
                        'rgba(245, 158,  11, 1)',
                        'rgba( 16, 185, 129, 1)',
                    ],
                    'borderColor'  => '#ffffff',
                    'borderWidth'  => 3,
                    'hoverOffset'  => 8,
                ]],
                'labels' => $labels,
            ];
        });
    }

    protected function getType(): string
    {
        return 'doughnut';
    }

    protected function getOptions(): array
    {
        return [
            'cutout' => '62%',
            'animation' => [
                'animateRotate' => true,
                'animateScale'  => false,
                'duration'      => 700,
                'easing'        => 'easeInOutQuart',
            ],
            'plugins' => [
                'legend' => [
                    'display'  => true,
                    'position' => 'bottom',
                    'labels'   => [
                        'padding'     => 16,
                        'boxWidth'    => 12,
                        'boxHeight'   => 12,
                        'borderRadius'=> 4,
                        'usePointStyle' => false,
                        'font'        => ['size' => 12, 'weight' => '500'],
                        'color'       => '#6b7280',
                    ],
                ],
                'tooltip' => [
                    'enabled'     => true,
                    'padding'     => 10,
                    'cornerRadius'=> 8,
                    'callbacks'   => [
                        'label' => "function(ctx){
                            var total=ctx.dataset.data.reduce(function(a,b){return a+b;},0);
                            var pct=total>0?(ctx.parsed/total*100).toFixed(1):'0.0';
                            return ' '+ctx.label.split(' — ')[0]+': '+Number(ctx.parsed).toLocaleString('fr-TN',{minimumFractionDigits:3})+' DT ('+pct+'%)';
                        }",
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

        $result = DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);

        return [
            'start' => $result['start'],
            'end' => $result['end'],
        ];
    }
}
