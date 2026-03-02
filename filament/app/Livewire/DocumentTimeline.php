<?php

namespace App\Livewire;

use App\Services\DocumentChainService;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\TicketResource;
use Livewire\Component;

class DocumentTimeline extends Component
{
    public array $chain = [];

    public ?string $documentType = null;

    public function mount(): void
    {
        $this->resolveChainFromRoute();
    }

    public function resolveChainFromRoute(): void
    {
        $route = request()->route();
        if (!$route) {
            return;
        }
        $params = $route->parameters();
        $name = $route->getName() ?? '';
        $segments = request()->segments();
        $resource = $segments[1] ?? null;
        $id = $params['record'] ?? $segments[2] ?? null;
        $action = $segments[3] ?? null;
        if ($action !== 'edit' && !str_ends_with($name ?? '', 'edit')) {
            return;
        }

        $map = [
            'quotations' => [\App\Models\Quotation::class, DocumentChainService::TYPE_QUOTATION],
            'commandes' => [\App\Models\Commande::class, DocumentChainService::TYPE_COMMANDE],
            'factures' => [\App\Models\Facture::class, DocumentChainService::TYPE_FACTURE],
            'facture-tvas' => [\App\Models\FactureTva::class, DocumentChainService::TYPE_FACTURE_TVA],
            'tickets' => [\App\Models\Ticket::class, DocumentChainService::TYPE_TICKET],
        ];

        if (!isset($map[$resource])) {
            return;
        }
        [$modelClass, $type] = $map[$resource];
        $record = is_object($id) ? $id : $modelClass::find($id);
        if ($record) {
            $this->chain = app(DocumentChainService::class)->getChain($record, $type);
            $this->documentType = $type;
        }
    }

    public function render()
    {
        return view('filament.livewire.document-timeline', [
            'chain' => $this->chain,
            'documentType' => $this->documentType,
        ]);
    }
}
