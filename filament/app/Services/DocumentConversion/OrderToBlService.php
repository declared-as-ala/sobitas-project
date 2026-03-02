<?php

namespace App\Services\DocumentConversion;

use App\Enums\BlStatus;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\DetailsFacture;
use App\Models\Facture;
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
     */
    public function createBlFromOrder(Commande $order, ?array $quantities = null): Facture
    {
        return DB::transaction(function () use ($order, $quantities) {
            $order->load('details.product', 'client');

            $bl = new Facture();
            $bl->commande_id = $order->id;
            $bl->client_id = $order->user_id ?? null; // Commande uses user_id for client
            $bl->numero = $this->numberSequence->nextBl();
            $bl->status = BlStatus::Draft;
            $bl->prix_ht = (float) $order->prix_ht;
            $bl->prix_ttc = (float) $order->prix_ttc;
            $bl->remise = (float) ($order->remise ?? 0);
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
                $detail = new DetailsFacture();
                $detail->facture_id = $bl->id;
                $detail->produit_id = $line->produit_id;
                $detail->qte = $qte;
                $detail->prix_unitaire = $pu;
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
