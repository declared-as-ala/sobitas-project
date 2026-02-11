<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

class StockPanelWidget extends Widget
{
    protected string $view = 'filament.widgets.stock-panel-widget';
    
    protected int | string | array $columnSpan = 'full';
    
    public static function canView(): bool
    {
        return false; // Disable this widget
    }
}
