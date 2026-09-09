<?php

namespace App\Filament\Affilie\Resources\AffilieCommandeResource\Pages;

use App\Enums\AffilieStatus;
use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Filament\Affilie\Resources\AffilieCommandeResource;
use App\Models\Affilie;
use App\Models\AffilieTransaction;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\NumberSequence;
use App\Models\Product;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * ── THE AFFILIATE'S ORDER, WRITTEN AS A REAL `Commande` ──────────────────────────────────────
 *
 * This page produces the same object the storefront checkout produces — same table, same status
 * vocabulary, same numbering sequence, same stock discipline — with exactly two deliberate
 * divergences, both of which are the point of the feature and both of which are commented where
 * they happen:
 *
 *   1. `commande_details.prix_unitaire` is the AFFILIATE'S selling price, not the shop's shelf
 *      price. `CommandeController::storeCommandeApi()` overrides whatever the client sent with
 *      `Product::getEffectiveUnitPrice()` because on the storefront a client-supplied price IS an
 *      attack. Here the affiliate's price is the product being sold: the spread the ledger pays
 *      (`AffilieTransactionService::orderSpreadCommission()`) reads `prix_unitaire` and subtracts
 *      `products.prix_affilie` from it. Overriding it with the shelf price would silently pay the
 *      affiliate the shop's own markup instead of theirs. It is not trusted blindly — every line
 *      passes `Affilie::validateSellingPrice()` server-side, below, before anything is written.
 *
 *   2. NO CUSTOMER CONFIRMATION SMS/EMAIL. `OrderConfirmationDispatcher` is deliberately not
 *      called. It texts and emails the customer "merci pour votre commande" on protein.tn — but
 *      this customer bought from their coach, has never visited the site, and gave the shop no
 *      consent to message them; each SMS is also billed. The parcel still announces itself:
 *      `CommandeObserver::updated()` texts on the milestones in
 *      `config('customer_notifications.sms_order_statuses')` once the order actually moves, which
 *      is the message that is useful to them. If the owner decides otherwise, one line —
 *      `app(OrderConfirmationDispatcher::class)->dispatch($commande->id)` — placed AFTER the
 *      transaction commits, never inside it, or a rolled-back order will already have sent its SMS.
 */
class CreateAffilieCommande extends CreateRecord
{
    protected static string $resource = AffilieCommandeResource::class;

    protected static ?string $title = 'Nouvelle commande';

    public function getBreadcrumb(): string
    {
        return 'Nouvelle commande';
    }

    protected function getRedirectUrl(): string
    {
        // The resource has no view/edit page (an affiliate may not alter an order once it exists),
        // so the default redirect chain has nowhere to land. Send them back to their list.
        return static::getResource()::getUrl('index');
    }

    protected function getCreatedNotification(): ?Notification
    {
        return Notification::make()
            ->success()
            ->title('Commande enregistrée')
            ->body('Elle est visible par l’équipe Protein.tn pour préparation et expédition.');
    }

    /**
     * Delegates to the service rather than restating the rule.
     *
     * This was a knowing duplicate: the service's normaliser was private, so the same 8-digit
     * logic was written twice to refuse self-dealing at entry as well as at delivery. Two copies
     * of a fraud check drift — one gets fixed, the other silently stops matching. The service's
     * version is now public static and is the single definition.
     */
    private function normalisePhone(?string $raw): string
    {
        return \App\Services\AffilieTransactionService::normalisePhone($raw);
    }

    /** Raise a French, field-scoped validation error. `data.` is CreateRecord's form statePath. */
    private function fail(string $statePathKey, string $message): never
    {
        throw ValidationException::withMessages(['data.'.$statePathKey => $message]);
    }

    protected function handleRecordCreation(array $data): Model
    {
        /*
         * WHO IS CREATING THIS. Read from the session, never from $data — an affiliate must not be
         * able to bill an order to somebody else's account by editing a form field, and there is
         * no field to edit precisely because this value never appears in the form.
         */
        $affilie = AffilieCommandeResource::currentAffilie();

        if (! $affilie || $affilie->status !== AffilieStatus::Active) {
            $this->fail('livraison_nom', __('Votre compte affilié n’est pas actif : vous ne pouvez pas créer de commande.'));
        }

        /*
         * Migration 2026_09_09_120100 adds `commandes.affilie_id`. Without it the insert below
         * fails with a raw SQL error the affiliate cannot act on, and — worse — an order written
         * with no affiliate attribution earns nobody anything while looking perfectly normal.
         * Same defensive posture AffilieTransactionService::syncOrderCommissionOnStatusChange()
         * takes at the top of its own method.
         */
        if (! Schema::hasColumn('commandes', 'affilie_id')) {
            $this->fail('livraison_nom', __('Le module affilié n’est pas encore installé sur ce serveur. Contactez l’administrateur.'));
        }

        $lines = $this->validateLines($data, $affilie);

        $this->guardAgainstSelfDealing($data, $affilie);

        $subtotal = round(array_sum(array_map(
            static fn (array $l): float => round($l['qte'] * $l['prix_unitaire'], 3),
            $lines
        )), 3);

        $shipping = round(max(0.0, (float) ($data['frais_livraison'] ?? 0)), 3);
        $totalTtc = round($subtotal + $shipping, 3);
        $earning = round(array_sum(array_column($lines, 'earning')), 3);

        /*
         * ONE TRANSACTION, OPENED HERE AND NOT INHERITED.
         *
         * Filament wraps create() in a transaction only when the PANEL asks for it
         * (Panel::databaseTransactions(), default FALSE, and AffiliePanelProvider does not call
         * it). Relying on that default would mean a failure on the third line leaves the first two
         * products decremented with no order to account for them. Opening one explicitly makes
         * this correct whatever the panel is configured to do later; if the panel is switched on,
         * this simply becomes a savepoint inside it.
         */
        return DB::transaction(function () use ($data, $affilie, $lines, $subtotal, $shipping, $totalTtc, $earning): Commande {
            $this->decrementStock($lines);

            $year = (int) date('Y');
            $numero = $year.'/'.str_pad((string) NumberSequence::getNextFor('CMD', $year), 4, '0', STR_PAD_LEFT);

            $commande = new Commande();

            // ── Customer snapshot ────────────────────────────────────────────────────────────
            // Delivery fields are primary and mirrored onto the billing columns, exactly as
            // CommandeController::storeCommandeApi() does it. The back office, the PDF documents
            // and Aramex all read one or the other depending on their age; keeping them equal is
            // what stops an order printing one address and shipping to another.
            $commande->livraison_nom = $data['livraison_nom'];
            $commande->livraison_prenom = null;
            $commande->livraison_phone = $data['livraison_phone'];
            $commande->livraison_email = $data['livraison_email'] ?? null;
            $commande->livraison_region = $data['livraison_region'] ?? null;
            $commande->livraison_ville = $data['livraison_ville'] ?? null;
            $commande->livraison_code_postale = $data['livraison_code_postale'] ?? null;
            $commande->livraison_adresse1 = $data['livraison_adresse1'] ?? null;

            $commande->nom = $data['livraison_nom'];
            $commande->prenom = null;
            $commande->phone = $data['livraison_phone'];
            $commande->email = $data['livraison_email'] ?? null;
            $commande->pays = 'Tunisie';
            $commande->region = $data['livraison_region'] ?? null;
            $commande->ville = $data['livraison_ville'] ?? null;
            $commande->code_postale = $data['livraison_code_postale'] ?? null;
            $commande->adresse1 = $data['livraison_adresse1'] ?? null;
            $commande->note = $data['note'] ?? null;

            /*
             * `user_id` AND `client_id` ARE BOTH LEFT NULL, AND THAT IS A DECISION.
             *
             * The storefront writes `user_id = $client->id` for guests, preserving a convention
             * from before `commandes.client_id` existed. Commande::scopeVisibleToStorefrontUser()
             * exists specifically to survive the collision that creates — a Client id and a User id
             * that happen to be the same number. Reproducing it here would hand an affiliate's
             * customer's order to whichever storefront account shares that id, and would put the
             * order inside PointsService::syncOnStatusChange(), which credits loyalty points to
             * `user_id` on delivery. The end customer of an affiliate has no storefront account and
             * must not earn points on a sale where the affiliate already took the margin.
             *
             * PointsService returns immediately on an empty `user_id`, so null is the state that
             * keeps this order out of the loyalty economy entirely. The customer is identified by
             * the delivery snapshot above, which is what every downstream document reads anyway.
             */

            $commande->etat = Commande::STATUS_NEW;
            $commande->numero = $numero;
            $commande->affilie_id = $affilie->id;

            /*
             * ── "DIRECTLY CONFIRMED" MEANS `nouvelle_commande`, NOT A NEW STATUS ─────────────
             * The owner's words are "that command will directly be confirmed … we get a
             * notification that a new command needs treatment". There is no `confirmee` in
             * Commande::getStatusOptions(), and inventing one would leave it unlabelled in
             * STATUS_LABELS, uncoloured in STATUS_COLORS, absent from the admin dropdown, and
             * unknown to PointsService's delivered/cancelled vocabularies.
             *
             * `nouvelle_commande` IS the "needs treatment" state: CommandeResource's navigation
             * badge counts exactly `where('etat', 'nouvelle_commande')`, so this order lands in
             * the same queue an administrator already watches. "Confirmed" here means there is no
             * call-the-customer-to-confirm step — the affiliate already sold it — not that it
             * skips preparation.
             */

            // Totals are known before the first save (every line price is already validated), so
            // CommandeObserver::created() sees a complete order rather than a shell.
            $commande->prix_ht = $subtotal;
            $commande->frais_livraison = $shipping;
            $commande->prix_ttc = $totalTtc;
            $commande->remise = 0;

            $commande->save();

            foreach ($lines as $line) {
                $detail = new CommandeDetail();
                $detail->commande_id = $commande->id;
                $detail->produit_id = $line['produit_id'];
                $detail->qte = $line['qte'];
                /*
                 * THE AFFILIATE'S SELLING PRICE — the one divergence from the storefront.
                 *
                 * `AffilieTransactionService::orderSpreadCommission()` computes
                 *     Σ (commande_details.prix_unitaire − products.prix_affilie) × qte
                 * so this column IS the affiliate's earning. Writing the shelf price here, as the
                 * storefront deliberately does, would pay them the shop's markup instead of their
                 * own and make the number the affiliate was shown on this form a fiction.
                 */
                $detail->prix_unitaire = $line['prix_unitaire'];
                $detail->prix_ht = round($line['qte'] * $line['prix_unitaire'], 3);
                // This shop's orders carry no separate TVA line: the storefront writes the same
                // value into prix_ht and prix_ttc. Matched, so document conversion and the invoice
                // calculator see the shape they already expect.
                $detail->prix_ttc = $detail->prix_ht;
                $detail->save();
            }

            $this->recordPendingCommission($commande, $affilie, $earning);

            return $commande;
        });
    }

    /**
     * Server-side re-validation of every line. Runs BEFORE any write.
     *
     * The repeater already refuses an under-priced line in the browser, but that state is
     * client-driven and a Livewire payload can be edited. Everything the money depends on —
     * that the product exists, that it is affiliate-sellable, that the price clears
     * `prix_affilie` — is decided again here, against the database, on a query that selects
     * `prix_affilie` explicitly.
     *
     * @return list<array{produit_id: int, qte: int, prix_unitaire: float, earning: float, designation: string}>
     */
    private function validateLines(array $data, Affilie $affilie): array
    {
        $rows = (array) ($data['details'] ?? []);

        if ($rows === []) {
            $this->fail('details', __('Ajoutez au moins un produit à la commande.'));
        }

        $lines = [];
        $seen = [];

        foreach ($rows as $key => $row) {
            $productId = (int) ($row['produit_id'] ?? 0);
            $qte = (int) ($row['qte'] ?? 0);
            $price = round((float) ($row['prix_unitaire'] ?? 0), 3);

            // Repeater items are keyed by a Filament-generated uuid; rebuilding the same path is
            // what puts the error under the offending input instead of at the top of the page.
            $priceKey = 'details.'.$key.'.prix_unitaire';
            $productKey = 'details.'.$key.'.produit_id';
            $qteKey = 'details.'.$key.'.qte';

            if ($productId <= 0) {
                $this->fail($productKey, __('Choisissez un produit.'));
            }

            if ($qte < 1) {
                $this->fail($qteKey, __('La quantité doit être d’au moins 1.'));
            }

            if (isset($seen[$productId])) {
                // Two lines for the same product would decrement stock twice and settle correctly,
                // but they make the order unreadable on a picking list and hide a double-entry
                // mistake behind a plausible total. Refuse and let them adjust the quantity.
                $this->fail($productKey, __('Ce produit figure déjà sur une autre ligne. Modifiez plutôt la quantité.'));
            }
            $seen[$productId] = true;

            /** @var Product|null $product */
            $product = AffilieCommandeResource::affiliateProductQuery()->find($productId);

            if (! $product) {
                $this->fail($productKey, __('Ce produit n’est plus disponible à la vente affiliée.'));
            }

            /*
             * FAIL CLOSED. Product::isAffiliateSellable() answers from
             * Product::affiliateBasePrice(), which returns null for a null, empty, zero or
             * NOT-LOADED `prix_affilie`. The query above selects the column explicitly for exactly
             * this reason — Product::getSelectSearchColumns() omits it, and a model hydrated
             * through that path would report every product unsellable.
             */
            if (! $product->isAffiliateSellable()) {
                $this->fail($productKey, __('Le produit « :produit » n’a pas de prix affilié : il ne peut pas être vendu par un affilié.', [
                    'produit' => (string) ($product->designation_fr ?? $product->getKey()),
                ]));
            }

            try {
                // The message shown is the one this method throws — never a rewrite of it.
                $affilie->validateSellingPrice($product, $price);
            } catch (\InvalidArgumentException $e) {
                $this->fail($priceKey, $e->getMessage());
            }

            $base = (float) $product->affiliateBasePrice();

            $lines[] = [
                'produit_id' => $productId,
                'qte' => $qte,
                'prix_unitaire' => $price,
                // round(…, 3) — TND, and the same precision as affilie_transactions.amount
                // decimal(14,3), so the promise written below cannot differ from the money.
                'earning' => round(max(0.0, $price - $base) * $qte, 3),
                'designation' => (string) ($product->designation_fr ?? ('#'.$productId)),
            ];
        }

        return $lines;
    }

    /**
     * ── SELF-DEALING, REFUSED AT THE DOOR ────────────────────────────────────────────────────
     * An affiliate who can type an order can type their own phone into it and earn a margin for
     * buying from themselves — real goods, real courier, real cash, and it looks like healthy
     * volume on every report the shop has.
     *
     * `AffilieTransactionService::processOrderCommission()` already refuses commission for this at
     * delivery. That is too late to be useful: by then the parcel has shipped, the shop has paid
     * the outbound leg, and the affiliate learns their earning was zero after the fact. Refusing
     * here means nobody is out of pocket and the affiliate gets a sentence explaining why.
     *
     * REFUSE rather than warn, and no override, for the reason that service states plainly: a
     * fraud guard with an off switch is a fraud guard that will be found switched off. A coach who
     * genuinely wants to buy through their own account orders on the storefront like any customer;
     * a legitimate exception is an administrator's `adjustBalance()`, which leaves a named row.
     */
    private function guardAgainstSelfDealing(array $data, Affilie $affilie): void
    {
        $affiliePhone = $this->normalisePhone($affilie->phone ?? null);

        // Too short to identify anybody. Two empty strings must never compare equal, or every
        // affiliate with no phone on file would be blocked from every order.
        if (strlen($affiliePhone) < 8) {
            return;
        }

        $delivery = $this->normalisePhone($data['livraison_phone'] ?? null);

        if (strlen($delivery) >= 8 && $delivery === $affiliePhone) {
            $this->fail('livraison_phone', __('Ce numéro est celui de votre compte affilié. Une commande à votre propre nom ne génère aucun gain : utilisez le numéro du client final.'));
        }
    }

    /**
     * ── STOCK: DECREMENT AT CREATION, LIKE EVERY OTHER ORDER ─────────────────────────────────
     * What the codebase actually does, verified rather than assumed:
     *
     *   · `CommandeController::storeCommandeApi()` decrements atomically at creation, with the
     *     quantity test inside the UPDATE, then syncs the `rupture` flag.
     *   · `CommandeObserver::created()` does NOT touch stock.
     *   · `CommandeObserver::updated()` RESTORES stock when `etat` becomes `annuler`, once, guarded
     *     by `commandes.stock_restored_at`.
     *   · `Commande::deleting()` restores it the same way.
     *
     * The last two are the binding constraint: the system already believes every order's stock was
     * taken at creation. An affiliate order that skipped the decrement would, on cancellation,
     * INCREMENT stock that was never removed — inventing inventory out of a cancelled order, on a
     * path nobody would think to check. So this decrements, and it decrements the same way: the
     * `where('qte','>=',$qte)` lives inside the UPDATE, so two affiliates racing for the last unit
     * cannot both win.
     *
     * `Product::syncRuptureFlags()` is used rather than the storefront's inline
     * `update(['rupture' => true])`: it honours `force_out_of_stock` and is the same helper both
     * restore paths call. `decrement()` bypasses the model's saving hook, so without this a
     * product that just hit zero would keep advertising itself as in stock to the storefront, the
     * admin and the JSON-LD.
     *
     * @param  list<array{produit_id: int, qte: int, prix_unitaire: float, earning: float, designation: string}>  $lines
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
                // Throws inside the transaction opened by handleRecordCreation, so every earlier
                // line's decrement is rolled back with it. Nothing is half-taken.
                $this->fail('details', __('Stock insuffisant pour « :produit » (demandé : :qte).', [
                    'produit' => $line['designation'],
                    'qte' => $line['qte'],
                ]));
            }

            $ids[] = $line['produit_id'];
        }

        if ($ids !== []) {
            Product::syncRuptureFlags($ids);
        }
    }

    /**
     * ── THE PROMISE ROW ──────────────────────────────────────────────────────────────────────
     * `AffilieTransactionService`'s state machine names this path explicitly:
     *
     *     order created by affiliate ... (optional) commission row, status `pending`, amount +X
     *                                    Written by the order-entry path, not here. A pending row
     *                                    is a PROMISE: it does NOT move `current_balance`.
     *
     * and `processOrderCommission()` then PROMOTES it on delivery — status moves to confirmed,
     * `balance_after` is filled in, `amount` is never touched — so that "an admin lowering the
     * commission rate on Tuesday cannot retroactively cut what was promised on Monday".
     *
     * THE THREE THINGS THIS ROW MUST NOT DO, each enforced by that service and honoured here:
     *   · `balance_after` stays NULL. The service treats a pending row that carries one as proof
     *     someone already credited the affiliate, logs an error and pays NOTHING. A single stray
     *     value here silently costs the affiliate the whole commission.
     *   · `affilies.current_balance` is not moved. A promise is not money.
     *   · `total_earned` is not moved. Nothing has been earned until the parcel is delivered.
     *
     * The idempotency key is the same deterministic string
     * `AffilieTransactionService::orderCommissionKey()` builds — that method is private, so the
     * format is restated rather than called. It carries a UNIQUE index (migration
     * 2026_09_09_120200), which makes "one commission row per order" a database guarantee instead
     * of a convention. The promotion writes the identical value back onto this same row, so there
     * is no collision.
     *
     * Best-effort: an order that exists with no promise row still settles correctly at delivery —
     * `processOrderCommission()` computes the spread from `commande_details` when it finds no
     * pending row. Losing the order over a display row would be the wrong trade.
     */
    private function recordPendingCommission(Commande $commande, Affilie $affilie, float $earning): void
    {
        if ($earning <= 0.0001) {
            // Selling at exactly `prix_affilie` is allowed and earns nothing. A zero row would be
            // a promise of nothing, cluttering the ledger the affiliate reads.
            return;
        }

        try {
            if (! Schema::hasColumn('affilie_transactions', 'commande_id')) {
                return;
            }

            AffilieTransaction::query()->create([
                'affilie_id' => $affilie->id,
                'commande_id' => $commande->id,
                'ticket_id' => null,
                'affilie_code_id' => null,
                'type' => AffilieTransactionType::Commission,
                'status' => AffilieTransactionStatus::Pending,
                'amount' => round($earning, 3),
                'balance_after' => null,
                'description' => __('Commission commande :num (en attente de livraison)', [
                    'num' => (string) ($commande->numero ?? $commande->id),
                ]),
                'metadata' => [
                    'commande_id' => $commande->id,
                    'numero' => $commande->numero,
                    'source' => 'affilie_order_entry',
                    'model' => 'spread',
                    'promised_at' => now()->toDateTimeString(),
                    'prix_ttc' => round((float) $commande->prix_ttc, 3),
                    'frais_livraison' => round((float) $commande->frais_livraison, 3),
                ],
                'idempotency_key' => 'commande:'.$commande->id.':commission',
                'created_by' => Auth::id(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Affilie pending commission row not written for a new affiliate order', [
                'commande_id' => $commande->id,
                'affilie_id' => $affilie->id,
                'earning' => $earning,
                'error' => $e->getMessage(),
            ]);
        }
    }

}
