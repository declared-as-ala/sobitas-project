<?php

namespace App\Filament\Widgets;

use App\Services\DashboardMetricsService;
use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Livewire\Attributes\On;

class MarketplaceKpis extends BaseWidget
{
    protected static ?int $sort = 10;

    protected static bool $isLazy = true;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = null; // Manual refresh only

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
        // This will trigger getStats() again
    }

    protected function getStats(): array
    {
        $period = $this->getCurrentPeriod();
        $service = new DashboardMetricsService($period);
        $compare = session('dashboard.filter.compare', true);

        // GMV
        $gmv = $service->getGMV($compare);
        $gmvStat = Stat::make('GMV', number_format($gmv['current'], 2, '.', ' ') . ' DT')
            ->description($compare ? $this->formatChange($gmv['change']) : 'Total commandes')
            ->descriptionIcon($compare ? $this->getChangeIcon($gmv['change']) : 'heroicon-m-banknotes')
            ->color($this->getChangeColor($gmv['change']));

        // Net Revenue
        $netRev = $service->getNetRevenue($compare);
        $netRevStat = Stat::make('Revenu Net', number_format($netRev['current'], 2, '.', ' ') . ' DT')
            ->description($compare ? $this->formatChange($netRev['change']) : 'GMV - Remb. - Remises')
            ->descriptionIcon($compare ? $this->getChangeIcon($netRev['change']) : 'heroicon-m-currency-dollar')
            ->color($this->getChangeColor($netRev['change']));

        // Orders Count
        $orders = $service->getOrdersCount($compare);
        $ordersStat = Stat::make('Commandes', $orders['current'])
            ->description($compare ? $this->formatChange($orders['change']) : 'Total période')
            ->descriptionIcon($compare ? $this->getChangeIcon($orders['change']) : 'heroicon-m-shopping-cart')
            ->color($this->getChangeColor($orders['change']));

        // AOV
        $aov = $service->getAOV($compare);
        $aovStat = Stat::make('Panier Moyen', number_format($aov['current'], 2, '.', ' ') . ' DT')
            ->description($compare ? $this->formatChange($aov['change']) : 'AOV moyen')
            ->descriptionIcon($compare ? $this->getChangeIcon($aov['change']) : 'heroicon-m-calculator')
            ->color($this->getChangeColor($aov['change']));

        // Cancellation Rate
        $cancelRate = $service->getCancellationRate($compare);
        $cancelStat = Stat::make('Taux d\'Annulation', $cancelRate['current'] . '%')
            ->description($compare ? $this->formatAbsoluteChange($cancelRate['change']) : 'Commandes annulées')
            ->descriptionIcon($compare ? $this->getChangeIcon(-$cancelRate['change']) : 'heroicon-m-x-circle')
            ->color($this->getChangeColor(-$cancelRate['change'])); // Inverse: lower is better

        // Refund Rate
        $refundRate = $service->getRefundRate($compare);
        $refundStat = Stat::make('Taux de Remboursement', $refundRate['current'] . '%')
            ->description($compare ? $this->formatAbsoluteChange($refundRate['change']) : 'Commandes remboursées')
            ->descriptionIcon($compare ? $this->getChangeIcon(-$refundRate['change']) : 'heroicon-m-arrow-uturn-left')
            ->color($this->getChangeColor(-$refundRate['change']));

        // Customer Metrics
        $customers = $service->getCustomerMetrics($compare);
        $customerStat = Stat::make('Nouveaux Clients', $customers['new_customers'])
            ->description($compare 
                ? "{$customers['returning_customers']} récurrents (" . $this->formatChange($customers['change_new']) . ")"
                : "{$customers['returning_customers']} récurrents"
            )
            ->descriptionIcon('heroicon-m-users')
            ->color($this->getChangeColor($customers['change_new'] ?? 0));

        // Avg Fulfillment Time
        $fulfillment = $service->getAvgFulfillmentTime($compare);
        $fulfillmentStat = Stat::make('Temps de Livraison Moy.', round($fulfillment['current'], 1) . 'h')
            ->description($compare ? $this->formatChange($fulfillment['change']) : 'Création → Livraison')
            ->descriptionIcon($compare ? $this->getChangeIcon(-$fulfillment['change']) : 'heroicon-m-clock')
            ->color($this->getChangeColor(-$fulfillment['change'])); // Inverse: lower is better

        return [
            $gmvStat,
            $netRevStat,
            $ordersStat,
            $aovStat,
            $cancelStat,
            $refundStat,
            $customerStat,
            $fulfillmentStat,
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

    private function formatChange(float $change): string
    {
        $sign = $change >= 0 ? '+' : '';

        return "{$sign}" . number_format($change, 1) . '% vs période préc.';
    }

    private function formatAbsoluteChange(float $change): string
    {
        $sign = $change >= 0 ? '+' : '';

        return "{$sign}" . number_format($change, 2) . '% vs période préc.';
    }

    private function getChangeIcon(float $change): string
    {
        return $change >= 0 ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down';
    }

    private function getChangeColor(float $change): string
    {
        if ($change > 5) {
            return 'success';
        }
        if ($change < -5) {
            return 'danger';
        }

        return 'warning';
    }
}
