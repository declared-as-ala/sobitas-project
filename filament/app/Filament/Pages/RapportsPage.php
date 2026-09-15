<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;

/**
 * Rapports & Analyses — the "monthly tasks" surface.
 *
 * The heavy GROUP-BY analytics widgets (revenue by source, top products, top
 * regions) were pulled OFF the daily dashboard because firing all of them on
 * every login cold-started six concurrent aggregation queries and returned 503
 * (see Dashboard::getWidgets()). They belong on a page the owner opens
 * deliberately to review a period — which is exactly what this page is.
 *
 * Widgets are rendered via @livewire in the view (each caches its own result),
 * and the shared period filter (DashboardHeaderWidget) drives them all through
 * the session preset + the `dashboardFilterUpdated` event, identical to the
 * dashboard. A plain Page (not a Dashboard subclass) keeps the blast radius to
 * this one route — the panel and the real dashboard are untouched.
 */
class RapportsPage extends Page
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-chart-pie';

    protected static ?string $navigationLabel = 'Rapports & Analyses';

    protected static ?string $title = 'Rapports & Analyses';

    // Top-level (ungrouped) so it sits right under the dashboard — monthly review
    // is a primary activity, not something buried in a group.
    protected static ?int $navigationSort = 1;

    protected string $view = 'filament.pages.rapports';
}
