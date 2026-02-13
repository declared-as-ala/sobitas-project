<?php

namespace App\Filament\Widgets;

use App\Commande;
use App\Facture;
use App\FactureTva;
use App\Ticket;
use Carbon\Carbon;
use Filament\Widgets\Widget;

class QuickActionsWidget extends Widget
{
    protected static string $view = 'filament.widgets.quick-actions-widget';

    protected static ?int $sort = 0;

    protected int | string | array $columnSpan = 'full';

    public function getActions(): array
    {
        return [
            [
                'label' => 'New Ticket',
                'icon' => 'heroicon-o-document-text',
                'url' => route('voyager.ticket'),
                'color' => 'success',
                'description' => 'Create a new ticket',
            ],
            [
                'label' => 'New BL',
                'icon' => 'heroicon-o-document',
                'url' => route('voyager.facture'),
                'color' => 'primary',
                'description' => 'Bon de livraison',
            ],
            [
                'label' => 'New Facture TVA',
                'icon' => 'heroicon-o-receipt-percent',
                'url' => route('voyager.facture_tva'),
                'color' => 'danger',
                'description' => 'Invoice with VAT',
            ],
            [
                'label' => 'New Quotation',
                'icon' => 'heroicon-o-calculator',
                'url' => route('voyager.quotations'),
                'color' => 'warning',
                'description' => 'Create quotation',
            ],
        ];
    }

    public function getTodayStats(): array
    {
        $today = Carbon::today();
        
        return [
            'revenue' => Facture::whereDate('created_at', $today)->sum('prix_ttc') +
                FactureTva::whereDate('created_at', $today)->sum('prix_ttc') +
                Ticket::whereDate('created_at', $today)->sum('prix_ttc'),
            'orders' => Commande::whereDate('created_at', $today)->count() +
                Facture::whereDate('created_at', $today)->count() +
                FactureTva::whereDate('created_at', $today)->count() +
                Ticket::whereDate('created_at', $today)->count(),
        ];
    }
}
