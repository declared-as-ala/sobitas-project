<?php

namespace App\Services\DocumentConversion;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\Coordinate;
use App\Models\DetailsFactureTva;
use App\Models\FactureTva;
use App\Services\InvoiceCalculator;
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
            $invoice->status = InvoiceStatus::Issued;
            if (Schema::hasColumn('facture_tvas', 'date_facture')) {
                $invoice->date_facture = now()->toDateString();
            }
            $remise = (float) ($order->remise ?? 0);
            $timbre = (float) ($order->timbre ?? 0);

            $details = $order->details
                ->filter(fn ($line) => !empty($line->produit_id))
                ->map(fn ($line) => [
                    'produit_id' => $line->produit_id,
                    'qte' => (int) $line->qte,
                    'prix_unitaire' => (float) $line->prix_unitaire,
                    'tva_pct' => $defaultTvaPct,
                ])->values()->toArray();

            $calc = InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTvaPct);

            $invoice->prix_ht = $calc['total_ht_brut'];
            $invoice->remise = $calc['remise'];
            $invoice->pourcentage_remise = $calc['pourcentage_remise'];
            $invoice->prix_ht_apres_remise = $calc['prix_ht_apres_remise'];
            $invoice->tva = $calc['tva'];
            $invoice->timbre = $calc['timbre'];
            $invoice->prix_ttc = $calc['prix_ttc'];
            $invoice->net_a_payer = $calc['net_a_payer'];
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
