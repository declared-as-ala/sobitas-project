<?php

namespace App\Filament\Affilie\Widgets;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Models\AffilieTransaction;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

/**
 * Six-month earnings trend for the logged-in affiliate: confirmed commission as a filled brand
 * line, pending commission as a dashed amber line beneath it. Reads the ledger directly (same
 * source as AffilieBalanceWidget) so the chart and the tiles can never disagree.
 */
class AffilieEarningsChart extends ChartWidget
{
    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected ?string $maxHeight = '260px';

    protected static bool $isLazy = true;

    public function getHeading(): ?string
    {
        return 'Vos gains — 6 derniers mois';
    }

    protected function getData(): array
    {
        $affilie = auth()->user()?->affilie;
        if (! $affilie) {
            return ['datasets' => [], 'labels' => []];
        }

        $monthsBack = 6;
        $start = Carbon::now()->startOfMonth()->subMonths($monthsBack - 1);

        $confirmed = [];
        $pending   = [];
        $labels    = [];
        for ($i = 0; $i < $monthsBack; $i++) {
            $month = (clone $start)->addMonths($i);
            $labels[] = ucfirst($month->locale('fr')->isoFormat('MMM'));
            $confirmed[$month->format('Y-m')] = 0.0;
            $pending[$month->format('Y-m')]   = 0.0;
        }

        $rows = AffilieTransaction::query()
            ->where('affilie_id', $affilie->id)
            ->where('type', AffilieTransactionType::Commission)
            ->where('created_at', '>=', $start)
            ->get(['amount', 'status', 'created_at']);

        foreach ($rows as $row) {
            $key = Carbon::parse($row->created_at)->format('Y-m');
            $status = $row->status instanceof AffilieTransactionStatus
                ? $row->status
                : AffilieTransactionStatus::tryFrom((string) $row->status);

            if ($status === AffilieTransactionStatus::Pending) {
                if (array_key_exists($key, $pending)) {
                    $pending[$key] += (float) $row->amount;
                }
            } elseif (in_array($status, [AffilieTransactionStatus::Confirmed, AffilieTransactionStatus::Paid], true)) {
                if (array_key_exists($key, $confirmed)) {
                    $confirmed[$key] += (float) $row->amount;
                }
            }
        }

        return [
            'datasets' => [
                [
                    'label'                => 'Confirmé (DT)',
                    'data'                 => array_map(fn ($v) => round($v, 3), array_values($confirmed)),
                    'backgroundColor'      => 'rgba(213, 59, 4, 0.18)',
                    'borderColor'          => '#D53B04',
                    'borderWidth'          => 2,
                    'fill'                 => true,
                    'tension'              => 0.35,
                    'pointBackgroundColor' => '#D53B04',
                    'pointRadius'          => 3,
                ],
                [
                    'label'       => 'En attente (DT)',
                    'data'        => array_map(fn ($v) => round($v, 3), array_values($pending)),
                    'backgroundColor' => 'rgba(245, 158, 11, 0.10)',
                    'borderColor' => '#F59E0B',
                    'borderWidth' => 2,
                    'borderDash'  => [5, 4],
                    'fill'        => false,
                    'tension'     => 0.35,
                    'pointRadius' => 2,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    protected function getOptions(): array
    {
        return [
            'maintainAspectRatio' => false,
            'plugins' => [
                'legend' => ['display' => true, 'position' => 'bottom'],
            ],
            'scales' => [
                'y' => ['beginAtZero' => true],
            ],
        ];
    }
}
