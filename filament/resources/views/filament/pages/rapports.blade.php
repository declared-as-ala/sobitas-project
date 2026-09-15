<x-filament-panels::page>
    {{--
        Monthly-analysis surface. Each widget is a self-contained, cached Livewire
        component; the period filter at the top drives them via the shared session
        preset + `dashboardFilterUpdated`. Layout is a 2-column grid that collapses
        to one column on tablets/phones.
    --}}
    <style>
        .rap-intro {
            font-size: 0.875rem;
            color: #6b7280;
            margin: -0.25rem 0 0.25rem;
        }
        .dark .rap-intro { color: #9ca3af; }

        .rap-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            align-items: start;
        }
        .rap-span-2 { grid-column: 1 / -1; }

        @media (max-width: 1024px) {
            .rap-grid { grid-template-columns: 1fr; }
        }
    </style>

    <p class="rap-intro">
        Analyse par période — chiffre d'affaires, sources de vente, meilleurs produits et régions.
        Choisissez la période ci-dessous pour actualiser tous les rapports.
    </p>

    {{-- Period filter — writes the shared session preset and dispatches dashboardFilterUpdated --}}
    @livewire(\App\Filament\Widgets\DashboardHeaderWidget::class)

    <div class="rap-grid">
        {{-- Row 1: two charts side by side --}}
        @livewire(\App\Filament\Widgets\MonthlyRevenueComparison::class)
        @livewire(\App\Filament\Widgets\RevenueBySourcePieChart::class)

        {{-- Rows 2-3: full-width tables --}}
        <div class="rap-span-2">
            @livewire(\App\Filament\Widgets\TopProductsWidget::class)
        </div>
        <div class="rap-span-2">
            @livewire(\App\Filament\Widgets\TopRegionsWidget::class)
        </div>
    </div>
</x-filament-panels::page>
