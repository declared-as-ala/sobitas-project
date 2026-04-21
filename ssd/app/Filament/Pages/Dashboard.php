<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\RecentOrdersWidget;
use App\Filament\Widgets\RevenueBySourceWidget;
use App\Filament\Widgets\SalesChartWidget;
use App\Filament\Widgets\StatsOverviewWidget;
use App\Filament\Widgets\TopProductsWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';

    protected static ?string $title = 'Dashboard';

    protected static ?string $navigationLabel = 'Dashboard';

    protected function getHeaderWidgets(): array
    {
        return [
            QuickActionsWidget::class,
            StatsOverviewWidget::class,
        ];
    }

    protected function getWidgets(): array
    {
        return [
            QuickActionsWidget::class,
            StatsOverviewWidget::class,
            SalesChartWidget::class,
            RevenueBySourceWidget::class,
            RecentOrdersWidget::class,
            TopProductsWidget::class,
        ];
    }

    protected function getColumns(): int | string | array
    {
        return [
            'md' => 2,
            'xl' => 3,
        ];
    }
}
