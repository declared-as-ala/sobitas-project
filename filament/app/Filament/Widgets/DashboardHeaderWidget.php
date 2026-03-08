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

    /**
     * Source of truth: URL (?period=) then session. Persist to session so widgets read the same value.
     */
    public function mount(): void
    {
        $fromUrl = request()->query('period');
        if ($fromUrl !== null && $fromUrl !== '') {
            session(['dashboard.filter.preset' => $fromUrl]);
            $this->preset = $fromUrl;
        } else {
            $this->preset = session('dashboard.filter.preset', '30d');
        }
    }
}
