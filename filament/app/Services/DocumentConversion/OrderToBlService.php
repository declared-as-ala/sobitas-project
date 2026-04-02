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
            $order = $order->fresh(['details.product', 'client']);

            $clientId = $this->resolveOrCreateClient($order);

            $remise = (float) ($order->remise ?? 0);
            $timbre = 0;
            $fraisLivraison = (float) ($order->frais_livraison ?? 0);

            $details = [];
            foreach ($order->details as $line) {
                $produitId = $line->produit_id ?? ($line->getAttributes()['product_id'] ?? null);
                if (! $produitId) {
                    continue;
                }
                $qte = $quantities[$line->id] ?? $quantities[$produitId] ?? $line->qte;
                $qte = (int) $qte;
                if ($qte <= 0) {
                    continue;
                }
                $details[] = [
                    'produit_id' => (int) $produitId,
                    'qte' => $qte,
                    'prix_unitaire' => (float) $line->prix_unitaire,
                    'tva_pct' => 0,
                ];
            }

            // Safer Fallback for legacy commandes: 
            // Derive delivery fee from Order TTC minus the actual sum of line items.
            // This safely bypasses any corrupted or zero $order->prix_ht in the DB.
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

            $totals = InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison, true);

            $orderTtc = (float) ($order->prix_ttc ?? 0);
            $orderHt = (float) ($order->prix_ht ?? 0);

            /*
             * If lines did not contribute HT (missing produit_id, zero PU, etc.) the calculator
             * returns 0 — net_a_payer / prix_ttc stay 0 and the BL list shows "Prix TTC" empty.
             * Fall back to the commande totals so the BL matches what was actually ordered.
             */
            $computedHtBrut = (float) ($totals['total_ht_brut'] ?? 0);
            if ($computedHtBrut <= 0.0005 && $orderTtc > 0) {
                $baseHt = $orderHt > 0 ? $orderHt : $orderTtc;
                $appliedRemise = min($remise, $baseHt);
                $htApres = round(max(0, $baseHt - $appliedRemise), 3);
                $totals['total_ht_brut'] = round($baseHt, 3);
                $totals['remise'] = $appliedRemise;
                $totals['pourcentage_remise'] = $baseHt > 0
                    ? round(($appliedRemise / $baseHt) * 100, 2)
                    : 0.0;
                $totals['prix_ht_apres_remise'] = $htApres;
                $totals['tva'] = 0.0;
                $totals['prix_ttc'] = $htApres;
                $totals['net_a_payer'] = round($htApres + $timbre + $fraisLivraison, 3);
            }

            $bl = new Facture();
            $bl->commande_id = $order->id;
            $bl->client_id = $clientId;
            $bl->numero = $this->numberSequence->nextBl();
            $bl->status = BlStatus::Draft;
            $bl->prix_ht = round((float) ($totals['total_ht_brut'] ?? 0), 3);
            $bl->remise = round((float) ($totals['remise'] ?? 0), 3);
            $bl->pourcentage_remise = round((float) ($totals['pourcentage_remise'] ?? 0), 2);
            $bl->prix_ht_apres_remise = round((float) ($totals['prix_ht_apres_remise'] ?? 0), 3);
            $bl->tva = round((float) ($totals['tva'] ?? 0), 3);
            $bl->timbre = round((float) ($totals['timbre'] ?? 0), 3);
            $bl->frais_livraison = round((float) ($totals['frais_livraison'] ?? 0), 3);
            $bl->prix_ttc = round((float) ($totals['prix_ttc'] ?? 0), 3);
            $bl->net_a_payer = round(max(0.0, (float) ($totals['net_a_payer'] ?? 0)), 3);

            // Do not map billing fields to BL, only keep livraison fields as requested
            $bl->nom = null;
            $bl->prenom = null;
            $bl->email = null;
            $bl->phone = null;
            $bl->adresse1 = null;
            $bl->adresse2 = null;
            $bl->ville = null;
            $bl->region = null;
            $bl->code_postale = null;

            $client = $order->client;
            
            // Map shipping fields with smart fallbacks
            $safeName = $order->livraison_nom ?: $order->nom ?: ($client->nom_prenom ?? trim(($client->nom ?? '') . ' ' . ($client->prenom ?? '')) ?: ($client->name ?? ''));
            $bl->livraison_nom = $safeName;
            $bl->livraison_prenom = $order->livraison_prenom ?: $order->prenom ?: '';
            $bl->livraison_email = $order->livraison_email ?: $order->email ?: ($client->email ?? '');
            $bl->livraison_phone = $order->livraison_phone ?: $order->phone ?: ($client->phone ?? $client->phone_1 ?? '');

            // Build a single-line delivery address (street, CP, ville, region) from order + client.
            $fullAddress = $this->buildDeliveryAddressFromOrder($order, $client);
            $bl->livraison_adresse1 = $fullAddress;
            $bl->livraison_adresse2 = null;
            $bl->adresse1 = $fullAddress;
            $bl->adresse2 = null;

            // Ville/region/CP are already embedded in $fullAddress — clear separate fields to avoid duplication.
            $bl->livraison_ville = null;
            $bl->livraison_region = null;
            $bl->livraison_code_postale = null;

            \Illuminate\Support\Facades\Log::info('BL created from commande', [
                'commande_id' => $order->id, 
                'bl_id' => $bl->id ?? 'pending', 
                'livraison' => $bl->only(['livraison_nom', 'livraison_prenom', 'livraison_email', 'livraison_phone', 'livraison_adresse1', 'livraison_ville', 'livraison_region', 'livraison_code_postale'])
            ]);

            $bl->save();

            foreach ($order->details as $line) {
                $produitId = $line->produit_id ?? ($line->getAttributes()['product_id'] ?? null);
                if (! $produitId) {
                    continue;
                }
                $qte = $quantities[$line->id] ?? $quantities[$produitId] ?? $line->qte;
                $qte = (int) $qte;
                if ($qte <= 0) {
                    continue;
                }
                $pu = (float) $line->prix_unitaire;
                $detail = new DetailsFacture();
                $detail->facture_id = $bl->id;
                $detail->produit_id = (int) $produitId;
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

    /**
     * Build a normalized single-line delivery address from Commande + Client.
     * This is used for BL printing and display.
     */
    protected function buildDeliveryAddressFromOrder(Commande $order, ?Client $client): string
    {
        $street = trim(((string) ($order->livraison_adresse1 ?? '')) . ' ' . ((string) ($order->livraison_adresse2 ?? '')));
        if ($street === '') {
            $street = trim(((string) ($order->adresse1 ?? '')) . ' ' . ((string) ($order->adresse2 ?? '')));
        }
        if ($street === '' && $client) {
            $street = trim((string) ($client->adresse ?? ''));
        }

        $ville = $order->livraison_ville ?: $order->ville ?: ($client->ville ?? '');
        $region = $order->livraison_region ?: $order->region ?: ($client->region ?? '');
        $cp = $order->livraison_code_postale ?: $order->code_postale ?: ($client->code_postale ?? '');

        $parts = array_filter([$street, $ville, $region, $cp], fn ($v) => trim((string) $v) !== '');
        return implode(', ', $parts);
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
