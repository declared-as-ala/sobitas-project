<?php

namespace App\Services\DocumentConversion;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Coordinate;
use App\Models\FactureTva;
use App\Models\Ticket;
use App\Services\InvoiceCalculator;
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
            $invoice->status = InvoiceStatus::Issued;
            if (Schema::hasColumn('facture_tvas', 'date_facture')) {
                $invoice->date_facture = now()->toDateString();
            }
            $details = [];
            foreach ($ticket->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $details[] = [
                    'produit_id' => $line->produit_id,
                    'qte' => (int) ($line->qte ?? $line->quantite ?? 1),
                    'prix_unitaire' => (float) $line->prix_unitaire,
                    'tva_pct' => $defaultTvaPct,
                ];
            }

            $totals = InvoiceCalculator::calculate($details, (float) ($ticket->remise ?? 0), (float) ($ticket->timbre ?? 0), $defaultTvaPct, 0);

            $invoice->prix_ht = $totals['total_ht_brut'];
            $invoice->remise = $totals['remise'];
            $invoice->pourcentage_remise = $totals['pourcentage_remise'];
            $invoice->timbre = $totals['timbre'];
            $invoice->prix_ht_apres_remise = $totals['prix_ht_apres_remise'];
            $invoice->tva = $totals['tva'];
            $invoice->prix_ttc = $totals['prix_ttc'];
            $invoice->net_a_payer = $totals['net_a_payer'];
            $invoice->save();

            foreach ($ticket->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) ($line->qte ?? $line->quantite ?? 1);
                $pu = (float) $line->prix_unitaire;
                $lineHt = $qte * $pu;
                $tvaAmount = $lineHt * $defaultTvaPct / 100;
                \App\Models\DetailsFactureTva::create([
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
