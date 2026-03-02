<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

class AdvancedKpisWidget extends Widget
{
    protected string $view = 'filament.widgets.advanced-kpis-widget';
    
    protected int | string | array $columnSpan = 'full';
    
    public static function canView(): bool
    {
        return false; // Disable this widget
    }
}
