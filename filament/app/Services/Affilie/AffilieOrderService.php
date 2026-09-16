<?php

namespace App\Services\Affilie;

use App\Enums\AffilieStatus;
use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Models\Affilie;
use App\Models\AffilieTransaction;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\NumberSequence;
use App\Models\Product;
use App\Services\AffilieTransactionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * The single, framework-agnostic home for "an affiliate creates an order".
 *
 * This logic used to live only inside the Filament CreateAffilieCommande page. It is money-critical
 * (stock, self-dealing, the pending-commission promise), so it must not be reimplemented for the
 * storefront API. Both the Filament page and the /affiliate portal API call THIS. It throws
 * AffilieOrderException (never a Filament ValidationException), which each caller translates.
 *
 * It produces the same object the storefront checkout produces — same table, status vocabulary and
 * numbering — with the two deliberate affiliate divergences, both commented where they happen:
 *   1. commande_details.prix_unitaire is the AFFILIATE'S selling price (the spread the ledger pays).
 *   2. NO customer confirmation SMS/email (the affiliate's customer never consented to the shop).
 */
class AffilieOrderService
{
    /**
     * @param  Affilie  $affilie   the acting affiliate — resolved from session/token, NEVER from input.
     * @param  array<int|string, array{produit_id:int, qte:int, prix_unitaire:float}>  $lines
     * @param  array{nom?:?string, phone?:?string, email?:?string, region?:?string, ville?:?string, adresse1?:?string, code_postale?:?string, note?:?string}  $customer
     * @param  float     $shipping   delivery fee (collected by the courier; excluded from the gain).
     * @param  int|null  $createdBy  id of the user creating the row (for the ledger's created_by).
     *
     * @throws AffilieOrderException
     */
    public function create(Affilie $affilie, array $lines, array $customer, float $shipping = 0.0, ?int $createdBy = null): Commande
    {
        if ($affilie->status !== AffilieStatus::Active) {
            throw new AffilieOrderException('account', __('Votre compte affilié n’est pas actif : vous ne pouvez pas créer de commande.'));
        }

        if (! Schema::hasColumn('commandes', 'affilie_id')) {
            throw new AffilieOrderException('general', __('Le module affilié n’est pas encore installé sur ce serveur. Contactez l’administrateur.'));
        }

        $validated = $this->validateLines($lines, $affilie);
        $this->guardAgainstSelfDealing($customer['phone'] ?? null, $affilie);

        $subtotal = round(array_sum(array_map(
            static fn (array $l): float => round($l['qte'] * $l['prix_unitaire'], 3),
            $validated
        )), 3);
        $shipping = round(max(0.0, $shipping), 3);
        $totalTtc = round($subtotal + $shipping, 3);
        $earning  = round(array_sum(array_column($validated, 'earning')), 3);

        // ONE transaction, opened here and not inherited from a panel: a failure on the third line
        // must not leave the first two products decremented with no order to account for them.
        return DB::transaction(function () use ($customer, $affilie, $validated, $subtotal, $shipping, $totalTtc, $earning, $createdBy): Commande {
            $this->decrementStock($validated);

            $year   = (int) date('Y');
            $numero = $year.'/'.str_pad((string) NumberSequence::getNextFor('CMD', $year), 4, '0', STR_PAD_LEFT);

            $commande = new Commande();

            // Delivery snapshot mirrored onto the billing columns, as CommandeController::storeCommandeApi does.
            $commande->livraison_nom          = $customer['nom'] ?? null;
            $commande->livraison_prenom       = null;
            $commande->livraison_phone        = $customer['phone'] ?? null;
            $commande->livraison_email        = $customer['email'] ?? null;
            $commande->livraison_region       = $customer['region'] ?? null;
            $commande->livraison_ville        = $customer['ville'] ?? null;
            $commande->livraison_code_postale = $customer['code_postale'] ?? null;
            $commande->livraison_adresse1     = $customer['adresse1'] ?? null;

            $commande->nom          = $customer['nom'] ?? null;
            $commande->prenom       = null;
            $commande->phone        = $customer['phone'] ?? null;
            $commande->email        = $customer['email'] ?? null;
            $commande->pays         = 'Tunisie';
            $commande->region       = $customer['region'] ?? null;
            $commande->ville        = $customer['ville'] ?? null;
            $commande->code_postale = $customer['code_postale'] ?? null;
            $commande->adresse1     = $customer['adresse1'] ?? null;
            $commande->note         = $customer['note'] ?? null;

            // user_id AND client_id are BOTH left NULL, deliberately: it keeps the affiliate's
            // customer out of the loyalty/points economy (PointsService returns early on empty
            // user_id) — the affiliate already took the margin on the sale.
            $commande->etat            = Commande::STATUS_NEW;
            $commande->numero          = $numero;
            $commande->affilie_id      = $affilie->id;
            $commande->prix_ht         = $subtotal;
            $commande->frais_livraison = $shipping;
            $commande->prix_ttc        = $totalTtc;
            $commande->remise          = 0;
            $commande->save();

            foreach ($validated as $line) {
                $detail = new CommandeDetail();
                $detail->commande_id   = $commande->id;
                $detail->produit_id    = $line['produit_id'];
                $detail->qte           = $line['qte'];
                // THE AFFILIATE'S SELLING PRICE — orderSpreadCommission() subtracts prix_affilie
                // from this, so this column IS the affiliate's earning. Never the shelf price.
                $detail->prix_unitaire = $line['prix_unitaire'];
                $detail->prix_ht       = round($line['qte'] * $line['prix_unitaire'], 3);
                $detail->prix_ttc      = $detail->prix_ht;
                $detail->save();
            }

            $this->recordPendingCommission($commande, $affilie, $earning, $createdBy);

            return $commande;
        });
    }

    /**
     * Server-side re-validation of every line, before any write. Client state is never trusted.
     *
     * @return list<array{produit_id:int, qte:int, prix_unitaire:float, earning:float, designation:string, key:int|string}>
     *
     * @throws AffilieOrderException
     */
    private function validateLines(array $rows, Affilie $affilie): array
    {
        if ($rows === []) {
            throw new AffilieOrderException('lines', __('Ajoutez au moins un produit à la commande.'));
        }

        $lines = [];
        $seen  = [];

        foreach ($rows as $key => $row) {
            $productId = (int) ($row['produit_id'] ?? 0);
            $qte       = (int) ($row['qte'] ?? 0);
            $price     = round((float) ($row['prix_unitaire'] ?? 0), 3);

            if ($productId <= 0) {
                throw new AffilieOrderException('product', __('Choisissez un produit.'), $key);
            }
            if ($qte < 1) {
                throw new AffilieOrderException('stock', __('La quantité doit être d’au moins 1.'), $key);
            }
            if (isset($seen[$productId])) {
                throw new AffilieOrderException('product', __('Ce produit figure déjà sur une autre ligne. Modifiez plutôt la quantité.'), $key);
            }
            $seen[$productId] = true;

            /** @var Product|null $product */
            $product = Product::query()->find($productId);
            if (! $product) {
                throw new AffilieOrderException('product', __('Ce produit n’est plus disponible à la vente affiliée.'), $key);
            }

            // Fail closed: isAffiliateSellable() reads affiliateBasePrice(), null for a null/0/absent
            // prix_affilie. A full-model find() loads the column, so the check is real.
            if (! $product->isAffiliateSellable()) {
                throw new AffilieOrderException('product', __('Le produit « :produit » n’a pas de prix affilié : il ne peut pas être vendu par un affilié.', [
                    'produit' => (string) ($product->designation_fr ?? $product->getKey()),
                ]), $key);
            }

            try {
                $affilie->validateSellingPrice($product, $price); // throws below prix_affilie
            } catch (\InvalidArgumentException $e) {
                throw new AffilieOrderException('price', $e->getMessage(), $key);
            }

            $base = (float) $product->affiliateBasePrice();

            $lines[] = [
                'produit_id'    => $productId,
                'qte'           => $qte,
                'prix_unitaire' => $price,
                'earning'       => round(max(0.0, $price - $base) * $qte, 3),
                'designation'   => (string) ($product->designation_fr ?? ('#'.$productId)),
                'key'           => $key,
            ];
        }

        return $lines;
    }

    /**
     * Refuse an order whose delivery phone is the affiliate's own — self-dealing earns no
     * commission and would just cost the shop the outbound courier leg. No override, by design.
     *
     * @throws AffilieOrderException
     */
    private function guardAgainstSelfDealing(?string $deliveryPhone, Affilie $affilie): void
    {
        $affiliePhone = AffilieTransactionService::normalisePhone($affilie->phone ?? null);
        if (strlen($affiliePhone) < 8) {
            return; // too short to identify anyone; two empty strings must never compare equal
        }

        $delivery = AffilieTransactionService::normalisePhone($deliveryPhone);
        if (strlen($delivery) >= 8 && $delivery === $affiliePhone) {
            throw new AffilieOrderException('phone', __('Ce numéro est celui de votre compte affilié. Une commande à votre propre nom ne génère aucun gain : utilisez le numéro du client final.'));
        }
    }

    /**
     * Decrement stock at creation, atomically, like every other order. The quantity test lives
     * inside the UPDATE so two affiliates racing for the last unit cannot both win.
     *
     * @param  list<array{produit_id:int, qte:int, designation:string, key?:int|string}>  $lines
     *
     * @throws AffilieOrderException
     */
    private function decrementStock(array $lines): void
    {
        $ids = [];

        foreach ($lines as $line) {
            $affected = Product::query()
                ->where('id', $line['produit_id'])
                ->where('qte', '>=', $line['qte'])
                ->decrement('qte', $line['qte']);

            if ($affected === 0) {
                // Throws inside the transaction, so every earlier decrement rolls back with it.
                throw new AffilieOrderException('stock', __('Stock insuffisant pour « :produit » (demandé : :qte).', [
                    'produit' => $line['designation'],
                    'qte'     => $line['qte'],
                ]), $line['key'] ?? null);
            }

            $ids[] = $line['produit_id'];
        }

        if ($ids !== []) {
            Product::syncRuptureFlags($ids); // decrement() bypasses the saving hook
        }
    }

    /**
     * Write the pending commission PROMISE: status Pending, balance_after NULL (does not move the
     * balance). It is promoted to confirmed on delivery by AffilieTransactionService. Best-effort —
     * an order that exists with no promise row still settles correctly from commande_details.
     */
    private function recordPendingCommission(Commande $commande, Affilie $affilie, float $earning, ?int $createdBy): void
    {
        if ($earning <= 0.0001) {
            return; // selling at exactly prix_affilie earns nothing; a zero promise just clutters the ledger
        }

        try {
            if (! Schema::hasColumn('affilie_transactions', 'commande_id')) {
                return;
            }

            AffilieTransaction::query()->create([
                'affilie_id'      => $affilie->id,
                'commande_id'     => $commande->id,
                'ticket_id'       => null,
                'affilie_code_id' => null,
                'type'            => AffilieTransactionType::Commission,
                'status'          => AffilieTransactionStatus::Pending,
                'amount'          => round($earning, 3),
                'balance_after'   => null,
                'description'     => __('Commission commande :num (en attente de livraison)', [
                    'num' => (string) ($commande->numero ?? $commande->id),
                ]),
                'metadata' => [
                    'commande_id'     => $commande->id,
                    'numero'          => $commande->numero,
                    'source'          => 'affilie_order_entry',
                    'model'           => 'spread',
                    'promised_at'     => now()->toDateTimeString(),
                    'prix_ttc'        => round((float) $commande->prix_ttc, 3),
                    'frais_livraison' => round((float) $commande->frais_livraison, 3),
                ],
                'idempotency_key' => 'commande:'.$commande->id.':commission',
                'created_by'      => $createdBy,
            ]);
        } catch (\Throwable $e) {
            Log::error('Affilie pending commission row not written for a new affiliate order', [
                'commande_id' => $commande->id,
                'affilie_id'  => $affilie->id,
                'earning'     => $earning,
                'error'       => $e->getMessage(),
            ]);
        }
    }
}
