<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;
use App\Filament\Resources\TicketResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\ClientResource;
use App\Filament\Resources\ProductResource;
use App\Filament\Resources\ArticleResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\ProductPriceListResource;

class QuickActionsWidget extends Widget
{
    protected string $view = 'filament.widgets.quick-actions-widget';

    protected static ?int $sort = -99;

    protected int | string | array $columnSpan = 1;
    
    protected static bool $isLazy = false;

    public function getActions(): array
    {
        return [
            [
                'label' => 'Ajouter Ticket',
                'icon' => 'heroicon-o-ticket',
                'url' => TicketResource::getUrl('create'),
                'color' => 'blue',
            ],
            [
                'label' => 'Ajouter BL',
                'icon' => 'heroicon-o-document-text',
                'url' => FactureResource::getUrl('create'),
                'color' => 'green',
            ],
            [
                'label' => 'Ajouter Facture (TVA)',
                'icon' => 'heroicon-o-banknotes',
                'url' => FactureTvaResource::getUrl('create'),
                'color' => 'emerald',
            ],
            [
                'label' => 'Ajouter Client',
                'icon' => 'heroicon-o-user-plus',
                'url' => ClientResource::getUrl('create'),
                'color' => 'red',
            ],
            [
                'label' => 'Ajouter Produit',
                'icon' => 'heroicon-o-cube',
                'url' => ProductResource::getUrl('create'),
                'color' => 'purple',
            ],
            [
                'label' => 'Ajouter Blog',
                'icon' => 'heroicon-o-pencil-square',
                'url' => ArticleResource::getUrl('create'),
                'color' => 'indigo',
            ],
            [
                'label' => 'Ajouter Devis',
                'icon' => 'heroicon-o-document-check',
                'url' => QuotationResource::getUrl('create'),
                'color' => 'teal',
            ],
            [
                'label' => 'Ajouter Liste de Prix',
                'icon' => 'heroicon-o-clipboard-document-list',
                'url' => ProductPriceListResource::getUrl('create'),
                'color' => 'amber',
            ],
        ];
    }
}
