<?php

namespace App\Filament\Widgets;

use App\Services\DashboardMetricsService;
use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Cache;
use Livewire\Attributes\On;

class MarketplaceKpis extends BaseWidget
{
    protected static ?int $sort = 8;

    protected static bool $isLazy = true;

    protected int | string | array $columnSpan = 1;

    protected ?string $pollingInterval = null; // Manual refresh only

    #[On('dashboardFilterUpdated')]
    public function refresh(): void
    {
        // This will trigger getStats() again
    }

    protected function getStats(): array
    {
        $cacheKey = 'dashboard:marketplace_kpis:' . md5(json_encode($this->getCurrentPeriod()) . (session('dashboard.filter.compare', true) ? '1' : '0'));
        return Cache::remember($cacheKey, 60, function () {
            return $this->buildStats();
        });
    }

    private function buildStats(): array
    {
        $period = $this->getCurrentPeriod();
        $service = new DashboardMetricsService($period);
        $compare = session('dashboard.filter.compare', true);

        // Orders Count
        $orders = $service->getOrdersCount($compare);
        $ordersStat = Stat::make('Commandes', $orders['current'])
            ->description($compare ? $this->formatChange($orders['change']) : 'Total période')
            ->descriptionIcon($compare ? $this->getChangeIcon($orders['change']) : 'heroicon-m-shopping-cart')
            ->color($this->getChangeColor($orders['change']));

        // Customer Metrics
        $customers = $service->getCustomerMetrics($compare);
        $customerStat = Stat::make('Nouveaux Clients', $customers['new_customers'])
            ->description($compare 
                ? "{$customers['returning_customers']} récurrents (" . $this->formatChange($customers['change_new']) . ")"
                : "{$customers['returning_customers']} récurrents"
            )
            ->descriptionIcon('heroicon-m-users')
            ->color($this->getChangeColor($customers['change_new'] ?? 0));

        return [
            $ordersStat,
            $customerStat,
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
