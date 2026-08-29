<?php

namespace App\Services\DocumentConversion;

use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\DetailsTicket;
use App\Models\Ticket;
use App\Services\InvoiceCalculator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Creates a Ticket with type=bon_livraison (BL) from a Commande.
 * BL does NOT contribute to CA; revenue is from Commande when expidee.
 */
class OrderToTicketBlService
{
    public function __construct(
        protected \App\Services\NumberSequenceService $numberSequence
    ) {}

    public function createBlFromOrder(Commande $order, ?array $quantities = null): Ticket
    {
        return DB::transaction(function () use ($order, $quantities) {
            $order->load('details.product');

            $bl = new Ticket();
            $bl->type = Ticket::TYPE_BON_LIVRAISON;
            $bl->commande_id = $order->id;
            $bl->client_id = $order->client_id ?? $order->user_id;
            $year = date('Y');
            $nb = Ticket::whereYear('created_at', $year)->count() + 1;
            $bl->numero = $year . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);
            $remise = (float) ($order->remise ?? 0);
            $fraisLivraison = (float) ($order->frais_livraison ?? 0);

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

            // Safer Fallback for legacy commandes: 
            // Derive delivery fee from Order TTC minus the actual sum of line items.
            if ($fraisLivraison <= 0 && ($order->prix_ttc ?? 0) > 0) {
                $sumLinesHt = 0;
                foreach ($details as $d) {
                    $sumLinesHt += $d['qte'] * $d['prix_unitaire'];
                }
                $derivedFrais = (float) $order->prix_ttc - $sumLinesHt - $remise;
                if ($derivedFrais > 0.001) {
                    $fraisLivraison = round($derivedFrais, 3);
                }
            }

            $totals = InvoiceCalculator::calculate($details, $remise, 0, 0, $fraisLivraison, true);

            $bl->prix_ht = $totals['total_ht_brut'];
            $bl->prix_ttc = $totals['net_a_payer'];
            $bl->remise = $totals['remise'];
            $bl->frais_livraison = $fraisLivraison;
            $bl->timbre = 0;
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
                $lineHt = $qte * $pu;
                DetailsTicket::create([
                    'ticket_id' => $bl->id,
                    'produit_id' => $line->produit_id,
                    'qte' => $qte,
                    'prix_unitaire' => $pu,
                    'prix_ht' => $lineHt,
                    'prix_ttc' => $lineHt,
                ]);
            }

            $this->audit('order.converted_to_ticket_bl', $order, [
                'commande_id' => $order->id,
                'ticket_id' => $bl->id,
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
