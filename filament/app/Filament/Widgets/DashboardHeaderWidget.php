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
     * Read preset from session on mount and on every hydration.
     * Session is set by Dashboard::mount() on first load (from URL),
     * then kept in sync by updatedPreset() on every filter click.
     */
    public function mount(): void
    {
        $this->preset = session('dashboard.filter.preset', '30d');
    }

    public function hydrate(): void
    {
        // Re-read from session on every Livewire hydration so the selected
        // period chip stays in sync after any server-side update.
        $fromSession = session('dashboard.filter.preset');
        if ($fromSession !== null && $fromSession !== '') {
            $this->preset = $fromSession;
        }
    }
}
