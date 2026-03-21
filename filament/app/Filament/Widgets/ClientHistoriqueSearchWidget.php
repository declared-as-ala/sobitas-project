<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

/**
 * Client search form (Blade only).
 *
 * Filament renders this widget’s view inside {@see \App\Filament\Pages\Dashboard},
 * so Livewire state and actions ({@see \App\Filament\Pages\Dashboard::submitClientHistoriqueSearch},
 * tel/name, etc.) live on the Dashboard page — not on this class.
 */
class ClientHistoriqueSearchWidget extends Widget
{
    protected string $view = 'filament.widgets.client-historique-search-widget';

    protected static ?int $sort = -150;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = false;
}
