<?php

namespace App\Filament\Widgets;

use App\Filament\Support\DashboardHeaderActions;
use Filament\Widgets\Widget;

class DashboardHeaderWidget extends Widget
{
    use DashboardHeaderActions;

    protected string $view = 'filament.widgets.dashboard-header-widget';
    
    protected static ?int $sort = -100;
    
    protected int | string | array $columnSpan = 'full';
    
    protected static bool $isLazy = false;

    public function mount(): void
    {
        $this->preset = session('dashboard.filter.preset', '30d');
    }
}
