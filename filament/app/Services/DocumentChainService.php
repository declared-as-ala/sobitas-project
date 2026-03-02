<?php

namespace App\Services;

use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\CreditNoteResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\QuotationResource;
use App\Models\Commande;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Quotation;
use Illuminate\Support\Facades\Schema;

/**
 * Builds the document chain (Devis → Commande → BL → Facture TVA → Paiement → Avoir)
 * for timeline display. Returns an array of nodes with label, number, url, status, date, total, isCurrent, createAction.
 */
class DocumentChainService
{
    public const TYPE_QUOTATION = 'quotation';
    public const TYPE_COMMANDE = 'commande';
    public const TYPE_FACTURE = 'facture'; // BL
    public const TYPE_FACTURE_TVA = 'facture_tva';
    public const TYPE_TICKET = 'ticket';

    /**
     * @param Quotation|Commande|Facture|FactureTva|\App\Models\Ticket $record
     * @param string $currentType
     * @return array<int, array{type: string, label: string, number: string|null, url: string|null, status: string|null, date: string|null, total: string|null, isCurrent: bool, createAction: array|null}>
     */
    public function getChain($record, string $currentType): array
    {
        $quotation = null;
        $commande = null;
        $facture = null;
        $factureTva = null;
        $paidTotal = null;
        $creditNoteCount = 0;
        $hasFactureId = Schema::hasColumn('facture_tvas', 'facture_id');

        switch ($currentType) {
            case self::TYPE_QUOTATION:
                $quotation = $record;
                $commande = $quotation->commandes()->first();
                $facture = $commande?->factures()->first();
                $factureTva = $hasFactureId && $facture ? $facture->factureTvas()->first() : null;
                if ($factureTva && Schema::hasTable('payments')) {
                    $paidTotal = (float) $factureTva->payments()->where('status', 'succeeded')->sum('amount');
                }
                if ($factureTva) {
                    $creditNoteCount = $factureTva->creditNotes()->count();
                }
                break;
            case self::TYPE_COMMANDE:
                $commande = $record;
                $quotation = $commande->quotation;
                $facture = $commande->factures()->first();
                $factureTva = $hasFactureId && $facture ? $facture->factureTvas()->first() : null;
                if ($factureTva && Schema::hasTable('payments')) {
                    $paidTotal = (float) $factureTva->payments()->where('status', 'succeeded')->sum('amount');
                }
                if ($factureTva) {
                    $creditNoteCount = $factureTva->creditNotes()->count();
                }
                break;
            case self::TYPE_FACTURE:
                $facture = $record;
                $commande = $facture->commande;
                $quotation = $commande?->quotation;
                $factureTva = $hasFactureId ? $facture->factureTvas()->first() : null;
                if ($factureTva && Schema::hasTable('payments')) {
                    $paidTotal = (float) $factureTva->payments()->where('status', 'succeeded')->sum('amount');
                }
                if ($factureTva) {
                    $creditNoteCount = $factureTva->creditNotes()->count();
                }
                break;
            case self::TYPE_FACTURE_TVA:
                $factureTva = $record;
                $facture = $hasFactureId ? $factureTva->facture : null;
                $commande = $factureTva->commande ?? $facture?->commande;
                $quotation = $commande?->quotation;
                if (Schema::hasTable('payments')) {
                    $paidTotal = (float) $factureTva->payments()->where('status', 'succeeded')->sum('amount');
                }
                $creditNoteCount = $factureTva->creditNotes()->count();
                break;
            case self::TYPE_TICKET:
                return $this->ticketChain($record);
            default:
                return [];
        }

        $nodes = [];
        $nodes[] = $this->nodeQuotation($quotation, $currentType === self::TYPE_QUOTATION, $record);
        $nodes[] = $this->nodeCommande($commande, $quotation, $currentType === self::TYPE_COMMANDE, $record);
        $nodes[] = $this->nodeFacture($facture, $commande, $currentType === self::TYPE_FACTURE, $record);
        $nodes[] = $this->nodeFactureTva($factureTva, $facture, $currentType === self::TYPE_FACTURE_TVA, $record);
        $nodes[] = $this->nodePaiement($paidTotal, $factureTva, $currentType, $record);
        $nodes[] = $this->nodeAvoir($creditNoteCount, $factureTva, $currentType, $record);

        return $nodes;
    }

    private function nodeQuotation(?Quotation $q, bool $isCurrent, $record): array
    {
        $createAction = null;
        if (!$q && $isCurrent) {
            $createAction = ['label' => 'Créer à partir du devis', 'url' => null];
        }
        return [
            'type' => 'quotation',
            'label' => 'Devis',
            'number' => $q?->numero,
            'url' => $q ? QuotationResource::getUrl('edit', ['record' => $q]) : null,
            'status' => $q ? $this->quotationStatus($q) : null,
            'date' => $q && $q->date_quotation ? $q->date_quotation->format('d/m/Y') : ($q?->created_at?->format('d/m/Y')),
            'total' => $q ? number_format((float)($q->prix_ttc ?? $q->prix_total ?? 0), 2, ',', ' ') . ' DT' : null,
            'isCurrent' => $isCurrent,
            'createAction' => $createAction,
        ];
    }

    private function nodeCommande(?Commande $c, ?Quotation $quotation, bool $isCurrent, $record): array
    {
        $createAction = null;
        if (!$c && $quotation && $record instanceof Quotation) {
            $createAction = ['label' => 'Créer commande', 'url' => null];
        }
        return [
            'type' => 'commande',
            'label' => 'Commande',
            'number' => $c?->numero,
            'url' => $c ? CommandeResource::getUrl('edit', ['record' => $c]) : null,
            'status' => $c ? Commande::getStatusLabel($c->etat ?? '') : null,
            'date' => $c?->created_at?->format('d/m/Y'),
            'total' => $c ? number_format((float)($c->prix_ttc ?? 0), 2, ',', ' ') . ' DT' : null,
            'isCurrent' => $isCurrent,
            'createAction' => $createAction,
        ];
    }

    private function nodeFacture(?Facture $f, ?Commande $commande, bool $isCurrent, $record): array
    {
        $createAction = null;
        if (!$f && $commande && $record instanceof Commande) {
            $createAction = ['label' => 'Créer BL', 'url' => null];
        }
        return [
            'type' => 'facture',
            'label' => 'BL',
            'number' => $f?->numero,
            'url' => $f ? FactureResource::getUrl('edit', ['record' => $f]) : null,
            'status' => $f ? $this->blStatus($f) : null,
            'date' => $f?->created_at?->format('d/m/Y'),
            'total' => $f ? number_format((float)($f->prix_ttc ?? 0), 2, ',', ' ') . ' DT' : null,
            'isCurrent' => $isCurrent,
            'createAction' => $createAction,
        ];
    }

    private function nodeFactureTva(?FactureTva $ft, ?Facture $facture, bool $isCurrent, $record): array
    {
        $createAction = null;
        if (!$ft && $facture && $record instanceof Facture && Schema::hasColumn('facture_tvas', 'facture_id')) {
            $createAction = ['label' => 'Créer facture TVA', 'url' => null];
        }
        return [
            'type' => 'facture_tva',
            'label' => 'Facture TVA',
            'number' => $ft?->numero,
            'url' => $ft ? FactureTvaResource::getUrl('edit', ['record' => $ft]) : null,
            'status' => $ft ? $this->invoiceStatus($ft) : null,
            'date' => $ft && $ft->date_facture ? $ft->date_facture->format('d/m/Y') : ($ft?->created_at?->format('d/m/Y')),
            'total' => $ft ? number_format((float)($ft->prix_ttc ?? $ft->prix_total ?? 0), 2, ',', ' ') . ' DT' : null,
            'isCurrent' => $isCurrent,
            'createAction' => $createAction,
        ];
    }

    private function nodePaiement(?float $paidTotal, ?FactureTva $ft, string $currentType, $record): array
    {
        $hasPayment = $paidTotal !== null && $paidTotal > 0;
        return [
            'type' => 'paiement',
            'label' => 'Paiement',
            'number' => $hasPayment ? number_format($paidTotal, 2, ',', ' ') . ' DT' : null,
            'url' => null,
            'status' => $hasPayment ? 'Encaissé' : null,
            'date' => null,
            'total' => $hasPayment ? number_format($paidTotal, 2, ',', ' ') . ' DT' : null,
            'isCurrent' => false,
            'createAction' => (!$hasPayment && $ft && $currentType === self::TYPE_FACTURE_TVA) ? ['label' => 'Enregistrer paiement', 'url' => null] : null,
        ];
    }

    private function nodeAvoir(int $creditNoteCount, ?FactureTva $ft, string $currentType, $record): array
    {
        $hasAvoir = $creditNoteCount > 0;
        return [
            'type' => 'avoir',
            'label' => 'Avoir',
            'number' => $hasAvoir ? (string) $creditNoteCount : null,
            'url' => $ft && $hasAvoir ? CreditNoteResource::getUrl('index') . '?tableFilters[facture_tva_id][value]=' . $ft->id : null,
            'status' => $hasAvoir ? 'Créé(s)' : null,
            'date' => null,
            'total' => null,
            'isCurrent' => false,
            'createAction' => (!$hasAvoir && $ft && $currentType === self::TYPE_FACTURE_TVA) ? ['label' => 'Créer avoir', 'url' => CreditNoteResource::getUrl('create') . '?facture_tva_id=' . $ft->id] : null,
        ];
    }

    private function ticketChain($ticket): array
    {
        return [
            [
                'type' => 'ticket',
                'label' => 'Ticket',
                'number' => $ticket->numero ?? null,
                'url' => \App\Filament\Resources\TicketResource::getUrl('edit', ['record' => $ticket]),
                'status' => null,
                'date' => $ticket->date_ticket ? \Carbon\Carbon::parse($ticket->date_ticket)->format('d/m/Y') : ($ticket->created_at?->format('d/m/Y')),
                'total' => number_format((float)($ticket->prix_total ?? 0), 2, ',', ' ') . ' DT',
                'isCurrent' => true,
                'createAction' => ['label' => 'Créer facture TVA', 'url' => null],
            ],
        ];
    }

    private function quotationStatus(Quotation $q): string
    {
        $s = $q->statut ?? $q->status?->value ?? null;
        return match ($s) {
            'brouillon', 'draft' => 'Brouillon',
            'valide', 'accepted' => 'Validé',
            'refuse', 'refused' => 'Refusé',
            'en_attente', 'sent' => 'En attente',
            default => (string) $s,
        };
    }

    private function blStatus(Facture $f): string
    {
        $s = $f->status?->value ?? $f->status ?? null;
        return match ($s) {
            'draft' => 'Brouillon',
            'issued' => 'Émis',
            default => (string) $s,
        };
    }

    private function invoiceStatus(FactureTva $ft): string
    {
        $s = $ft->status?->value ?? $ft->status ?? null;
        return match ($s) {
            'draft' => 'Brouillon',
            'issued' => 'Émise',
            'paid' => 'Payée',
            'partially_paid' => 'Partiel',
            'cancelled' => 'Annulée',
            default => (string) $s,
        };
    }
}
