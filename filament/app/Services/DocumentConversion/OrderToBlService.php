<?php

namespace App\Services\DocumentConversion;

use App\Enums\BlStatus;
use App\Models\AuditLog;
use App\Models\Client;
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
     * Resolve or create client from order. Returns client id (never null after this).
     */
    protected function resolveOrCreateClient(Commande $order): int
    {
        if ($order->client_id) {
            return (int) $order->client_id;
        }
        if ($order->user_id) {
            return (int) $order->user_id;
        }

        $email = trim((string) ($order->email ?? ''));
        $phone = trim((string) ($order->phone ?? ''));

        if ($email !== '' || $phone !== '') {
            $client = Client::query()
                ->where(function ($q) use ($email, $phone) {
                    if ($email !== '') {
                        $q->where('email', $email);
                    }
                    if ($phone !== '') {
                        $email !== '' ? $q->orWhere('phone_1', $phone) : $q->where('phone_1', $phone);
                    }
                })
                ->first();
            if ($client) {
                $order->client_id = $client->id;
                $order->saveQuietly();
                return (int) $client->id;
            }
        }

        $name = trim(($order->nom ?? '') . ' ' . ($order->prenom ?? ''));
        if ($name === '') {
            $name = $email !== '' ? $email : ('Client ' . $order->numero);
        }

        $adresse = trim(($order->adresse1 ?? '') . ($order->adresse2 ? ' ' . $order->adresse2 : ''));

        $newClient = Client::create([
            'name' => $name,
            'email' => $email ?: null,
            'phone_1' => $phone ?: null,
            'adresse' => $adresse ?: null,
            'region' => $order->region ?? null,
            'ville' => $order->ville ?? null,
            'code_postale' => $order->code_postale ?? null,
        ]);

        $order->client_id = $newClient->id;
        $order->saveQuietly();

        return (int) $newClient->id;
    }

    /**
     * Create a BL (Facture) from an order. Optionally pass quantities per line (indexed by order detail id or produit_id).
     * Stock is NOT decremented here (already decremented at order creation).
     * Totals include frais_livraison from order. Client is resolved or created from order.
     */
    public function createBlFromOrder(Commande $order, ?array $quantities = null): Facture
    {
        return DB::transaction(function () use ($order, $quantities) {
            $order->load('details.product', 'client');

            $clientId = $this->resolveOrCreateClient($order);

            $remise = (float) ($order->remise ?? 0);
            $timbre = 0;
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
            $totals = InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison, true);

            $bl = new Facture();
            $bl->commande_id = $order->id;
            $bl->client_id = $clientId;
            $bl->numero = $this->numberSequence->nextBl();
            $bl->status = BlStatus::Draft;
            $bl->prix_ht = $totals['total_ht_brut'];
            $bl->remise = $totals['remise'];
            $bl->pourcentage_remise = $totals['pourcentage_remise'];
            $bl->prix_ht_apres_remise = $totals['prix_ht_apres_remise'];
            $bl->tva = $totals['tva'];
            $bl->timbre = $totals['timbre'];
            $bl->frais_livraison = $totals['frais_livraison'];
            $bl->prix_ttc = $totals['prix_ttc'];
            $bl->net_a_payer = max(0, $totals['net_a_payer']);

            // Map billing fields
            $bl->nom = $order->nom;
            $bl->prenom = $order->prenom;
            $bl->email = $order->email;
            $bl->phone = $order->phone;
            $bl->adresse1 = $order->adresse1;
            $bl->adresse2 = $order->adresse2;
            $bl->ville = $order->ville;
            $bl->region = $order->region;
            $bl->code_postale = $order->code_postale;

            // Map shipping fields
            $bl->livraison_nom = $order->livraison_nom;
            $bl->livraison_prenom = $order->livraison_prenom;
            $bl->livraison_email = $order->livraison_email;
            $bl->livraison_phone = $order->livraison_phone;
            $bl->livraison_adresse1 = $order->livraison_adresse1;
            $bl->livraison_adresse2 = $order->livraison_adresse2;
            $bl->livraison_ville = $order->livraison_ville;
            $bl->livraison_region = $order->livraison_region;
            $bl->livraison_code_postale = $order->livraison_code_postale;

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
