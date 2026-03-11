<?php

namespace App\Services\DocumentConversion;

use App\Enums\BlStatus;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\DetailsFacture;
use App\Models\Facture;
use App\Services\InvoiceCalculator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class OrderToBlService
{
    public function __construct(
        protected \App\Services\NumberSequenceService $numberSequence
    ) {}

    /**
     * Create a BL (Facture) from an order. Optionally pass quantities per line (indexed by order detail id or produit_id).
     * Stock is NOT decremented here (already decremented at order creation).
     * Totals (net_a_payer, prix_ttc, tva, etc.) are computed via InvoiceCalculator and persisted so the list shows correct values.
     */
    public function createBlFromOrder(Commande $order, ?array $quantities = null): Facture
    {
        return DB::transaction(function () use ($order, $quantities) {
            $order->load('details.product', 'client');

            $remise = (float) ($order->remise ?? 0);
            $timbre = 0;

            $details = [];
            foreach ($order->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = $quantities[$line->id] ?? $quantities[$line->produit_id] ?? $line->qte;
                $qte = (int) $qte;
                if ($qte <= 0) {
                    continue;
                }
                $details[] = [
                    'produit_id' => $line->produit_id,
                    'qte' => $qte,
                    'prix_unitaire' => (float) $line->prix_unitaire,
                    'tva_pct' => 0,
                ];
            }
            $totals = InvoiceCalculator::calculate($details, $remise, $timbre, 0);

            $bl = new Facture();
            $bl->commande_id = $order->id;
            $bl->client_id = $order->user_id ?? $order->client_id ?? null;
            $bl->numero = $this->numberSequence->nextBl();
            $bl->status = BlStatus::Draft;
            $bl->prix_ht = $totals['total_ht_brut'];
            $bl->remise = $totals['remise'];
            $bl->pourcentage_remise = $totals['pourcentage_remise'];
            $bl->prix_ht_apres_remise = $totals['prix_ht_apres_remise'];
            $bl->tva = $totals['tva'];
            $bl->timbre = $totals['timbre'];
            $bl->prix_ttc = $totals['prix_ttc'];
            $bl->net_a_payer = $totals['net_a_payer'];
            $bl->save();

            foreach ($order->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = $quantities[$line->id] ?? $quantities[$line->produit_id] ?? $line->qte;
                $qte = (int) $qte;
                if ($qte <= 0) {
                    continue;
                }
                $pu = (float) $line->prix_unitaire;
                $detail = new DetailsFacture();
                $detail->facture_id = $bl->id;
                $detail->produit_id = $line->produit_id;
                $detail->qte = $qte;
                $detail->prix_unitaire = $pu;
                if (Schema::hasColumn('details_factures', 'prix_ttc')) {
                    $detail->prix_ttc = $qte * $pu;
                }
                $detail->save();
            }

            $this->audit('order.converted_to_bl', $order, [
                'commande_id' => $order->id,
                'facture_id' => $bl->id,
            ]);

            return $bl->fresh(['details']);
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
            'entity_type' => $entity instanceof Commande ? 'commande' : get_class($entity),
            'entity_id' => $entity->id,
            'after' => $after,
        ]);
    }
}
