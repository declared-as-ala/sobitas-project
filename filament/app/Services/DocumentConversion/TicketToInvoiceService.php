<?php

namespace App\Services\DocumentConversion;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Coordinate;
use App\Models\DetailsFactureTva;
use App\Models\FactureTva;
use App\Models\Ticket;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Creates a FactureTva linked to a Ticket (ticket de caisse). source_ticket_id is set so it does NOT add to CA.
 */
class TicketToInvoiceService
{
    public function __construct(
        protected \App\Services\NumberSequenceService $numberSequence
    ) {}

    public function createInvoiceFromTicket(Ticket $ticket): FactureTva
    {
        return DB::transaction(function () use ($ticket) {
            $ticket->load('details.product');

            $coordinate = Coordinate::getCached();
            $defaultTvaPct = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

            $invoice = new FactureTva();
            $invoice->source_ticket_id = $ticket->id;
            $invoice->client_id = $ticket->client_id;
            $invoice->numero = $this->numberSequence->nextFacture();
            $invoice->status = InvoiceStatus::Draft;
            if (Schema::hasColumn('facture_tvas', 'date_facture')) {
                $invoice->date_facture = now()->toDateString();
            }
            $invoice->prix_ht = (float) ($ticket->prix_ht ?? 0);
            $invoice->timbre = (float) ($ticket->timbre ?? 0);
            $invoice->remise = (float) ($ticket->remise ?? 0);

            $totalHt = 0.0;
            $totalTva = 0.0;
            foreach ($ticket->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) ($line->qte ?? $line->quantite ?? 0);
                $pu = (float) $line->prix_unitaire;
                $lineHt = $qte * $pu;
                $tvaAmount = $lineHt * $defaultTvaPct / 100;
                $totalHt += $lineHt;
                $totalTva += $tvaAmount;
            }
            $invoice->tva = $totalTva;
            $invoice->prix_ttc = $totalHt + $totalTva - (float) $invoice->remise + (float) $invoice->timbre;
            $invoice->save();

            foreach ($ticket->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) ($line->qte ?? $line->quantite ?? 0);
                $pu = (float) $line->prix_unitaire;
                $lineHt = $qte * $pu;
                $tvaAmount = $lineHt * $defaultTvaPct / 100;
                DetailsFactureTva::create([
                    'facture_tva_id' => $invoice->id,
                    'produit_id' => $line->produit_id,
                    'qte' => $qte,
                    'prix_unitaire' => $pu,
                    'prix_ht' => $lineHt,
                    'tva' => $defaultTvaPct,
                    'prix_ttc' => $lineHt + $tvaAmount,
                ]);
            }

            if (class_exists(AuditLog::class) && Schema::hasTable('audit_logs')) {
                AuditLog::create([
                    'user_id' => Auth::id(),
                    'action' => 'ticket.converted_to_invoice',
                    'entity_type' => 'ticket',
                    'entity_id' => $ticket->id,
                    'after' => ['facture_tva_id' => $invoice->id],
                ]);
            }

            return $invoice->fresh(['details']);
        });
    }
}
