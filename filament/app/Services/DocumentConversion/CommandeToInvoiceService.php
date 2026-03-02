<?php

namespace App\Services\DocumentConversion;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\Coordinate;
use App\Models\DetailsFactureTva;
use App\Models\FactureTva;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Creates a FactureTva linked to a Commande. commande_id is set so it does NOT add to CA.
 */
class CommandeToInvoiceService
{
    public function __construct(
        protected \App\Services\NumberSequenceService $numberSequence
    ) {}

    public function createInvoiceFromCommande(Commande $order): FactureTva
    {
        return DB::transaction(function () use ($order) {
            $order->load('details.product');

            $coordinate = Coordinate::getCached();
            $defaultTvaPct = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

            $invoice = new FactureTva();
            $invoice->commande_id = $order->id;
            $invoice->client_id = $order->user_id ?? null;
            $invoice->numero = $this->numberSequence->nextFacture();
            $invoice->status = InvoiceStatus::Draft;
            if (Schema::hasColumn('facture_tvas', 'date_facture')) {
                $invoice->date_facture = now()->toDateString();
            }
            $invoice->prix_ht = (float) $order->prix_ht;
            $invoice->timbre = (float) ($order->timbre ?? 0);
            $invoice->remise = (float) ($order->remise ?? 0);

            $totalHt = 0.0;
            $totalTva = 0.0;
            foreach ($order->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) $line->qte;
                $pu = (float) $line->prix_unitaire;
                $lineHt = $qte * $pu;
                $tvaAmount = $lineHt * $defaultTvaPct / 100;
                $totalHt += $lineHt;
                $totalTva += $tvaAmount;
            }
            $invoice->tva = $totalTva;
            $invoice->prix_ttc = $totalHt + $totalTva - (float) $invoice->remise + (float) $invoice->timbre;
            $invoice->save();

            foreach ($order->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) $line->qte;
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
                    'action' => 'commande.converted_to_invoice',
                    'entity_type' => 'commande',
                    'entity_id' => $order->id,
                    'after' => ['facture_tva_id' => $invoice->id],
                ]);
            }

            return $invoice->fresh(['details']);
        });
    }
}
