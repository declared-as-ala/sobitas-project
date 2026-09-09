<?php

namespace App\Services;

use App\Enums\AffilieCodeStatus;
use App\Enums\AffiliePayoutStatus;
use App\Enums\AffilieStatus;
use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Models\Affilie;
use App\Models\AffilieCode;
use App\Models\AffiliePayout;
use App\Models\AffilieTransaction;
use App\Models\Commande;
use App\Models\Ticket;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Boutique ticket affilie commissions and payments (affilie_codes + affilie_transactions).
 *
 * ── AND SINCE 09/09/2026, STOREFRONT ORDERS TOO ─────────────────────────────────────────────
 * Everything below the `ORDER COMMISSION` banner is the `commandes` half. It is not a copy of the
 * ticket half, because the two are settled differently and the difference is the whole design:
 *
 *   A TICKET is the boutique till. The customer paid cash across the counter; the money is in the
 *   drawer before the row is written. Commission on a ticket is payable the instant it confirms.
 *
 *   A COMMANDE is cash on delivery. `livree` means ARAMEX has the customer's money, not that the
 *   shop does. So an order commission passes TWO gates: it is EARNED at `commandes.delivered_at`
 *   and becomes PAYABLE only at `commandes.cod_remitted_at`. Between those two dates the affiliate
 *   is genuinely owed the money and the shop genuinely cannot pay it without lending its own.
 *
 * The ledger is append-only. Statuses move (pending -> confirmed); AMOUNTS never do. Anything that
 * takes money back is a NEW negative row pointing at what it undoes.
 */
class AffilieTransactionService
{
    public function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    /**
     * @return array{valid: bool, message: string, affilieCode: ?AffilieCode, affilie: ?Affilie}
     */
    public function validateAffilieCodeForTicket(
        string $code,
        float $subtotal_ht_after_regular_discount,
        ?int $client_id = null,
        ?string $phone = null,
        ?string $email = null,
    ): array {
        unset($client_id, $phone, $email);

        $normalized = $this->normalizeCode($code);
        /** @var AffilieCode|null $affilieCode */
        $affilieCode = AffilieCode::query()
            ->with('affilie')
            ->whereRaw('UPPER(TRIM(code)) = ?', [$normalized])
            ->first();

        if (! $affilieCode) {
            return ['valid' => false, 'message' => __('Code affilié invalide.'), 'affilieCode' => null, 'affilie' => null];
        }

        if ($affilieCode->status !== AffilieCodeStatus::Active) {
            return ['valid' => false, 'message' => __('Ce code affilié n’est pas actif.'), 'affilieCode' => null, 'affilie' => null];
        }

        $affilie = $affilieCode->affilie;
        if (! $affilie) {
            return ['valid' => false, 'message' => __('Affilié introuvable pour ce code.'), 'affilieCode' => null, 'affilie' => null];
        }

        if ($affilie->status !== AffilieStatus::Active) {
            return ['valid' => false, 'message' => __('Ce affilié n’est pas actif.'), 'affilieCode' => null, 'affilie' => null];
        }

        if ($subtotal_ht_after_regular_discount < 0) {
            return ['valid' => false, 'message' => __('Montant ticket invalide.'), 'affilieCode' => null, 'affilie' => null];
        }

        return ['valid' => true, 'message' => '', 'affilieCode' => $affilieCode, 'affilie' => $affilie];
    }

    public function effectiveCommissionRatePercent(AffilieCode $code, Affilie $affilie): float
    {
        if ($code->commission_rate !== null && (float) $code->commission_rate > 0) {
            return (float) $code->commission_rate;
        }

        return $affilie->effectiveCommissionRate();
    }

    public function computeAffilieDiscountHt(AffilieCode $code, float $baseAfterRegularDiscountHt): float
    {
        $disc = $code->computeDiscountHt(max(0.0, $baseAfterRegularDiscountHt));

        return min($disc, max(0.0, $baseAfterRegularDiscountHt));
    }

    public function calculateCommissionAmount(float $base, float $ratePercent): float
    {
        return round(max(0.0, $base) * max(0.0, $ratePercent) / 100, 3);
    }

    /**
     * @return array{discount_ht: float, rate: float, commission_amount: float, commission_base: float}
     */
    public function previewFromTotals(AffilieCode $code, Affilie $affilie, array $totals): array
    {
        $baseAfterRegular = max(0.0, (float) ($totals['base_after_regular_discount'] ?? 0));
        $discountHt = $this->computeAffilieDiscountHt($code, $baseAfterRegular);
        $commissionBase = max(0.0, (float) ($totals['final_paid_amount'] ?? 0));
        $rate = $this->effectiveCommissionRatePercent($code, $affilie);
        $commissionAmount = $this->calculateCommissionAmount($commissionBase, $rate);

        return [
            'discount_ht' => $discountHt,
            'rate' => $rate,
            'commission_amount' => $commissionAmount,
            'commission_base' => $commissionBase,
        ];
    }

    public function processTicketCommission(Ticket $ticket): void
    {
        DB::transaction(function () use ($ticket) {
            /** @var Ticket $locked */
            $locked = Ticket::query()->whereKey($ticket->id)->lockForUpdate()->firstOrFail();

            if ($locked->affilie_commission_processed_at !== null) {
                return;
            }

            if (! $locked->affilie_id || ! $locked->affilie_code_id) {
                return;
            }

            if (AffilieTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', AffilieTransactionType::Commission)
                ->where('status', AffilieTransactionStatus::Confirmed)
                ->exists()) {
                return;
            }

            $affilie = Affilie::query()->whereKey($locked->affilie_id)->lockForUpdate()->first();
            $code = AffilieCode::query()->whereKey($locked->affilie_code_id)->first();

            if (! $affilie || ! $code || $affilie->status !== AffilieStatus::Active) {
                return;
            }

            $base = max(0.0, (float) ($locked->affilie_commission_base ?? 0));
            $rate = (float) ($locked->affilie_commission_rate ?? 0);
            $amount = max(0.0, (float) ($locked->affilie_commission_amount ?? $this->calculateCommissionAmount($base, $rate)));

            if ($amount <= 0.0001) {
                $locked->forceFill(['affilie_commission_processed_at' => now()])->save();

                return;
            }

            $balanceBefore = (float) ($affilie->current_balance ?? 0);
            $newBalance = round($balanceBefore + $amount, 3);

            AffilieTransaction::query()->create([
                'affilie_id' => $affilie->id,
                'affilie_code_id' => $code->id,
                'ticket_id' => $locked->id,
                'type' => AffilieTransactionType::Commission,
                'status' => AffilieTransactionStatus::Confirmed,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'description' => __('Commission ticket :num', ['num' => (string) ($locked->numero ?? $locked->id)]),
                'metadata' => [
                    'ticket_id' => $locked->id,
                    'code' => $code->code,
                    'commission_base' => $base,
                    'commission_rate' => $rate,
                ],
                'created_by' => Auth::id(),
            ]);

            $affilie->forceFill([
                'current_balance' => $newBalance,
                'total_earned' => round((float) ($affilie->total_earned ?? 0) + $amount, 3),
            ])->save();

            $code->increment('used_count');

            $locked->forceFill([
                'affilie_commission_processed_at' => now(),
                'affilie_commission_base' => $base,
                'affilie_commission_rate' => $rate,
                'affilie_commission_amount' => $amount,
            ])->save();
        });
    }

    public function reverseTicketCommission(Ticket $ticket, ?string $reason = null): void
    {
        DB::transaction(function () use ($ticket, $reason) {
            /** @var Ticket $locked */
            $locked = Ticket::query()->whereKey($ticket->id)->lockForUpdate()->firstOrFail();

            $original = AffilieTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', AffilieTransactionType::Commission)
                ->where('status', AffilieTransactionStatus::Confirmed)
                ->first();

            if (! $original) {
                return;
            }

            $already = AffilieTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', AffilieTransactionType::Reversal)
                ->where('status', AffilieTransactionStatus::Confirmed)
                ->get()
                ->contains(fn (AffilieTransaction $r) => (int) data_get($r->metadata, 'reverses_transaction_id') === (int) $original->id);

            if ($already) {
                return;
            }

            $affilie = Affilie::query()->whereKey($original->affilie_id)->lockForUpdate()->firstOrFail();
            $credit = max(0.0, (float) $original->amount);
            $signed = -round($credit, 3);
            $newBal = round((float) ($affilie->current_balance ?? 0) + $signed, 3);

            AffilieTransaction::query()->create([
                'affilie_id' => $affilie->id,
                'affilie_code_id' => $original->affilie_code_id,
                'ticket_id' => $locked->id,
                'type' => AffilieTransactionType::Reversal,
                'status' => AffilieTransactionStatus::Confirmed,
                'amount' => $signed,
                'balance_after' => $newBal,
                'description' => $reason ?? __('Annulation commission ticket :num', ['num' => (string) ($locked->numero ?? $locked->id)]),
                'metadata' => [
                    'reverses_transaction_id' => $original->id,
                ],
                'created_by' => Auth::id(),
            ]);

            $affilie->forceFill([
                'current_balance' => $newBal,
                'total_earned' => round(max(0.0, (float) ($affilie->total_earned ?? 0) + $signed), 3),
            ])->save();
        });
    }

    public function getAvailableBalance(Affilie $affilie): float
    {
        return round((float) ($affilie->fresh()->current_balance ?? 0), 3);
    }

    /**
     * Single-step payout: records a paid payment and updates affilie balances.
     *
     * @throws \InvalidArgumentException
     */
    public function recordAffiliePayment(Affilie $affilie, float $amount, ?string $adminNote = null, ?string $paymentReference = null): void
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException(__('Montant de paiement invalide.'));
        }

        DB::transaction(function () use ($affilie, $amount, $adminNote, $paymentReference) {
            $lockedAffilie = Affilie::query()->whereKey($affilie->id)->lockForUpdate()->firstOrFail();
            $bal = (float) ($lockedAffilie->current_balance ?? 0);
            if ($amount > $bal + 0.0001) {
                throw new \InvalidArgumentException(__('Solde affilié insuffisant.'));
            }

            $signed = -round($amount, 3);
            $newBal = round($bal + $signed, 3);

            AffilieTransaction::query()->create([
                'affilie_id' => $lockedAffilie->id,
                'ticket_id' => null,
                'affilie_code_id' => null,
                'type' => AffilieTransactionType::Payment,
                'status' => AffilieTransactionStatus::Paid,
                'amount' => $signed,
                'balance_after' => $newBal,
                'description' => __('Paiement affilié'),
                'metadata' => array_filter([
                    'admin_note' => $adminNote,
                    'payment_reference' => $paymentReference,
                ]),
                'created_by' => Auth::id(),
            ]);

            $lockedAffilie->forceFill([
                'current_balance' => $newBal,
                'total_paid' => round((float) ($lockedAffilie->total_paid ?? 0) + $amount, 3),
            ])->save();
        });
    }

    public function adjustBalance(Affilie $affilie, float $signedAmount, ?string $note = null): AffilieTransaction
    {
        return DB::transaction(function () use ($affilie, $signedAmount, $note) {
            $lockedAffilie = Affilie::query()->whereKey($affilie->id)->lockForUpdate()->firstOrFail();
            $bal = (float) ($lockedAffilie->current_balance ?? 0);
            $newBal = round($bal + $signedAmount, 3);

            $tx = AffilieTransaction::query()->create([
                'affilie_id' => $lockedAffilie->id,
                'ticket_id' => null,
                'affilie_code_id' => null,
                'type' => AffilieTransactionType::Adjustment,
                'status' => AffilieTransactionStatus::Confirmed,
                'amount' => $signedAmount,
                'balance_after' => $newBal,
                'description' => $note ?? __('Ajustement manuel'),
                'metadata' => [],
                'created_by' => Auth::id(),
            ]);

            $earnedDelta = $signedAmount > 0 ? $signedAmount : 0.0;
            $lockedAffilie->forceFill([
                'current_balance' => $newBal,
                'total_earned' => round((float) ($lockedAffilie->total_earned ?? 0) + $earnedDelta, 3),
            ])->save();

            return $tx;
        });
    }

    /*
    |===========================================================================================
    | ORDER COMMISSION  —  commandes
    |===========================================================================================
    |
    | THE STATE MACHINE
    |
    |   order created by affiliate ....... (optional) commission row, status `pending`, amount +X
    |                                      Written by the order-entry path, not here. A pending row
    |                                      is a PROMISE: it does NOT move `current_balance`.
    |
    |   etat -> a DELIVERED status ....... the row becomes `confirmed`. +X is added to the balance.
    |                                      EARNED. Not yet payable.
    |
    |   commandes.cod_remitted_at set .... PAYABLE. There is no `payable` status in
    |                                      AffilieTransactionStatus and none is invented: payability
    |                                      is DERIVED by joining the confirmed row to its order.
    |                                      A status would have to be kept in sync with a date, and
    |                                      the two would eventually disagree.
    |
    |   Friday batch ..................... an AffiliePayout row, status `pending`. Assembles only.
    |   admin confirms ................... payment row −X, status `paid`. Balance falls.
    |
    |   etat -> a CANCELLED status ....... reversal −X (only if a commission was confirmed)
    |                                      + return fee −10 DT (only if the parcel was dispatched).
    |
    | THE VOCABULARY, AND A DELIBERATE DIVERGENCE FROM THE STOCK PATH
    |
    | Accrual reads `PointsService::DELIVERED_STATUSES` and reversal reads
    | `PointsService::CANCELLED_STATUSES` — the constants, never a fresh string literal. There is
    | one delivery vocabulary in this system.
    |
    | `CommandeObserver` restores STOCK on the single literal `'annuler'`, and commission does NOT
    | follow it. That is a choice, not an oversight. Stock is a physical fact: the goods are back on
    | the shelf or they are not, and a `retour` that has not yet physically arrived must not inflate
    | the count. Commission is a claim: the moment an order is marked returned by ANY of the seven
    | spellings, the affiliate's claim to it has ended. Reversing on `annuler` alone would mean a
    | parcel refused at the door — which is precisely what `retour` means — silently keeps its
    | commission, and the shop pays for a sale it never made. Commission follows all seven.
    */

    /** Deterministic idempotency keys. UNIQUE at the database level — see migration 2026_09_09_120200. */
    private function orderCommissionKey(int $commandeId): string
    {
        return 'commande:'.$commandeId.':commission';
    }

    private function orderReversalKey(int $commandeId): string
    {
        return 'commande:'.$commandeId.':commission-reversal';
    }

    private function orderReturnFeeKey(int $commandeId): string
    {
        return 'commande:'.$commandeId.':return-fee';
    }

    /**
     * THE OBSERVER ENTRY POINT. NEVER THROWS.
     *
     * `PointsService::earn()` swallows everything for a reason it states plainly: a loyalty failure
     * must not affect a real order. The same posture is required here and matters more — this runs
     * inside `CommandeObserver::updated()`, so an uncaught throw would abort an ADMIN CHANGING AN
     * ORDER'S STATUS. A commission bug must never be able to stop the shop from marking a parcel
     * delivered. Everything is logged; nothing propagates.
     */
    public function syncOrderCommissionOnStatusChange(Commande $commande): void
    {
        try {
            if (! Schema::hasColumn('commandes', 'affilie_id')) {
                return; // migration 2026_09_09_120100 has not run on this install.
            }

            if (empty($commande->affilie_id)) {
                return; // Not an affiliate order. The overwhelmingly common case, checked first.
            }

            $etat = (string) $commande->etat;

            if (in_array($etat, PointsService::DELIVERED_STATUSES, true)) {
                $this->processOrderCommission($commande);

                return;
            }

            if (in_array($etat, PointsService::CANCELLED_STATUSES, true)) {
                // Order matters. The reversal takes back what was earned; the fee is charged on top
                // and is owed even by an affiliate who earned nothing on this order.
                $this->reverseOrderCommission($commande);
                $this->chargeReturnFee($commande);
            }
        } catch (\Throwable $e) {
            Log::error('Affilie order commission sync failed', [
                'commande_id' => $commande->id,
                'etat' => $commande->etat,
                'affilie_id' => $commande->affilie_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * The commission base: what the percentage is taken OF.
     *
     * `prix_ttc` minus `frais_livraison`. Delivery is money the shop collects and hands to Aramex —
     * a pass-through cost, not margin — so commission on it is paid out of the shop's own pocket on
     * every order forever. `PointsService::earnableSpend()` excludes shipping for the same reason
     * and this deliberately mirrors it.
     *
     * It does NOT add back redeemed loyalty points, and there the two economies part company on
     * purpose. Points treat a redemption as a payment instrument, so a customer spending an old
     * reward still earns on the full product price — the shop is giving away points, which cost
     * nothing to mint. Commission is CASH. In a COD order the cash that arrives is `prix_ttc` and
     * nothing more; paying a percentage of money that was never collected is a straight loss.
     */
    public function orderCommissionBase(Commande $commande): float
    {
        $ttc = max(0.0, (float) ($commande->prix_ttc ?? 0));

        if ((bool) config('affilies.commission.include_shipping', false)) {
            return round($ttc, 3);
        }

        return round(max(0.0, $ttc - max(0.0, (float) ($commande->frais_livraison ?? 0))), 3);
    }

    /**
     * Tunisian mobile numbers, reduced to the 8 digits that identify them.
     *
     * `+216 27 123 456`, `0021627123456` and `27123456` are one person. Mirrors the normalisation
     * already used by `Commande::scopeVisibleToStorefrontUser()`, so the fraud guard and the
     * order-visibility rule cannot come to disagree about what "same phone" means.
     */
    /**
     * Public and static ON PURPOSE: the affiliate order form needs the SAME normalisation to
     * refuse self-dealing at entry, and a private copy there had already been written. Two
     * implementations of a fraud check drift — one gets a fix, the other does not, and the guard
     * quietly stops matching the numbers it is supposed to catch. One function, both callers.
     */
    public static function normalisePhone(?string $raw): string
    {
        $digits = preg_replace('/\D+/', '', (string) $raw) ?? '';

        if (strlen($digits) === 13 && str_starts_with($digits, '00216')) {
            $digits = substr($digits, 5);
        }
        if (strlen($digits) === 11 && str_starts_with($digits, '216')) {
            $digits = substr($digits, 3);
        }

        return $digits;
    }

    /**
     * THE SELF-DEALING GUARD — the highest-exposure fraud in a manual-entry reseller model.
     *
     * An affiliate who can type an order can type their own address into it. Nothing about that
     * order is fake: real goods leave, a real courier delivers, real cash comes back. It simply
     * pays the affiliate a percentage for buying from themselves, indefinitely, and looks like
     * healthy volume on every report the shop has.
     *
     * BOTH order phone fields are tested, not just the delivery one. `livraison_phone` is the
     * number the parcel is routed to and is the one an affiliate would falsify first; `phone` is
     * the account that placed it. A match on either is disqualifying.
     *
     * There is no config switch to disable this, and that is intentional — a fraud guard with an
     * off switch is a fraud guard that will be found switched off. A legitimate case (a coach who
     * genuinely buys through their own code) is resolved by an admin `adjustBalance()`, which is
     * attributed to a named user and leaves a row. "Somebody decided this" is exactly the audit
     * trail an automatic exemption would destroy.
     */
    private function isSelfDealing(Commande $commande, Affilie $affilie): bool
    {
        $affiliePhone = self::normalisePhone($affilie->phone ?? null);

        // Too short to identify anybody. Two empty strings must never compare equal, or every
        // affiliate with no phone on file would be blocked from every order with none either.
        if (strlen($affiliePhone) < 8) {
            return false;
        }

        foreach ([$commande->livraison_phone ?? null, $commande->phone ?? null] as $candidate) {
            $normalised = self::normalisePhone($candidate);
            if (strlen($normalised) >= 8 && $normalised === $affiliePhone) {
                return true;
            }
        }

        return false;
    }

    /**
     * Accrue commission for a delivered order. Idempotent, and idempotent in three layers:
     *
     *   1. `lockForUpdate` on the ORDER, then on the AFFILIATE. Same acquisition order everywhere
     *      in this class, which is what stops two of these deadlocking against each other.
     *   2. The marker `commandes.affilie_commission_processed_at`, plus a check for an existing
     *      confirmed row — belt and braces, because the marker is a value this code decides to
     *      trust and the row is the money itself.
     *   3. `idempotency_key` with a UNIQUE INDEX. This is the only one of the three that survives
     *      a process that is not this one: a retried queue job or a double-clicked admin button
     *      racing outside the lock's reach gets a duplicate-key error and rolls back having moved
     *      nothing. Layers 1 and 2 are correctness; layer 3 is the guarantee.
     */
    /**
     * The affiliate's earning on an order: what they charged, minus what the shop must receive.
     *
     *     Σ over lines of  (prix_unitaire − products.prix_affilie) × qte
     *
     * Returns null when NO line carries a `prix_affilie` — the caller then falls back to the
     * percentage model, so a legacy order still settles instead of paying zero in silence.
     *
     * ── WHY AN UNPRICED LINE CONTRIBUTES ZERO RATHER THAN VOIDING THE ORDER ─────────────────
     * A null `prix_affilie` means an administrator never set a base price for that product, so its
     * spread is genuinely unknown. Guessing it — from `prix`, `promo`, or a percentage — would
     * invent the number that decides how much money leaves the business.
     *
     * Refusing the whole order's commission would punish the affiliate for the shop's missing
     * data. Contributing zero for that line pays them for everything that IS priced, and the
     * warning names the product so it can be fixed and adjusted with adjustBalance(). The order
     * form refuses unpriced products at creation, so this is a defensive path, not the normal one.
     *
     * A negative spread — sold below the shop's base price — is clamped to zero here. It should be
     * impossible (validated at order entry) and if it ever happens the shop absorbs it rather than
     * the ledger recording a commission that reaches into the affiliate's other earnings.
     */
    public function orderSpreadCommission(Commande $commande): ?float
    {
        $lines = DB::table('commande_details')
            ->join('products', 'products.id', '=', 'commande_details.produit_id')
            ->where('commande_details.commande_id', $commande->id)
            ->get(['commande_details.produit_id', 'commande_details.qte', 'commande_details.prix_unitaire', 'products.prix_affilie', 'products.designation_fr']);

        if ($lines->isEmpty()) {
            return null;
        }

        $total = 0.0;
        $priced = 0;

        foreach ($lines as $line) {
            if ($line->prix_affilie === null) {
                Log::warning('Affilie spread: line skipped, product has no prix_affilie', [
                    'commande_id' => $commande->id,
                    'produit_id' => $line->produit_id,
                    'produit' => $line->designation_fr ?? null,
                ]);

                continue;
            }

            $priced++;
            $qte = max(0.0, (float) $line->qte);
            $spread = (float) $line->prix_unitaire - (float) $line->prix_affilie;

            $total += max(0.0, $spread) * $qte;
        }

        // No line was priced: the spread model has nothing to say about this order.
        if ($priced === 0) {
            return null;
        }

        return round($total, 3);
    }

    public function processOrderCommission(Commande $commande): void
    {
        DB::transaction(function () use ($commande) {
            /** @var Commande $locked */
            $locked = Commande::query()->whereKey($commande->id)->lockForUpdate()->firstOrFail();

            if ($locked->affilie_commission_processed_at !== null) {
                return;
            }

            if (empty($locked->affilie_id)) {
                return;
            }

            $existing = AffilieTransaction::query()
                ->where('commande_id', $locked->id)
                ->where('type', AffilieTransactionType::Commission)
                ->get();

            if ($existing->contains(fn (AffilieTransaction $t) => $t->status === AffilieTransactionStatus::Confirmed)) {
                return;
            }

            /*
             * ONCE REVERSED, RE-ACCRUAL IS AN ADMIN'S DECISION, NOT AN AUTOMATIC ONE.
             *
             * An order that goes delivered -> cancelled -> delivered is either a data-entry mess or
             * somebody probing what the system will pay for. Neither should be settled by silently
             * crediting the money a second time. Logged at warning so it is visible, and left for a
             * human with `adjustBalance()`.
             */
            $reversed = AffilieTransaction::query()
                ->where('commande_id', $locked->id)
                ->where('type', AffilieTransactionType::Reversal)
                ->where('status', AffilieTransactionStatus::Confirmed)
                ->exists();

            if ($reversed) {
                Log::warning('Affilie commission NOT re-accrued: this order was already reversed', [
                    'commande_id' => $locked->id,
                    'affilie_id' => $locked->affilie_id,
                    'note' => 'Re-credit manually with adjustBalance() if the reversal was a mistake.',
                ]);

                return;
            }

            /** @var Affilie|null $affilie */
            $affilie = Affilie::query()->whereKey($locked->affilie_id)->lockForUpdate()->first();

            if (! $affilie || $affilie->status !== AffilieStatus::Active) {
                // A suspended affiliate keeps their existing balance but earns nothing new. The
                // marker is NOT stamped: reinstating them and re-saving the order should work.
                Log::info('Affilie commission skipped: affilie missing or not active', [
                    'commande_id' => $locked->id,
                    'affilie_id' => $locked->affilie_id,
                ]);

                return;
            }

            if ($this->isSelfDealing($locked, $affilie)) {
                // Stamped, unlike the suspension case above: this will never become payable by
                // being retried, and leaving it unstamped means re-evaluating it on every save.
                $locked->forceFill(['affilie_commission_processed_at' => now()])->saveQuietly();

                Log::warning('Affilie commission REFUSED: self-dealing (order phone == affilie phone)', [
                    'commande_id' => $locked->id,
                    'affilie_id' => $affilie->id,
                    'numero' => $locked->numero,
                ]);

                return;
            }

            $base = $this->orderCommissionBase($locked);

            $minTtc = (float) config('affilies.commission.min_order_ttc', 0);
            if ($minTtc > 0 && (float) ($locked->prix_ttc ?? 0) + 0.0001 < $minTtc) {
                $locked->forceFill(['affilie_commission_processed_at' => now()])->saveQuietly();

                return;
            }

            /** @var AffilieCode|null $code */
            $code = $locked->affilie_code_id
                ? AffilieCode::query()->whereKey($locked->affilie_code_id)->first()
                : null;

            $rate = $code
                ? $this->effectiveCommissionRatePercent($code, $affilie)
                : $affilie->effectiveCommissionRate();

            /*
             * ── AFFILIATE ORDERS EARN A SPREAD, NOT A PERCENTAGE ────────────────────────────
             * Two commission models coexist deliberately and must not be merged:
             *
             *   POS tickets      percentage of the ticket total. The boutique flow, unchanged.
             *   Affiliate orders (selling price − prix_affilie) × qty, summed over the lines.
             *
             * The owner's model: the shop publishes a `prix_affilie` per product — what it must
             * receive — and the affiliate sells at whatever price they like, keeping everything
             * above it. A percentage of the order total would pay them for the shop's own base
             * price as well as their markup.
             *
             * The percentage still has a job: it is the affiliate's DEFAULT MARKUP, used to
             * suggest a selling price so they need not price 11,000 products by hand. It decides
             * what they charge; it does not decide what they earn.
             *
             * Falls back to the percentage when the spread cannot be computed at all (an order
             * with no priced lines), so a legacy or hand-made order still settles rather than
             * silently paying zero.
             */
            $spread = $this->orderSpreadCommission($locked);
            $amount = $spread ?? $this->calculateCommissionAmount($base, $rate);

            /*
             * A pending row, if the order-entry path wrote one, is the CONTRACT: the rate agreed
             * when the affiliate took the order. Honour its amount rather than recomputing, so an
             * admin lowering the commission rate on Tuesday cannot retroactively cut what was
             * promised on Monday.
             */
            $pending = $existing->first(fn (AffilieTransaction $t) => $t->status === AffilieTransactionStatus::Pending);

            /*
             * THE CROSS-MODULE CONTRACT, ENFORCED RATHER THAN ASSUMED.
             *
             * A pending row must NOT have moved `affilies.current_balance` — it is a promise, and
             * the balance only ever counts confirmed and paid rows. `balance_after` is the tell: a
             * row that moved the balance recorded where it landed. If a pending row arrives here
             * carrying one, whoever wrote it already credited the affiliate, and promoting it would
             * add the same commission to the balance a SECOND time.
             *
             * This code cannot tell which of the two is wrong, so it refuses to guess and pays
             * nothing. Not paying is a support ticket; paying twice is money gone.
             */
            if ($pending && $pending->balance_after !== null) {
                Log::error('Affilie commission NOT accrued: pending row already carries a balance_after', [
                    'commande_id' => $locked->id,
                    'affilie_id' => $affilie->id,
                    'transaction_id' => $pending->id,
                    'note' => 'A pending commission must not move current_balance. Resolve by hand.',
                ]);

                return;
            }

            if ($pending) {
                $amount = round(abs((float) $pending->amount), 3);
            }

            /*
             * THE CEILING. Commission can never exceed the base it is a percentage of, whatever a
             * malformed pending row or a 300% rate says. `PointsService::earnableSpend()` caps
             * against the goods subtotal for the same reason: a bad number upstream must be
             * survivable, not compounding.
             */
            if ($amount > $base) {
                Log::warning('Affilie commission capped at the order base', [
                    'commande_id' => $locked->id,
                    'requested' => $amount,
                    'base' => $base,
                ]);
                $amount = $base;
            }

            $amount = round(max(0.0, $amount), 3);

            if ($amount <= 0.0001) {
                // A legitimate zero (free order, 0% rate). Stamp so it is never reconsidered.
                $locked->forceFill(['affilie_commission_processed_at' => now()])->saveQuietly();

                return;
            }

            $balanceBefore = (float) ($affilie->current_balance ?? 0);
            $newBalance = round($balanceBefore + $amount, 3);

            $metadata = [
                'commande_id' => $locked->id,
                'numero' => $locked->numero,
                'code' => $code?->code,
                'commission_base' => $base,
                'commission_rate' => round($rate, 3),
                'prix_ttc' => round((float) ($locked->prix_ttc ?? 0), 3),
                'frais_livraison' => round((float) ($locked->frais_livraison ?? 0), 3),
                'delivered_at' => optional($locked->delivered_at)->toDateTimeString(),
                // The second gate, recorded as it stood at accrual. Almost always null here: the
                // courier has not remitted at the moment it delivers.
                'cod_remitted_at' => optional($locked->cod_remitted_at)->toDateTimeString(),
            ];

            $description = __('Commission commande :num', ['num' => (string) ($locked->numero ?? $locked->id)]);

            if ($pending) {
                // PROMOTION, not a rewrite. The status moves and the balance stamp is filled in;
                // `amount` is untouched. This is the owner's "same row -> confirmed".
                $pending->forceFill([
                    'status' => AffilieTransactionStatus::Confirmed,
                    'balance_after' => $newBalance,
                    'idempotency_key' => $this->orderCommissionKey($locked->id),
                    'metadata' => array_merge((array) ($pending->metadata ?? []), $metadata, [
                        'promoted_from_pending_at' => now()->toDateTimeString(),
                    ]),
                ])->save();
            } else {
                AffilieTransaction::query()->create([
                    'affilie_id' => $affilie->id,
                    'affilie_code_id' => $code?->id,
                    'commande_id' => $locked->id,
                    'ticket_id' => null,
                    'type' => AffilieTransactionType::Commission,
                    'status' => AffilieTransactionStatus::Confirmed,
                    'amount' => $amount,
                    'balance_after' => $newBalance,
                    'description' => $description,
                    'metadata' => $metadata,
                    'idempotency_key' => $this->orderCommissionKey($locked->id),
                    'created_by' => Auth::id(),
                ]);
            }

            $affilie->forceFill([
                'current_balance' => $newBalance,
                'total_earned' => round((float) ($affilie->total_earned ?? 0) + $amount, 3),
            ])->save();

            if ($code) {
                $code->increment('used_count');
            }

            // saveQuietly: this write must not re-enter CommandeObserver::updated().
            $locked->forceFill(['affilie_commission_processed_at' => now()])->saveQuietly();

            Log::info('Affilie commission accrued on delivery', [
                'commande_id' => $locked->id,
                'affilie_id' => $affilie->id,
                'amount' => $amount,
                'base' => $base,
                'rate' => $rate,
                'balance_after' => $newBalance,
            ]);
        });
    }

    /**
     * Take the commission back when a delivered order is cancelled or returned.
     *
     * A NEW NEGATIVE ROW. The original is never edited and never deleted — an accountant looking at
     * this affiliate must be able to see that money was earned and then taken back, which a row
     * that has been quietly amended cannot show. `metadata.reverses_transaction_id` is the link.
     *
     * `total_earned` is reduced too, floored at zero, exactly as `reverseTicketCommission()` does:
     * it is a lifetime-earnings display, and a reversal genuinely un-earns.
     */
    public function reverseOrderCommission(Commande $commande, ?string $reason = null): void
    {
        DB::transaction(function () use ($commande, $reason) {
            /** @var Commande $locked */
            $locked = Commande::query()->whereKey($commande->id)->lockForUpdate()->firstOrFail();

            /** @var AffilieTransaction|null $original */
            $original = AffilieTransaction::query()
                ->where('commande_id', $locked->id)
                ->where('type', AffilieTransactionType::Commission)
                ->where('status', AffilieTransactionStatus::Confirmed)
                ->first();

            if (! $original) {
                /*
                 * Nothing was ever EARNED on this order — cancelled before delivery, most likely.
                 * Not an error, and NOT a reason to skip the return fee: the parcel may still have
                 * travelled. The caller charges that separately.
                 *
                 * But a PENDING row may exist, written when the affiliate entered the order as the
                 * record of the price agreed that day. Left alone it sits at "En attente" in the
                 * affiliate's ledger for ever, on an order everyone knows is dead — the balance is
                 * untouched and correct, but the affiliate is looking at a promise that will never
                 * be kept and has no way to tell that from one still in flight.
                 *
                 * Cancel it. `balance_after` stays null exactly as it was: this row never moved the
                 * balance and closing it must not either. Guarded on Pending so a Confirmed or Paid
                 * row can never be rewritten by this path — money rows are immutable, and this is
                 * the one status that carries no money.
                 */
                AffilieTransaction::query()
                    ->where('commande_id', $locked->id)
                    ->where('type', AffilieTransactionType::Commission)
                    ->where('status', AffilieTransactionStatus::Pending)
                    ->whereNull('balance_after')
                    ->update([
                        'status' => AffilieTransactionStatus::Cancelled,
                        'description' => trim('Commande annulée. '.(string) $reason),
                    ]);

                return;
            }

            $already = AffilieTransaction::query()
                ->where('commande_id', $locked->id)
                ->where('type', AffilieTransactionType::Reversal)
                ->where('status', AffilieTransactionStatus::Confirmed)
                ->get()
                ->contains(fn (AffilieTransaction $r) => (int) data_get($r->metadata, 'reverses_transaction_id') === (int) $original->id);

            if ($already) {
                return;
            }

            /** @var Affilie $affilie */
            $affilie = Affilie::query()->whereKey($original->affilie_id)->lockForUpdate()->firstOrFail();

            $credit = max(0.0, (float) $original->amount);
            $signed = -round($credit, 3);
            $newBalance = round((float) ($affilie->current_balance ?? 0) + $signed, 3);

            AffilieTransaction::query()->create([
                'affilie_id' => $affilie->id,
                'affilie_code_id' => $original->affilie_code_id,
                'commande_id' => $locked->id,
                'ticket_id' => null,
                'type' => AffilieTransactionType::Reversal,
                'status' => AffilieTransactionStatus::Confirmed,
                'amount' => $signed,
                'balance_after' => $newBalance,
                'description' => $reason ?? __('Annulation commission commande :num', ['num' => (string) ($locked->numero ?? $locked->id)]),
                'metadata' => [
                    'reverses_transaction_id' => $original->id,
                    'commande_id' => $locked->id,
                    'etat' => (string) $locked->etat,
                ],
                'idempotency_key' => $this->orderReversalKey($locked->id),
                'created_by' => Auth::id(),
            ]);

            $affilie->forceFill([
                'current_balance' => $newBalance,
                'total_earned' => round(max(0.0, (float) ($affilie->total_earned ?? 0) + $signed), 3),
            ])->save();

            Log::info('Affilie commission reversed', [
                'commande_id' => $locked->id,
                'affilie_id' => $affilie->id,
                'amount' => $signed,
                'balance_after' => $newBalance,
            ]);
        });
    }

    /** The fee this affiliate pays for a returned parcel, in TND. */
    public function returnFeeFor(Affilie $affilie): float
    {
        $default = (float) config('affilies.return_fee.amount', 10.0);

        /*
         * Read through getAttributes(): `return_fee_override` is a real column (migration
         * 2026_09_09_120100) but is not declared in Affilie::$fillable or $casts, so a plain
         * property read is fine while `??` on the model would not distinguish "column absent"
         * from "explicitly null".
         *
         * NULL means "use the shop default". 0.0 means "this affiliate is exempt" and is honoured
         * as a real value — `?:` would silently turn a deliberate exemption back into 10 DT.
         */
        $attributes = $affilie->getAttributes();
        $override = array_key_exists('return_fee_override', $attributes) ? $attributes['return_fee_override'] : null;
        $fee = $override !== null ? (float) $override : $default;

        $max = (float) config('affilies.return_fee.max_amount', 100.0);

        return round(max(0.0, min($fee, $max)), 3);
    }

    /**
     * Charge the return fee. THIS IS THE ONE PLACE THE BALANCE MAY GO NEGATIVE.
     *
     * `recordAffiliePayment()` refuses to overdraw and is right to: money must not leave the
     * building that the affiliate has not earned. This is the mirror image. The courier has
     * already been paid for the outbound leg of a parcel that came back, and that cost belongs to
     * whoever entered the order. If the affiliate has no balance to take it from, the balance goes
     * NEGATIVE AND STAYS THERE as a debt, netted off the next commission they earn. Refusing to
     * record the fee would mean the shop silently absorbing it — which is exactly the incentive
     * that makes speculative order entry free.
     *
     * So there is no balance check here, and its absence is the feature.
     *
     * Recorded as an `Adjustment` with a negative amount, not a `Reversal`: a reversal undoes a
     * specific earlier row and this undoes nothing — it is a new cost. `AffilieTransactionType`
     * has no `Fee` case and the enums are out of scope for this change, so `metadata.kind` carries
     * the distinction and is what the Filament ledger and any report should filter on.
     *
     * `total_earned` is NOT reduced. A fee is a debt, not negative earnings.
     */
    public function chargeReturnFee(Commande $commande): void
    {
        if (! (bool) config('affilies.return_fee.enabled', true)) {
            return;
        }

        DB::transaction(function () use ($commande) {
            /** @var Commande $locked */
            $locked = Commande::query()->whereKey($commande->id)->lockForUpdate()->firstOrFail();

            if (empty($locked->affilie_id)) {
                return;
            }

            /*
             * ONLY IF THE PARCEL ACTUALLY WENT OUT. An order cancelled while it was still a row in
             * the admin panel cost the shop nothing, and charging 10 DT for it would punish an
             * affiliate for a customer changing their mind before anything was picked. See
             * Commande::wasDispatched() for why the status alone cannot answer this.
             */
            if (! $locked->wasDispatched()) {
                return;
            }

            $alreadyCharged = AffilieTransaction::query()
                ->where('commande_id', $locked->id)
                ->where('type', AffilieTransactionType::Adjustment)
                ->get()
                ->contains(fn (AffilieTransaction $t) => data_get($t->metadata, 'kind') === 'return_fee');

            if ($alreadyCharged) {
                return;
            }

            /** @var Affilie|null $affilie */
            $affilie = Affilie::query()->whereKey($locked->affilie_id)->lockForUpdate()->first();
            if (! $affilie) {
                return;
            }

            $fee = $this->returnFeeFor($affilie);
            if ($fee <= 0.0001) {
                return; // Explicitly exempt, or the fee is switched off by amount.
            }

            $signed = -round($fee, 3);
            $newBalance = round((float) ($affilie->current_balance ?? 0) + $signed, 3);

            AffilieTransaction::query()->create([
                'affilie_id' => $affilie->id,
                'affilie_code_id' => $locked->affilie_code_id,
                'commande_id' => $locked->id,
                'ticket_id' => null,
                'type' => AffilieTransactionType::Adjustment,
                'status' => AffilieTransactionStatus::Confirmed,
                'amount' => $signed,
                'balance_after' => $newBalance,
                'description' => __('Frais de retour commande :num', ['num' => (string) ($locked->numero ?? $locked->id)]),
                'metadata' => [
                    'kind' => 'return_fee',
                    'commande_id' => $locked->id,
                    'etat' => (string) $locked->etat,
                    'fee_amount' => round($fee, 3),
                    'waivable' => true,
                ],
                'idempotency_key' => $this->orderReturnFeeKey($locked->id),
                'created_by' => Auth::id(),
            ]);

            // No total_earned change: a fee is a debt, not negative earnings.
            $affilie->forceFill(['current_balance' => $newBalance])->save();

            Log::info('Affilie return fee charged', [
                'commande_id' => $locked->id,
                'affilie_id' => $affilie->id,
                'fee' => $fee,
                'balance_after' => $newBalance,
                'overdrawn' => $newBalance < 0,
            ]);
        });
    }

    /**
     * WAIVE a return fee the shop caused — a stock-out, the wrong item picked, damage in transit.
     *
     * Writes a COMPENSATING POSITIVE ROW. It does not delete the fee and it does not edit it. The
     * fee was a real event and the waiver is a second real event with a named human attached; an
     * affiliate querying their balance is entitled to see both, and a deleted row cannot be
     * explained to them.
     *
     * Admin-facing, so unlike the observer path this THROWS on invalid input.
     *
     * @throws \InvalidArgumentException
     */
    public function waiveReturnFee(Commande $commande, ?string $reason = null): AffilieTransaction
    {
        return DB::transaction(function () use ($commande, $reason) {
            /** @var AffilieTransaction|null $fee */
            $fee = AffilieTransaction::query()
                ->where('commande_id', $commande->id)
                ->where('type', AffilieTransactionType::Adjustment)
                ->orderByDesc('id')
                ->get()
                ->first(fn (AffilieTransaction $t) => data_get($t->metadata, 'kind') === 'return_fee');

            if (! $fee) {
                throw new \InvalidArgumentException(__('Aucun frais de retour à annuler pour cette commande.'));
            }

            $alreadyWaived = AffilieTransaction::query()
                ->where('commande_id', $commande->id)
                ->where('type', AffilieTransactionType::Adjustment)
                ->get()
                ->contains(fn (AffilieTransaction $t) => (int) data_get($t->metadata, 'reverses_transaction_id') === (int) $fee->id);

            if ($alreadyWaived) {
                throw new \InvalidArgumentException(__('Ce frais de retour a déjà été annulé.'));
            }

            /** @var Affilie $affilie */
            $affilie = Affilie::query()->whereKey($fee->affilie_id)->lockForUpdate()->firstOrFail();

            $credit = round(abs((float) $fee->amount), 3);
            $newBalance = round((float) ($affilie->current_balance ?? 0) + $credit, 3);

            $tx = AffilieTransaction::query()->create([
                'affilie_id' => $affilie->id,
                'affilie_code_id' => $fee->affilie_code_id,
                'commande_id' => $commande->id,
                'ticket_id' => null,
                'type' => AffilieTransactionType::Adjustment,
                'status' => AffilieTransactionStatus::Confirmed,
                'amount' => $credit,
                'balance_after' => $newBalance,
                'description' => $reason ?? __('Annulation des frais de retour (erreur boutique) commande :num', [
                    'num' => (string) ($commande->numero ?? $commande->id),
                ]),
                'metadata' => [
                    'kind' => 'return_fee_waiver',
                    'reverses_transaction_id' => $fee->id,
                    'commande_id' => $commande->id,
                    'reason' => $reason,
                ],
                'idempotency_key' => 'affilie-tx:'.$fee->id.':waiver',
                'created_by' => Auth::id(),
            ]);

            // A waiver restores the balance but does not create earnings, so total_earned is
            // untouched — symmetric with the charge, which did not reduce it.
            $affilie->forceFill(['current_balance' => $newBalance])->save();

            Log::info('Affilie return fee waived', [
                'commande_id' => $commande->id,
                'affilie_id' => $affilie->id,
                'fee_transaction_id' => $fee->id,
                'credit' => $credit,
                'by' => Auth::id(),
            ]);

            return $tx;
        });
    }

    /*
    |===========================================================================================
    | PAYABILITY  —  the second COD gate
    |===========================================================================================
    */

    /**
     * Confirmed order commission whose cash ARAMEX STILL HOLDS.
     *
     * Earned, in the balance, and not yet payable. This is the number that separates
     * "the affiliate is owed money" from "the money exists to pay them".
     *
     * Two exclusions, and the second is easy to get wrong:
     *   · orders with `cod_remitted_at` set — the cash has arrived, so it is payable;
     *   · orders that have a confirmed REVERSAL — the commission row is still there (the ledger is
     *     append-only) but a negative row has already removed it from the balance. Holding it back
     *     as well would subtract the same money twice and understate what the affiliate is owed.
     *
     * Ticket commissions have `commande_id` NULL and are never held: the boutique took the cash
     * over the counter, so it was payable the moment it confirmed.
     */
    public function unremittedCommission(Affilie $affilie): float
    {
        /*
         * The two missing-column cases have OPPOSITE correct answers, so they are not one check.
         *
         * No `affilie_transactions.commande_id`: order commission cannot exist yet — every
         * confirmed row is a boutique ticket, whose cash was taken over the counter and is payable.
         * Nothing is held. Returning "hold everything" here would freeze POS commissions that have
         * been payable for months.
         */
        if (! Schema::hasColumn('affilie_transactions', 'commande_id')) {
            return 0.0;
        }

        /*
         * No `commandes.cod_remitted_at`: order commissions exist but the gate that releases them
         * does not, so NOTHING can be shown to have been remitted. Hold all of it. On a
         * half-migrated database the safe failure is paying nothing, never paying everything.
         */
        if (! Schema::hasColumn('commandes', 'cod_remitted_at')) {
            return round(max(0.0, (float) AffilieTransaction::query()
                ->where('affilie_id', $affilie->id)
                ->where('type', AffilieTransactionType::Commission)
                ->where('status', AffilieTransactionStatus::Confirmed)
                ->whereNotNull('commande_id')
                ->sum('amount')), 3);
        }

        $reversedOrderIds = AffilieTransaction::query()
            ->select('commande_id')
            ->where('affilie_id', $affilie->id)
            ->where('type', AffilieTransactionType::Reversal)
            ->where('status', AffilieTransactionStatus::Confirmed)
            ->whereNotNull('commande_id');

        $held = (float) AffilieTransaction::query()
            ->where('affilie_id', $affilie->id)
            ->where('type', AffilieTransactionType::Commission)
            ->where('status', AffilieTransactionStatus::Confirmed)
            ->whereNotNull('commande_id')
            // An order that has vanished is NOT remitted. whereNotIn against the remitted set
            // deliberately keeps a missing order in the held bucket.
            ->whereNotIn('commande_id', function ($q) {
                $q->select('id')->from('commandes')->whereNotNull('cod_remitted_at');
            })
            ->whereNotIn('commande_id', $reversedOrderIds)
            ->sum('amount');

        return round(max(0.0, $held), 3);
    }

    /**
     * What may actually be paid to this affiliate today.
     *
     *     payable = current_balance − commission earned on orders the courier has not settled
     *
     * Debts (return fees, reversals) are already negative rows inside `current_balance`, so they
     * reduce this automatically. That IS the netting the owner asked for: an affiliate carrying a
     * −30 DT return-fee debt who then earns 50 DT is payable 20, with no special case anywhere.
     *
     * Never negative: a negative balance is a debt carried forward, not a payout of zero-minus.
     */
    public function payableBalance(Affilie $affilie): float
    {
        $balance = round((float) ($affilie->current_balance ?? 0), 3);

        if (! (bool) config('affilies.payout.require_cod_remittance', true)) {
            return round(max(0.0, $balance), 3);
        }

        return round(max(0.0, $balance - $this->unremittedCommission($affilie)), 3);
    }

    /**
     * Settle a batch an admin has confirmed. Admin-facing, so it THROWS.
     *
     * The payout row was assembled on Friday; this may run days later. Every figure is therefore
     * RE-CHECKED under lock rather than trusted from the row — a return in the meantime can have
     * eaten the balance the batch was built from, and paying against a stale snapshot is how an
     * affiliate is paid for a parcel that came back.
     *
     * @throws \InvalidArgumentException
     */
    public function payPreparedPayout(AffiliePayout $payout, ?string $paymentReference = null, ?string $adminNote = null): void
    {
        DB::transaction(function () use ($payout, $paymentReference, $adminNote) {
            /** @var AffiliePayout $lockedPayout */
            $lockedPayout = AffiliePayout::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if ($lockedPayout->status !== AffiliePayoutStatus::Pending) {
                throw new \InvalidArgumentException(__('Ce paiement a déjà été traité.'));
            }

            $amount = round((float) $lockedPayout->amount, 3);
            if ($amount <= 0) {
                throw new \InvalidArgumentException(__('Montant de paiement invalide.'));
            }

            /** @var Affilie $affilie */
            $affilie = Affilie::query()->whereKey($lockedPayout->affilie_id)->lockForUpdate()->firstOrFail();

            // Epsilon on every money comparison — TND carries three decimals and a float equality
            // test on 20.000 will eventually lose to 19.999999999999996.
            $payable = $this->payableBalance($affilie);
            if ($amount > $payable + 0.0001) {
                throw new \InvalidArgumentException(__('Montant supérieur au solde payable de l’affilié.'));
            }

            $signed = -$amount;
            $newBalance = round((float) ($affilie->current_balance ?? 0) + $signed, 3);

            AffilieTransaction::query()->create([
                'affilie_id' => $affilie->id,
                'affilie_code_id' => null,
                'commande_id' => null,
                'ticket_id' => null,
                'type' => AffilieTransactionType::Payment,
                'status' => AffilieTransactionStatus::Paid,
                'amount' => $signed,
                'balance_after' => $newBalance,
                'description' => __('Paiement affilié (lot du :date)', [
                    'date' => optional($lockedPayout->created_at)->format('d/m/Y') ?? '—',
                ]),
                'metadata' => array_filter([
                    'affilie_payout_id' => $lockedPayout->id,
                    'payment_reference' => $paymentReference,
                    'admin_note' => $adminNote,
                ]),
                'idempotency_key' => 'affilie-payout:'.$lockedPayout->id.':payment',
                'created_by' => Auth::id(),
            ]);

            $affilie->forceFill([
                'current_balance' => $newBalance,
                'total_paid' => round((float) ($affilie->total_paid ?? 0) + $amount, 3),
            ])->save();

            $lockedPayout->forceFill([
                'status' => AffiliePayoutStatus::Paid,
                'paid_at' => now(),
                'payment_reference' => $paymentReference ?? $lockedPayout->payment_reference,
                'admin_note' => $adminNote ?? $lockedPayout->admin_note,
            ])->save();

            Log::info('Affilie payout settled', [
                'affilie_payout_id' => $lockedPayout->id,
                'affilie_id' => $affilie->id,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'by' => Auth::id(),
            ]);
        });
    }
}
