<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Filament\Widgets\Widget;
use Livewire\Attributes\On;

class DashboardDateFilter extends Widget
{
    protected string $view = 'filament.widgets.dashboard-date-filter';

    protected static ?int $sort = 0; // Show at top

    protected int | string | array $columnSpan = 'full';

    public string $preset = '30d';

    public ?string $customStart = null;

    public ?string $customEnd = null;

    public bool $compareEnabled = true;

    /**
     * Get available filter presets.
     */
    public function getPresets(): array
    {
        return DateRangeFilterService::getPresets();
    }

    /**
     * Update filter and emit event to refresh other widgets.
     */
    public function updateFilter(): void
    {
        // Store in session for persistence
        session([
            'dashboard.filter.preset' => $this->preset,
            'dashboard.filter.custom_start' => $this->customStart,
            'dashboard.filter.custom_end' => $this->customEnd,
            'dashboard.filter.compare' => $this->compareEnabled,
        ]);

        // Emit event to refresh all widgets
        $this->dispatch('dashboardFilterUpdated');
    }

    /**
     * Load saved filter from session.
     */
    public function mount(): void
    {
        $this->preset = session('dashboard.filter.preset', '30d');
        $this->customStart = session('dashboard.filter.custom_start');
        $this->customEnd = session('dashboard.filter.custom_end');
        $this->compareEnabled = session('dashboard.filter.compare', true);
    }
}
