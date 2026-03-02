<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

class OperationsWidget extends Widget
{
    protected string $view = 'filament.widgets.operations-widget';
    
    protected int | string | array $columnSpan = 'full';
    
    public static function canView(): bool
    {
        return false; // Disable this widget
    }
}
