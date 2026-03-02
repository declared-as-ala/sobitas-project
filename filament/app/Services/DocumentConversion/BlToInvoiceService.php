<?php

namespace App\Services\DocumentConversion;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Coordinate;
use App\Models\DetailsFactureTva;
use App\Models\Facture;
use App\Models\FactureTva;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BlToInvoiceService
{
    public function __construct(
        protected \App\Services\NumberSequenceService $numberSequence
    ) {}

    /**
     * Create an invoice (FactureTva) from a BL (Facture). Copies lines with TVA. Does NOT decrement stock.
     */
    public function createInvoiceFromBl(Facture $bl): FactureTva
    {
        return DB::transaction(function () use ($bl) {
            $bl->load('details.product');

            $coordinate = Coordinate::getCached();
            $defaultTvaPct = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

            $invoice = new FactureTva();
            if (Schema::hasColumn('facture_tvas', 'facture_id')) {
                $invoice->facture_id = $bl->id;
            }
            $invoice->client_id = $bl->client_id;
            $invoice->numero = $this->numberSequence->nextFacture();
            $invoice->status = InvoiceStatus::Draft;
            if (Schema::hasColumn('facture_tvas', 'date_facture')) {
                $invoice->date_facture = now()->toDateString();
            }
            $invoice->prix_ht = (float) $bl->prix_ht;
            $invoice->timbre = (float) ($bl->timbre ?? 0);
            $invoice->remise = (float) ($bl->remise ?? 0);

            $totalHt = 0.0;
            $totalTva = 0.0;
            foreach ($bl->details as $line) {
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
            // Do not set prix_total: facture_tvas table has no prix_total column (total is in prix_ttc)
            $invoice->save();

            foreach ($bl->details as $line) {
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

            $this->audit('bl.converted_to_invoice', $bl, [
                'facture_id' => $bl->id,
                'facture_tva_id' => $invoice->id,
            ]);

            return $invoice->fresh(['details']);
        });
    }

    protected function audit(string $action, $entity, array $after = []): void
    {
        if (! class_exists(AuditLog::class) || ! Schema::hasTable('audit_logs')) {
            return;
        }
        AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'entity_type' => $entity instanceof Facture ? 'facture' : get_class($entity),
            'entity_id' => $entity->id,
            'after' => $after,
        ]);
    }
}
