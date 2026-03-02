<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

/**
 * Renders the document chain timeline (Devis → Commande → BL → Facture TVA → Paiement → Avoir).
 * The Livewire component DocumentTimeline resolves the record from the current route.
 */
class DocumentTimelineWidget extends Widget
{
    protected string $view = 'filament.widgets.document-timeline-widget';

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = false;

    protected static bool $isDiscovered = false;
}
