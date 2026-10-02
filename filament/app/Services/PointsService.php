<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\User;
use App\Models\UserPointTransaction;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Single source of truth for the loyalty points economy.
 *
 *   EARN_RATE and REDEEM_POINTS_PER_DT are compatibility aliases for default
 *   values; runtime rules come from config/loyalty.php.
 *
 * Earning uses goods actually paid, excluding shipping and redeemed points.
 *
 * ── PROTINAS v3: TWO WALLETS IN ONE BALANCE ──────────────────────────────────────────────────
 * users.points_balance stays the TOTAL the customer sees. Since v3 every ledger row carries a
 * `bucket`:
 *   earned  bought with cash already delivered (order earnings). Prepaid money: usable up to 100 %.
 *   gift    the shop's money (welcome gift, review rewards). Bounded by the hidden order budget,
 *           may expire (`expires_at`), consumed lot by lot through `remaining`.
 * users.gift_points_balance is the gift part of the total; users.points_debt is what a clawback
 * could not take back (never forgiven since v3: the next earnings repay it first).
 * Every new column is written only when it exists, so older test schemas keep working.
 *
 * ── AND SINCE 21/08/2026, REVIEWS PAY TOO ───────────────────────────────────────────────────
 * `awardForReview()` credits a flat number of points for a published review. That makes this class
 * the place where a REVIEW becomes MONEY, which changes what a fake review is worth: at 20 points
 * to the dinar, a bot that clears moderation is a printing press rather than a nuisance.
 *
 * So the award has two gates and both live outside this class, deliberately — this one does the
 * arithmetic and the ledger, and refuses to be the place where "should we pay?" is decided:
 *
 *   ReviewAuthenticity   was a human behind it, and was it bought? Both, or no points.
 *   the ledger itself    `review_id` dedupes, exactly as `commande_id` does for order points.
 *
 * ── ORDER LEDGER KEYS (all idempotent; ":v{n}" versions follow a reversal) ──────────────────
 *   order:{id}:redeem            earned Protinas spent at checkout
 *   order:{id}:redeem-gift       gift Protinas spent at checkout (expires_at = latest lot consumed)
 *   order:{id}:redeem-refund[-gift][:v{n}]   given back on cancel / refusal
 *   order:{id}:redeem[-gift]:v{n}            debited again when a refunded order is delivered
 *   order:{id}:earn[:v{n}] / order:{id}:earn-reversal[:v{n}]
 *   order:{id}:forfeit-refund[-gift][:v{n}]  the refusal deposit waived by staff (once per refusal)
 */
class PointsService
{
    public const EARN_RATE = 1;

    public const REDEEM_POINTS_PER_DT = 20;

    public const BUCKET_EARNED = 'earned';

    public const BUCKET_GIFT = 'gift';

    public static function earnRate(): int { return (int) config('loyalty.points.earn_per_dt', self::EARN_RATE); }

    public static function pointsPerDt(): int { return max(1, (int) config('loyalty.points.points_per_dt', self::REDEEM_POINTS_PER_DT)); }

    /** Order statuses (etat) that GRANT earned points — i.e. delivered/paid. */
    public const DELIVERED_STATUSES = ['livree', 'livrée', 'livre'];

    /** Order statuses that REVOKE earned points and REFUND redeemed ones. */
    public const CANCELLED_STATUSES = ['annuler', 'annulee', 'annulée', 'retour', 'retourner', 'retournee', 'retournée'];

    /**
     * Which v3 ledger columns exist (users + user_point_transactions). Read on every call: a
     * migration adds them while the process runs, and the tests build their own schemas.
     *
     * @return array{bucket: bool, expires_at: bool, remaining: bool, available_at: bool, key: bool, review: bool, gift: bool, debt: bool}
     */
    public static function ledgerColumns(): array
    {
        $upt = Schema::hasTable('user_point_transactions')
            ? array_map('strtolower', Schema::getColumnListing('user_point_transactions')) : [];
        $users = Schema::hasTable('users') ? array_map('strtolower', Schema::getColumnListing('users')) : [];

        return [
            'bucket' => in_array('bucket', $upt, true),
            'expires_at' => in_array('expires_at', $upt, true),
            'remaining' => in_array('remaining', $upt, true),
            'available_at' => in_array('available_at', $upt, true),
            'key' => in_array('idempotency_key', $upt, true),
            'review' => in_array('review_id', $upt, true),
            'gift' => in_array('gift_points_balance', $users, true),
            'debt' => in_array('points_debt', $users, true),
        ];
    }

    /**
     * Convert a whole number of points to its DT value (3 decimals).
     */
    public function pointsToDt(int $points): float
    {
        if ($points <= 0) {
            return 0.0;
        }

        return round($points / self::pointsPerDt(), 3);
    }

    /**
     * Points earned for a given net-paid HT amount (floored).
     */
    public function earnForSpend(float $netPaidHt): int
    {
        if ($netPaidHt <= 0) {
            return 0;
        }

        return (int) floor($netPaidHt * self::earnRate());
    }

    /**
     * Product spend eligible for new points (legacy formula, orders priced before v3).
     *
     * Only goods actually paid earn points. The original goods subtotal is a
     * hard ceiling, so malformed order amounts cannot inflate an award.
     */
    public function earnableSpend(float $orderTotal, float $shipping, float $grossProducts): float
    {
        $paidGoods = max(0, $orderTotal - max(0, $shipping));
        return round(min(max(0, $grossProducts), $paidGoods), 3);
    }

    /**
     * The earning base of one order: the base frozen at checkout (`earn_base_dt`, v3 — programme
     * goods paid in cash, machines and delivery excluded) or, for a legacy order, earnableSpend().
     *
     * The frozen base is capped at the PROGRAMME cash goods the order still collects: earnableSpend
     * of its current prix_ttc, minus the machines (isLoyaltyExcluded) still on its lines. At checkout
     * that cap equals the base, but a staff edit that removes a line lowers prix_ttc, and Protinas
     * must never be earned on goods nobody paid for — nor on a machine left alone on the order.
     */
    public function earnableSpendFor(Commande $commande): float
    {
        $attributes = $commande->getAttributes();
        if (array_key_exists('earn_base_dt', $attributes) && $attributes['earn_base_dt'] !== null) {
            $base = (float) $attributes['earn_base_dt'];
            if ($base <= 0) {
                return 0.0;
            }
            $money = array_key_exists('prix_ttc', $attributes) && array_key_exists('prix_ht', $attributes)
                && array_key_exists('frais_livraison', $attributes)
                ? $attributes
                : (array) (DB::table('commandes')->where('id', $commande->getKey())->first(['prix_ttc', 'frais_livraison', 'prix_ht']) ?? []);
            $cash = array_key_exists('prix_ttc', $money)
                ? $this->earnableSpend((float) $money['prix_ttc'], (float) ($money['frais_livraison'] ?? 0), (float) ($money['prix_ht'] ?? 0))
                : 0.0; // the order row is gone: nothing was paid
            if ($cash > 0) {
                $cash = max(0.0, $cash - $this->excludedGoodsOnOrder((int) $commande->getKey()));
            }

            return round(max(0, min($base, $cash)), 3);
        }

        return $this->earnableSpend(
            (float) $commande->prix_ttc,
            (float) ($commande->frais_livraison ?? 0),
            (float) $commande->prix_ht
        );
    }

    /**
     * The goods on the order's CURRENT lines that sit outside the programme (machines), in DT
     * (qte × prix_unitaire, as OrderCashOnDelivery::adminTotals sums them). Never throws: lines that
     * cannot be read count as none, which is the cap as it stood before machines were subtracted.
     */
    private function excludedGoodsOnOrder(int $commandeId): float
    {
        if ($commandeId <= 0 || array_filter((array) config('loyalty.program.excluded_subcategory_slugs', [])) === []) {
            return 0.0;
        }
        try {
            $mm = 0;
            $lines = CommandeDetail::query()->where('commande_id', $commandeId)
                ->with(['product:id,sous_categorie_id', 'product.sousCategorie:id,slug'])
                ->get(['id', 'commande_id', 'produit_id', 'qte', 'prix_unitaire']);
            foreach ($lines as $line) {
                if ($line->product !== null && $line->product->isLoyaltyExcluded()) {
                    $mm += (int) round(max(0, (int) $line->qte) * (int) round((float) $line->prix_unitaire * 1000), 0, PHP_ROUND_HALF_UP);
                }
            }

            return round($mm / 1000, 3);
        } catch (\Throwable $e) {
            Log::warning('Protinas: could not read the order lines for the earning cap', ['commande_id' => $commandeId, 'error' => $e->getMessage()]);

            return 0.0;
        }
    }

    /** The account that owns an order's points, or null (guest, admin-created order, missing user). */
    public function orderUser(Commande $commande): ?User
    {
        $userId = array_key_exists('authenticated_user_id', $commande->getAttributes())
            ? $commande->authenticated_user_id
            : (Schema::hasColumn('commandes', 'authenticated_user_id')
                ? Commande::whereKey($commande->id)->value('authenticated_user_id') : null);
        if ($userId !== null && (int) $userId === 0) {
            return null; // New guest orders use a Client id in user_id; never treat it as a User id.
        }
        $userId ??= $commande->user_id; // Legacy rows predate the explicit identity marker.
        if (empty($userId)) {
            return null;
        }

        return User::find($userId);
    }

    /**
     * Loyalty lifecycle driven by order status. Called by CommandeObserver when
     * `etat` changes. Best-effort — any throw is caught by the observer so it can
     * never block an admin status change.
     *
     *   delivered            -> debit again what a cancellation had refunded (every order: an order
     *                           delivered after a refund was otherwise free), then earn on the
     *                           products paid in cash (v3: held earn_hold_days for the return window).
     *   cancelled / returned -> refund the Protinas spent (v3 after dispatch: keep the refusal
     *                           deposit) and claw back what this order earned (debt if spent).
     *   cancelled → back in progress (« annuler » → « expidee »…) -> debit again what the cancel
     *                           refunded (debt if already spent), so a later refusal keeps its deposit.
     *
     * $previousEtat defaults to the model's original etat (the observer's `updated` event).
     *
     * Only a real User carries a balance; a guest (a Client id in user_id)
     * resolves to null via User::find and is skipped.
     */
    public function syncOnStatusChange(Commande $commande, ?string $previousEtat = null): void
    {
        // The status before this change: the observer's model still holds it as "original" during the
        // `updated` event. Read before the reload below, which only knows the new one.
        $previousEtat ??= $commande->getOriginal('etat') !== null ? (string) $commande->getOriginal('etat') : null;
        // Work on the full row. A table action (« Marquer comme livrée ») saves a model hydrated from a
        // narrow select(): without earn_base_dt, pricing_version or delivered_at it would earn on the
        // legacy formula (machines included) and misread dispatch and the deposit waiver. The columns
        // the caller's model does carry (its new etat first of all) win over the row just read.
        if ($commande->exists && $commande->getKey() !== null) {
            $row = Commande::query()->find($commande->getKey());
            if ($row !== null) {
                $row->setRawAttributes(array_merge($row->getAttributes(), $commande->getAttributes()), true);
                $commande = $row;
            }
        }

        $this->stampShipped($commande);

        $user = $this->orderUser($commande);
        if (! $user) {
            return;
        }

        $etat = (string) $commande->etat;
        $label = (string) ($commande->numero ?? $commande->id);

        // Back from a cancellation (« annuler » → « expidee » …): the Protinas refunded at the cancel
        // are debited again NOW, so a later refusal keeps its deposit on what was really spent and the
        // refund cannot be spent twice while the parcel travels. Delivery does the same below.
        if ($previousEtat !== null && in_array($previousEtat, self::CANCELLED_STATUSES, true)
            && ! in_array($etat, self::CANCELLED_STATUSES, true) && ! in_array($etat, self::DELIVERED_STATUSES, true)) {
            try {
                $this->redebitAfterRefund($user, $commande, $label);
            } catch (\Throwable $e) {
                Log::error('Protinas re-debit on reinstatement failed', ['commande_id' => $commande->id, 'error' => $e->getMessage()]);
            }

            return;
        }

        if (in_array($etat, self::DELIVERED_STATUSES, true)) {
            try {
                $this->redebitAfterRefund($user, $commande, $label);
            } catch (\Throwable $e) {
                Log::error('Protinas re-debit on delivery failed', ['commande_id' => $commande->id, 'error' => $e->getMessage()]);
            }

            $holdDays = max(0, (int) config('loyalty.points.earn_hold_days', 14));
            $availableAt = $commande->isPricedV3() && $holdDays > 0 ? now()->addDays($holdDays) : null;
            // earn() dedupes per commande via the ledger, so re-saving a delivered
            // order will not credit the points twice.
            $this->earn(
                $user,
                $this->earnableSpendFor($commande),
                (int) $commande->id,
                'Protinas gagnées (commande ' . $label . ' livrée)',
                $availableAt,
            );

            if (config('welcome_bonus.unlock_on_first_delivery', false)) {
                try {
                    app(WelcomeBonusService::class)->unlockOnDelivery($user, $commande);
                } catch (\Throwable $e) {
                    Log::error('Welcome bonus unlock failed', ['commande_id' => $commande->id, 'error' => $e->getMessage()]);
                }
            }

            return;
        }

        if (in_array($etat, self::CANCELLED_STATUSES, true)) {
            $this->reverseForCommande($user, $commande, $label, $previousEtat);
            try {
                app(WelcomeBonusService::class)->reverseUnlock($user, $commande);
            } catch (\Throwable $e) {
                Log::error('Welcome bonus reversal failed', ['commande_id' => $commande->id, 'error' => $e->getMessage()]);
            }
        }
    }

    /**
     * Stamp `commandes.shipped_at` the first time etat enters a shipping status (expidee, en cours de
     * livraison): the proof of dispatch of a parcel shipped by hand, which has no Aramex HAWB
     * (Commande::wasShippedForProtinas). $force stamps a refusal proven dispatched another way (the
     * status it left), so the repeat-refuser count, which re-reads past orders, sees it too.
     * Query-builder write: no model events. Never throws.
     */
    private function stampShipped(Commande $commande, bool $force = false): void
    {
        try {
            if ((! $force && ! in_array((string) $commande->etat, Commande::SHIPPING_STATES, true))
                || ! empty($commande->getAttributes()['shipped_at'] ?? null)
                || ! $commande->exists || ! Schema::hasColumn('commandes', 'shipped_at')) {
                return;
            }
            $now = now();
            Commande::query()->whereKey($commande->getKey())->whereNull('shipped_at')->toBase()->update(['shipped_at' => $now]);
            $commande->setAttribute('shipped_at', $now);
            $commande->syncOriginalAttribute('shipped_at');
        } catch (\Throwable $e) {
            Log::warning('Could not stamp shipped_at', ['commande_id' => $commande->id, 'error' => $e->getMessage()]);
        }
    }

    /**
     * What the ledger says about one order, per bucket. Debits are POSITIVE numbers here.
     *
     * @return array{earned: int, earn_reversed: int, original: array{earned: int, gift: int}, net: array{earned: int, gift: int}, gift_debit_expiry: ?CarbonInterface, gift_debit_never_expires: bool}
     */
    private function orderLedger(int $commandeId): array
    {
        $out = ['earned' => 0, 'earn_reversed' => 0, 'original' => ['earned' => 0, 'gift' => 0],
            'net' => ['earned' => 0, 'gift' => 0], 'gift_debit_expiry' => null, 'gift_debit_never_expires' => false];
        $prefix = 'order:'.$commandeId.':';
        foreach (UserPointTransaction::query()->where('commande_id', $commandeId)->orderBy('id')->get() as $row) {
            $attributes = $row->getAttributes();
            $key = (string) ($attributes['idempotency_key'] ?? '');
            $bucket = ($attributes['bucket'] ?? null) === self::BUCKET_GIFT ? self::BUCKET_GIFT : self::BUCKET_EARNED;
            $points = (int) $row->points;
            $type = (string) $row->type;

            if ($type === 'earn') {
                $out['earned'] += $points;
                continue;
            }
            if (str_starts_with($key, $prefix.'earn-reversal') || ($key === '' && $type === 'adjustment' && $points < 0)) {
                $out['earn_reversed'] += -$points;
                continue;
            }
            if ($type === 'redeem' || str_starts_with($key, $prefix.'redeem') || str_starts_with($key, $prefix.'forfeit-refund')
                || ($key === '' && $type === 'adjustment' && $points > 0)) {
                $out['net'][$bucket] += -$points;
                if ($type === 'redeem') {
                    $out['original'][$bucket] += -$points;
                }
                if ($bucket === self::BUCKET_GIFT && $points < 0) {
                    $expires = $attributes['expires_at'] ?? null;
                    if ($expires === null) {
                        // Only the checkout debit proves a never-expiring lot was spent; a re-debit
                        // that found no lot to consume says nothing about validity.
                        $out['gift_debit_never_expires'] = $out['gift_debit_never_expires'] || $type === 'redeem';
                    } else {
                        $at = Carbon::parse($expires);
                        if ($out['gift_debit_expiry'] === null || $at->gt($out['gift_debit_expiry'])) {
                            $out['gift_debit_expiry'] = $at;
                        }
                    }
                }
            }
        }

        return $out;
    }

    /** The next free key in a versioned family: base, then base:v1, base:v2… */
    private function nextKey(string $base): string
    {
        if (! Schema::hasColumn('user_point_transactions', 'idempotency_key')) {
            return $base;
        }
        $written = UserPointTransaction::query()
            ->where(fn ($q) => $q->where('idempotency_key', $base)->orWhere('idempotency_key', 'like', $base.':v%'))
            ->count();

        return $written === 0 ? $base : $base.':v'.$written;
    }

    /**
     * When gift Protinas come back: they keep their expiry, or get refund_grace_days from now when
     * that expiry is sooner. Null (never expires) stays null.
     */
    public static function refundGiftExpiry(?\DateTimeInterface $original): ?CarbonInterface
    {
        if ($original === null) {
            return null;
        }
        $grace = now()->addDays(max(0, (int) config('loyalty.gift.refund_grace_days', 7)));
        $original = Carbon::instance($original);

        return $original->gt($grace) ? $original : $grace;
    }

    private function refundExpiryFor(array $ledger): ?CarbonInterface
    {
        if ($ledger['gift_debit_never_expires']) {
            return null; // a grandfathered (never-expiring) gift comes back never-expiring
        }

        return $ledger['gift_debit_expiry'] !== null
            ? self::refundGiftExpiry($ledger['gift_debit_expiry'])
            : self::giftExpiry(); // validity unknown: a fresh gift validity
    }

    /**
     * Gift Protinas this order gave back (cancel refund, waived deposit) that then EXPIRED while the
     * order still stood refunded: the shop already took those back through protinas:expire, whose
     * `expiry:{lot id}` row carries no commande_id, so orderLedger() never sees it. Re-debiting
     * them on a delivery or a reinstatement would take the same gift twice — from earned Protinas,
     * or as debt (the review path, reverseForReview(), already subtracts its expiries the same way).
     *
     * Walked in ledger order: a refund lot adds to what is still owed back, a re-debit settles it,
     * and an expiry counts only up to what was still owed at that moment — an expiry after a
     * re-debit already settled the refund (the re-debit consumed another lot first) is the
     * customer's own gift running out, not this order's.
     */
    private function giftRefundExpired(int $commandeId): int
    {
        $cols = self::ledgerColumns();
        if (! $cols['bucket'] || ! $cols['key']) {
            return 0;
        }
        $rows = UserPointTransaction::query()->where('commande_id', $commandeId)
            ->where('bucket', self::BUCKET_GIFT)->where('type', '!=', 'redeem')
            ->get(['id', 'points']);
        $lotIds = $rows->filter(fn ($row) => (int) $row->points > 0)->pluck('id')->all();
        if ($lotIds === []) {
            return 0;
        }
        $events = [];
        foreach ($rows as $row) {
            $events[] = ['id' => (int) $row->id, 'expiry' => false, 'points' => (int) $row->points];
        }
        $expiries = UserPointTransaction::query()
            ->whereIn('idempotency_key', array_map(fn ($lotId) => 'expiry:'.$lotId, $lotIds))
            ->get(['id', 'points']);
        foreach ($expiries as $row) {
            $events[] = ['id' => (int) $row->id, 'expiry' => true, 'points' => (int) $row->points];
        }
        usort($events, fn (array $a, array $b): int => $a['id'] <=> $b['id']);

        $owed = 0;
        $expired = 0;
        foreach ($events as $event) {
            if ($event['expiry']) {
                $taken = min($owed, max(0, -$event['points']));
                $expired += $taken;
                $owed -= $taken;
            } elseif ($event['points'] > 0) {
                $owed += $event['points'];
            } else {
                $owed = max(0, $owed + $event['points']);
            }
        }

        return $expired;
    }

    /** Debit again what a cancellation refunded, once the order turns out to be delivered after all. */
    private function redebitAfterRefund(User $user, Commande $commande, string $label): void
    {
        DB::transaction(function () use ($user, $commande, $label): void {
            User::whereKey($user->getKey())->lockForUpdate()->first();
            $ledger = $this->orderLedger((int) $commande->id);
            $id = (int) $commande->id;
            foreach ([self::BUCKET_EARNED => 'order:'.$id.':redeem', self::BUCKET_GIFT => 'order:'.$id.':redeem-gift'] as $bucket => $base) {
                $missing = $ledger['original'][$bucket] - $ledger['net'][$bucket];
                if ($bucket === self::BUCKET_GIFT && $missing > 0) {
                    // Only here, never in orderLedger(): a later cancel must not refund the expired part again.
                    $missing -= $this->giftRefundExpired($id);
                }
                if ($missing <= 0) {
                    continue;
                }
                $this->record($user, 'adjustment', -$missing,
                    'Protinas réutilisées : commande '.$label.' finalement livrée', $id, null,
                    $this->nextKey($base), $bucket, null, null, true);
            }
            if (Schema::hasColumn('commandes', 'protinas_forfeited')) {
                // The order left the refused state (delivered, or back in progress): a new cycle,
                // whether or not anything had to be debited again. A deposit that kept every Protina
                // used (≤ 400) leaves nothing to re-debit, yet it is no deposit any more — those
                // Protinas paid for the order — so it must not stay waivable. A later refusal keeps a
                // fresh deposit; the waiver of the previous refusal does not carry over (a waiver
                // always lowers the net spent, so it is always followed by a re-debit above).
                $reset = ['protinas_forfeited' => 0];
                if (Schema::hasColumn('commandes', 'protinas_forfeit_waived')) {
                    $reset['protinas_forfeit_waived'] = false;
                }
                $current = (array) (DB::table('commandes')->where('id', $id)->first(array_keys($reset)) ?? []);
                $stale = (int) ($current['protinas_forfeited'] ?? 0) !== 0 || ! empty($current['protinas_forfeit_waived']);
                if ($stale) {
                    Commande::whereKey($id)->update($reset);
                }
                foreach ($reset as $column => $value) {
                    $commande->setAttribute($column, $value);
                }
            }
            if (Schema::hasColumn('commandes', 'refused_at')) {
                // No longer a refusal: rule 18 stops counting it (re-evaluated below).
                Commande::query()->whereKey($id)->whereNotNull('refused_at')->toBase()->update(['refused_at' => null]);
                $commande->setAttribute('refused_at', null);
            }
        });

        $this->reevaluateRefusalFreeze($user);
    }

    /**
     * Reverse the points side-effects of a cancelled / refused / returned order. Idempotent: it
     * brings the order's ledger to a target state, so running it twice writes nothing the second time.
     *
     *   legacy order (pricing_version NULL), not dispatched, or deposit waived
     *       → every Protinas spent comes back (gift with its expiry, or now + grace if sooner);
     *   v3 order refused after dispatch
     *       → the shop keeps min(forfeit_points, spent), earned first, then gift; the rest comes back;
     *         `protinas_forfeited` records what was kept (staff can waive it: waiveForfeit()).
     *   the order already earned → clawed back in full; a shortfall becomes points_debt.
     *   2+ dispatched v3 refusals in the window → gift frozen and every order needs a phone call.
     */
    public function reverseForCommande(User $user, Commande $commande, ?string $label = null, ?string $previousEtat = null): void
    {
        $label ??= (string) ($commande->numero ?? $commande->id);
        $id = (int) $commande->id;
        $isV3 = $commande->isPricedV3();
        // Shipped by hand counts (shipped_at, or a shipping status just before this one); an Aramex
        // shipment cancelled before pickup does not.
        $dispatched = $isV3 && $commande->wasShippedForProtinas($previousEtat);
        if ($dispatched) {
            $this->stampShipped($commande, true);
        }
        $waived = (bool) ($commande->getAttributes()['protinas_forfeit_waived'] ?? false);

        DB::transaction(function () use ($user, $commande, $label, $id, $isV3, $dispatched, $waived): void {
            User::whereKey($user->getKey())->lockForUpdate()->first();
            $ledger = $this->orderLedger($id);
            $netEarned = max(0, $ledger['net'][self::BUCKET_EARNED]);
            $netGift = max(0, $ledger['net'][self::BUCKET_GIFT]);

            $keepTotal = $isV3 && $dispatched && ! $waived
                ? min(max(0, (int) config('loyalty.refusal.forfeit_points', 400)), $netEarned + $netGift) : 0;
            $keepEarned = min($netEarned, $keepTotal);
            $keepGift = min($netGift, $keepTotal - $keepEarned);
            $refundEarned = $netEarned - $keepEarned;
            $refundGift = $netGift - $keepGift;

            if (! $isV3) {
                $sentence = 'Remboursement des Protinas utilisées (commande '.$label.')';
                $giftSentence = $sentence;
            } elseif ($keepTotal > 0) {
                $sentence = 'Commande '.$label.' refusée : '.$keepTotal.' Protinas retenues (transport aller-retour), '
                    .($refundEarned + $refundGift).' rendues';
                $giftSentence = $refundEarned > 0 ? 'Protinas cadeau rendues (commande '.$label.')' : $sentence;
            } else {
                $sentence = 'Commande '.$label.' annulée avant l’envoi : '.($refundEarned + $refundGift).' Protinas rendues';
                $giftSentence = $refundEarned > 0 ? 'Protinas cadeau rendues (commande '.$label.')' : $sentence;
            }

            if ($refundEarned > 0) {
                $this->record($user, 'adjustment', $refundEarned, $sentence, $id, null,
                    $this->nextKey('order:'.$id.':redeem-refund'), self::BUCKET_EARNED);
            }
            if ($refundGift > 0) {
                $this->record($user, 'adjustment', $refundGift, $giftSentence, $id, null,
                    $this->nextKey('order:'.$id.':redeem-refund-gift'), self::BUCKET_GIFT, $this->refundExpiryFor($ledger));
            }
            if ($isV3 && Schema::hasColumn('commandes', 'protinas_forfeited')) {
                Commande::whereKey($id)->update(['protinas_forfeited' => $keepEarned + $keepGift]);
                $commande->setAttribute('protinas_forfeited', $keepEarned + $keepGift);
            }

            $netEarn = $ledger['earned'] - $ledger['earn_reversed'];
            if ($netEarn > 0) {
                $this->record($user, 'adjustment', -$netEarn,
                    'Annulation des Protinas gagnées (commande ' . $label . ')', $id, null,
                    $this->nextKey('order:'.$id.':earn-reversal'), self::BUCKET_EARNED, null, null, true);
                if (Schema::hasColumn('user_point_transactions', 'available_at')) {
                    // The held earning is gone: it must stop counting as "en attente".
                    UserPointTransaction::query()->where('commande_id', $id)->where('type', 'earn')
                        ->where('available_at', '>', now())->update(['available_at' => now()]);
                }
            }
        });

        if ($dispatched) {
            $this->stampRefused($commande);
            $this->freezeRepeatRefuser($user);
        }
    }

    /**
     * Rule 18 dates a refusal by `commandes.refused_at`, written here once per refusal (cleared when
     * the order leaves the refused state) — never by updated_at, which any admin save, archive or
     * restore of an old refused order moves forward. Query-builder write: no model events, no
     * updated_at bump. Never throws.
     */
    private function stampRefused(Commande $commande): void
    {
        try {
            if (! $commande->exists || ! Schema::hasColumn('commandes', 'refused_at')) {
                return;
            }
            $now = now();
            $written = Commande::query()->whereKey($commande->getKey())->whereNull('refused_at')->toBase()->update(['refused_at' => $now]);
            if ($written > 0) {
                $commande->setAttribute('refused_at', $now);
                $commande->syncOriginalAttribute('refused_at');
            }
        } catch (\Throwable $e) {
            Log::warning('Could not stamp refused_at', ['commande_id' => $commande->id, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Rule 18's strikes, oldest first: when each dispatched v3 refusal of this customer happened,
     * for orders that still stand refused and whose deposit staff did not give back. $since keeps
     * only the refusals from then on.
     *
     * @return list<CarbonInterface>
     */
    private function refusalDates(User $user, ?CarbonInterface $since = null): array
    {
        // refused_at only exists with the v3 migration; before it, the last write is the best date known.
        $column = Schema::hasColumn('commandes', 'refused_at') ? 'refused_at' : 'updated_at';
        $query = Commande::query()
            ->where('authenticated_user_id', $user->getKey())
            ->whereNotNull('pricing_version')
            ->whereIn('etat', self::CANCELLED_STATUSES)
            ->whereNotNull($column);
        if ($since !== null) {
            $query->where($column, '>=', $since);
        }

        return $query->get()
            // A refusal staff forgave (« Rendre la retenue ») is not held against the customer.
            ->filter(fn (Commande $order): bool => empty($order->getAttributes()['protinas_forfeit_waived'] ?? null)
                && $order->wasShippedForProtinas())
            ->map(fn (Commande $order): CarbonInterface => Carbon::parse($order->getAttributes()[$column]))
            ->sortBy(fn (CarbonInterface $at): int => $at->getTimestamp())
            ->values()
            ->all();
    }

    /** Rule 18: 2 dispatched v3 refusals in the window → gift frozen and phone confirmation on every order. */
    private function freezeRepeatRefuser(User $user): void
    {
        try {
            if (! Schema::hasColumn('commandes', 'pricing_version') || ! Schema::hasColumn('users', 'gift_frozen_until')) {
                return;
            }
            $after = max(1, (int) config('loyalty.refusal.freeze_after', 2));
            $refusals = count($this->refusalDates($user,
                now()->subDays(max(1, (int) config('loyalty.refusal.window_days', 90)))));
            if ($refusals < $after) {
                return;
            }
            $until = now()->addDays(max(1, (int) config('loyalty.refusal.freeze_days', 90)));
            $update = ['gift_frozen_until' => $until];
            if (Schema::hasColumn('users', 'cod_confirm_until')) {
                $update['cod_confirm_until'] = $until;
            }
            User::whereKey($user->getKey())->update($update);
            Log::warning('Protinas: repeat refuser, gift frozen', ['user_id' => $user->getKey(), 'refusals' => $refusals]);
        } catch (\Throwable $e) {
            Log::error('Protinas refusal freeze check failed', ['user_id' => $user->getKey(), 'error' => $e->getMessage()]);
        }
    }

    /**
     * Rule 18 once a strike is withdrawn — its deposit waived by staff, or the « refusal » delivered
     * or put back in progress after all. The freeze is cut back to what the strikes still counted
     * imply (the latest moment freeze_after of them fell inside the window, plus freeze_days), or
     * lifted when none does. Never lengthened: only freezeRepeatRefuser() starts a freeze. Never throws.
     */
    private function reevaluateRefusalFreeze(User $user): void
    {
        try {
            if (! Schema::hasColumn('commandes', 'pricing_version') || ! Schema::hasColumn('users', 'gift_frozen_until')) {
                return;
            }
            $hasCod = Schema::hasColumn('users', 'cod_confirm_until');
            $row = DB::table('users')->where('id', $user->getKey())
                ->first($hasCod ? ['gift_frozen_until', 'cod_confirm_until'] : ['gift_frozen_until']);
            $frozen = ! empty($row?->gift_frozen_until) ? Carbon::parse($row->gift_frozen_until) : null;
            if ($frozen === null || $frozen->lte(now())) {
                return;
            }
            $after = max(1, (int) config('loyalty.refusal.freeze_after', 2));
            $window = max(1, (int) config('loyalty.refusal.window_days', 90));
            $freezeDays = max(1, (int) config('loyalty.refusal.freeze_days', 90));
            $dates = $this->refusalDates($user);
            $implied = null;
            for ($i = $after - 1; $i < count($dates); $i++) {
                if ($dates[$i - $after + 1]->gte($dates[$i]->copy()->subDays($window))) {
                    $implied = $dates[$i]->copy()->addDays($freezeDays);
                }
            }
            if ($implied !== null && $implied->gte($frozen)) {
                return; // the strikes that remain still justify the whole freeze
            }
            $until = $implied !== null && $implied->gt(now()) ? $implied : null;
            $update = ['gift_frozen_until' => $until];
            if ($hasCod) {
                $cod = ! empty($row->cod_confirm_until) ? Carbon::parse($row->cod_confirm_until) : null;
                if ($cod !== null && ($until === null || $cod->gt($until))) {
                    $update['cod_confirm_until'] = $until;
                }
            }
            User::whereKey($user->getKey())->update($update);
            foreach ($update as $column => $value) {
                $user->setAttribute($column, $value);
            }
            Log::info('Protinas: repeat-refuser freeze re-evaluated', ['user_id' => $user->getKey(),
                'until' => $until?->toIso8601String()]);
        } catch (\Throwable $e) {
            Log::error('Protinas refusal freeze re-evaluation failed', ['user_id' => $user->getKey(), 'error' => $e->getMessage()]);
        }
    }

    /**
     * Staff action « Rendre la retenue Protinas »: give back the refusal deposit of a v3 order.
     * Once per refusal (protinas_forfeit_waived; versioned keys order:{id}:forfeit-refund[-gift][:v{n}]).
     * A delivery after the waiver re-debits the order and clears the flag, so a later refusal keeps
     * its deposit again and may be waived again.
     *
     * @return int Protinas given back (0 when there is nothing to waive)
     */
    public function waiveForfeit(Commande $commande): int
    {
        if (! $commande->isPricedV3() || ! Schema::hasColumn('commandes', 'protinas_forfeit_waived')) {
            return 0;
        }
        $user = $this->orderUser($commande);
        if (! $user) {
            return 0;
        }
        $id = (int) $commande->id;
        $label = (string) ($commande->numero ?? $commande->id);

        $refunded = DB::transaction(function () use ($user, $id, $label): int {
            User::whereKey($user->getKey())->lockForUpdate()->first();
            $row = Commande::query()->whereKey($id)->lockForUpdate()->first(['id', 'etat', 'protinas_forfeited', 'protinas_forfeit_waived']);
            // Only while the order stands refused / returned: once it is delivered or back in
            // progress, the deposit was cleared and the Protinas it held were spent on the order.
            if (! $row || ! in_array((string) $row->etat, self::CANCELLED_STATUSES, true)
                || $row->protinas_forfeit_waived || (int) $row->protinas_forfeited <= 0) {
                return 0;
            }
            $forfeited = (int) $row->protinas_forfeited;
            $ledger = $this->orderLedger($id);
            $keepEarned = min(max(0, $ledger['net'][self::BUCKET_EARNED]), $forfeited);
            $keepGift = min(max(0, $ledger['net'][self::BUCKET_GIFT]), $forfeited - $keepEarned);
            $description = 'Retenue Protinas rendue (commande '.$label.')';
            // Versioned: an order delivered again after a waiver starts a new cycle (redebitAfterRefund
            // clears the flag), and its next waiver must write a new row, not find the old one.
            if ($keepEarned > 0) {
                $this->record($user, 'adjustment', $keepEarned, $description, $id, null,
                    $this->nextKey('order:'.$id.':forfeit-refund'), self::BUCKET_EARNED);
            }
            if ($keepGift > 0) {
                $this->record($user, 'adjustment', $keepGift, $description, $id, null,
                    $this->nextKey('order:'.$id.':forfeit-refund-gift'), self::BUCKET_GIFT, $this->refundExpiryFor($ledger));
            }
            Commande::whereKey($id)->update(['protinas_forfeit_waived' => true]);

            return $keepEarned + $keepGift;
        });
        if ($refunded > 0) {
            $commande->setAttribute('protinas_forfeit_waived', true);
        }
        // A forgiven refusal is no strike (refusalDates()): a freeze it caused is lifted or shortened.
        $this->reevaluateRefusalFreeze($user);

        return $refunded;
    }

    /**
     * Debit the Protinas a checkout spent: one row per bucket, under the caller's transaction.
     * Gift rows consume the soonest-expiring gift lots first (FIFO) and store the latest expiry
     * consumed, so a refund can give the same validity back.
     *
     * @return array{earned: ?UserPointTransaction, gift: ?UserPointTransaction}
     */
    public function redeemForOrder(User $user, int $commandeId, string $numero, int $earnedPoints, int $giftPoints, int $shippingPoints = 0): array
    {
        $suffix = $shippingPoints > 0 ? ' (dont '.$shippingPoints.' pour la livraison)' : '';
        $rows = ['earned' => null, 'gift' => null];
        if ($giftPoints > 0) {
            $rows['gift'] = $this->record($user, 'redeem', -$giftPoints,
                'Protinas cadeau utilisées sur commande '.$numero.($earnedPoints > 0 ? '' : $suffix), $commandeId, null,
                'order:'.$commandeId.':redeem-gift', self::BUCKET_GIFT);
        }
        if ($earnedPoints > 0) {
            $rows['earned'] = $this->record($user, 'redeem', -$earnedPoints,
                'Protinas utilisées sur commande '.$numero.$suffix, $commandeId, null,
                'order:'.$commandeId.':redeem', self::BUCKET_EARNED);
        }

        return $rows;
    }

    /**
     * v2 path (rollback): the old engine only knows the total. Split a spend gift-first under the
     * CALLER's lock so the per-bucket rows never exceed a bucket. Without the gift column: all earned.
     *
     * @return array{0: int, 1: int} [earnedPoints, giftPoints]
     */
    public function splitLegacySpend(User $lockedUser, int $points): array
    {
        $points = max(0, $points);
        if (! Schema::hasColumn('users', 'gift_points_balance')) {
            return [$points, 0];
        }
        $balance = (int) ($lockedUser->points_balance ?? 0);
        $gift = max(0, min($balance, (int) ($lockedUser->gift_points_balance ?? 0)));
        $fromGift = min($gift, $points);

        return [$points - $fromGift, $fromGift];
    }

    /**
     * Best-effort earning. NEVER throws — a points failure must not affect a
     * real order. Guards against double-counting per commande: an order earns again only after its
     * earning was reversed (returned, then delivered after all).
     */
    public function earn(User $user, float $netPaidHt, ?int $commandeId, ?string $description = null, ?\DateTimeInterface $availableAt = null): void
    {
        try {
            $points = $this->earnForSpend($netPaidHt);
            if ($points <= 0) {
                return;
            }

            $key = null;
            if ($commandeId !== null) {
                $earnRows = UserPointTransaction::where('commande_id', $commandeId)->where('type', 'earn')->count();
                if ($earnRows > 0) {
                    $ledger = $this->orderLedger($commandeId);
                    if ($ledger['earned'] - $ledger['earn_reversed'] > 0) {
                        return; // already earned and not reversed
                    }
                }
                $key = $this->nextKey('order:'.$commandeId.':earn');
            }

            $this->record(
                $user,
                'earn',
                $points,
                $description ?? 'Protinas gagnées sur commande',
                $commandeId,
                null,
                $key,
                self::BUCKET_EARNED,
                null,
                $availableAt,
            );
        } catch (\Throwable $e) {
            Log::error('PointsService.earn failed', [
                'user_id'     => $user->getKey(),
                'commande_id' => $commandeId,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    /** Expiry of a gift credited now (loyalty.gift.valid_days; 0 = never; v2 rollback = never). */
    public static function giftExpiry(): ?CarbonInterface
    {
        $days = (int) config('loyalty.gift.valid_days', 60);
        if ($days <= 0 || (int) config('loyalty.rules_version', 3) < 3) {
            return null;
        }

        return now()->addDays($days);
    }

    /**
     * Credit the flat reward for a published, human-written, purchase-backed review.
     * Since v3 it is GIFT Protinas (the shop's money, bounded by the order budget), valid
     * loyalty.gift.valid_days.
     *
     * ── EVERY GUARD HERE IS LOAD-BEARING, SO NONE OF THEM IS AN `if` WITH NO COMMENT ─────────
     *   $points <= 0        the reward is configurable and 0 is a legitimate value meaning "off".
     *   the ledger check    `review_id` already credited = this ran twice. It runs from an
     *                       observer that fires on `saved`, so it WILL run again the next time
     *                       anybody touches the row in Filament.
     *   never throws        a points failure must never affect a review, exactly as with earn().
     *
     * The dedupe is on the LEDGER, not on `reviews.points_awarded`. The flag is a cache for
     * humans reading the table; the ledger is the money, and money is what must not double.
     */
    public function awardForReview(User $user, int $reviewId, ?string $productLabel = null, ?int $award = null): bool
    {
        $points = $award ?? (int) config('reviews.points.award', 0);
        if ($points <= 0 || $reviewId <= 0) {
            return false;
        }

        try {
            if (! Schema::hasColumn('user_point_transactions', 'review_id')) {
                // The migration has not run yet. Crediting without the dedupe column would mean
                // paying again on every save, which is the one failure worth refusing outright.
                return false;
            }

            $label = $productLabel ? (' — ' . Str::limit($productLabel, 60)) : '';

            // The idempotency key is checked while the user row is locked and is also protected
            // by a UNIQUE database index. Two moderation workers can therefore race safely: one
            // creates the credit, the other receives the existing row without moving the balance.
            $tx = $this->record(
                $user,
                'earn',
                $points,
                'Protinas pour votre avis' . $label,
                null,
                $reviewId,
                'review:'.$reviewId.':award',
                self::BUCKET_GIFT,
                self::giftExpiry(),
            );
            if (! $tx->wasRecentlyCreated) {
                return false;
            }

            Log::info('Points awarded for review', [
                'user_id'   => $user->getKey(),
                'review_id' => $reviewId,
                'points'    => $points,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('PointsService.awardForReview failed', [
                'user_id'   => $user->getKey(),
                'review_id' => $reviewId,
                'error'     => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Take back the points paid for a review that has since been unpublished or deleted.
     *
     * The mirror of `reverseForCommande`, and needed for the same reason: an award that cannot be
     * reversed turns "publish, get paid, delete" into a loop. Taken from the gift wallet first,
     * then from earned Protinas, then as debt — minus whatever of the award already expired (the shop
     * got that back once). Idempotent by the sign of any existing adjustment already recorded
     * against the review.
     */
    public function reverseForReview(User $user, int $reviewId): bool
    {
        try {
            if (! Schema::hasColumn('user_point_transactions', 'review_id')) {
                return false;
            }

            return DB::transaction(function () use ($user, $reviewId): bool {
                $locked = User::whereKey($user->getKey())->lockForUpdate()->first();
                $awards = UserPointTransaction::where('review_id', $reviewId)->where('type', 'earn')->get(['id', 'points']);
                $earned = (int) $awards->sum('points');
                if ($earned <= 0) {
                    return false;
                }

                $clawed = UserPointTransaction::where('review_id', $reviewId)
                    ->where('type', 'adjustment')
                    ->where('points', '<', 0)
                    ->exists();
                if ($clawed) {
                    return false;
                }

                // What already went back to the shop by expiry (protinas:expire writes expiry:{lot id},
                // with no review_id) is not taken a second time: only the part the customer still
                // holds or spent is owed.
                $expired = Schema::hasColumn('user_point_transactions', 'idempotency_key')
                    ? max(0, -(int) UserPointTransaction::query()
                        ->whereIn('idempotency_key', $awards->map(fn ($award) => 'expiry:'.$award->id)->all())
                        ->sum('points'))
                    : 0;
                $owed = max(0, $earned - $expired);
                if ($owed <= 0) {
                    return false;
                }

                $gift = Schema::hasColumn('users', 'gift_points_balance')
                    ? max(0, (int) ($locked?->gift_points_balance ?? 0)) : 0;
                $fromGift = min($gift, $owed);
                $rest = $owed - $fromGift;
                $written = false;
                if ($fromGift > 0) {
                    $tx = $this->record($user, 'adjustment', -$fromGift, 'Annulation des Protinas d’avis (avis retiré)',
                        null, $reviewId, 'review:'.$reviewId.':reversal', self::BUCKET_GIFT);
                    $written = $tx->wasRecentlyCreated;
                }
                if ($rest > 0) {
                    $tx = $this->record($user, 'adjustment', -$rest, 'Annulation des Protinas d’avis (avis retiré)',
                        null, $reviewId, 'review:'.$reviewId.($fromGift > 0 ? ':reversal-earned' : ':reversal'),
                        self::BUCKET_EARNED, null, null, true);
                    $written = $written || $tx->wasRecentlyCreated;
                }

                return $written;
            });
        } catch (\Throwable $e) {
            Log::error('PointsService.reverseForReview failed', ['review_id' => $reviewId, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Atomically write a ledger row and update users.points_balance (and, since v3, the gift
     * balance, the debt and the gift lots).
     *
     * Locks the user row (lockForUpdate) inside a transaction so concurrent
     * orders cannot race the balance. Works whether or not the caller already
     * opened a transaction (nested = savepoint). A redemption that exceeds the
     * locked balance of its bucket is rejected instead of being silently clamped.
     *
     *   credit, earned  repays points_debt first, then raises the balance; with $availableAt the
     *                   row is "en attente" until then (`remaining` = what reached the balance).
     *   credit, gift    a new gift lot (`remaining` = points, `expires_at`).
     *   debit, gift     consumes gift lots soonest-expiry first (type `expiry`: expired lots first);
     *                   the row stores the latest expiry consumed.
     *   debit, earned   takes the earned part of the balance; a shortfall becomes points_debt when
     *                   $allowDebt, otherwise (legacy) the gift absorbs it and the rest is forgiven.
     */
    public function record(
        User $user,
        string $type,
        int $points,
        ?string $description = null,
        ?int $commandeId = null,
        ?int $reviewId = null,
        ?string $idempotencyKey = null,
        string $bucket = self::BUCKET_EARNED,
        ?\DateTimeInterface $expiresAt = null,
        ?\DateTimeInterface $availableAt = null,
        bool $allowDebt = false,
    ): UserPointTransaction
    {
        $bucket = $bucket === self::BUCKET_GIFT ? self::BUCKET_GIFT : self::BUCKET_EARNED;

        return DB::transaction(function () use ($user, $type, $points, $description, $commandeId, $reviewId, $idempotencyKey, $bucket, $expiresAt, $availableAt, $allowDebt) {
            $locked = User::whereKey($user->getKey())->lockForUpdate()->first();
            $current = (int) ($locked?->points_balance ?? 0);
            $cols = self::ledgerColumns();

            if ($idempotencyKey !== null && $cols['key']) {
                $existing = UserPointTransaction::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();
                if ($existing) {
                    $user->points_balance = $current;

                    return $existing;
                }
            }

            $gift = $cols['gift'] ? max(0, min($current, (int) ($locked?->gift_points_balance ?? 0))) : 0;
            $debt = $cols['debt'] ? max(0, (int) ($locked?->points_debt ?? 0)) : 0;

            if ($type === 'redeem' && $points >= 0) {
                throw new \InvalidArgumentException('A loyalty redemption must debit points.');
            }
            if ($type === 'redeem') {
                $available = ! $cols['gift'] ? $current : ($bucket === self::BUCKET_GIFT ? $gift : $current - $gift);
                if (abs($points) > $available) {
                    throw new \DomainException('Insufficient loyalty points balance.');
                }
            }

            $balance = $current;
            $newGift = $gift;
            $newDebt = $debt;
            $remaining = null;
            $rowExpires = null;
            $rowAvailable = null;
            $lots = $cols['bucket'] && $cols['remaining'];

            if ($points > 0) {
                if ($bucket === self::BUCKET_GIFT) {
                    $balance += $points;
                    $newGift += $points;
                    $remaining = $points;
                    $rowExpires = $expiresAt;
                } else {
                    $repay = min($newDebt, $points);
                    $newDebt -= $repay;
                    $credited = $points - $repay;
                    $balance += $credited;
                    if ($availableAt !== null) {
                        $rowAvailable = $availableAt;
                        $remaining = $credited;
                    }
                }
            } elseif ($points < 0) {
                $amount = -$points;
                $fromGift = $bucket === self::BUCKET_GIFT && $cols['gift'] ? min($newGift, $amount) : 0;
                $newGift -= $fromGift;
                $balance -= $fromGift;
                $earnedPart = $amount - $fromGift;
                if ($earnedPart > 0) {
                    $take = min(max(0, $balance - $newGift), $earnedPart);
                    $balance -= $take;
                    $short = $earnedPart - $take;
                    if ($short > 0 && $allowDebt && $cols['debt']) {
                        $newDebt += $short;
                    } elseif ($short > 0) {
                        // Legacy floor: what is left (the gift) absorbs it, the rest is forgiven.
                        $absorbed = min($newGift, $short);
                        $newGift -= $absorbed;
                        $balance -= $absorbed;
                        $fromGift += $absorbed;
                    }
                }
                if ($fromGift > 0 && $lots) {
                    $rowExpires = $this->consumeGiftLots((int) $user->getKey(), $fromGift, $type === 'expiry');
                }
            }
            $balance = max(0, $balance);

            // Query-builder update — bypasses mass-assignment guarding.
            $update = ['points_balance' => $balance];
            if ($cols['gift']) {
                $update['gift_points_balance'] = max(0, min($balance, $newGift));
            }
            if ($cols['debt']) {
                $update['points_debt'] = max(0, $newDebt);
            }
            User::whereKey($user->getKey())->update($update);
            // Keep the in-memory model consistent for subsequent reads.
            foreach ($update as $column => $value) {
                $user->setAttribute($column, $value);
            }

            $tx = new UserPointTransaction();
            $tx->user_id = $user->getKey();
            $tx->commande_id = $commandeId;
            if ($reviewId !== null && $cols['review']) {
                $tx->review_id = $reviewId;
            }
            if ($idempotencyKey !== null && $cols['key']) {
                $tx->idempotency_key = $idempotencyKey;
            }
            if ($cols['bucket']) {
                $tx->bucket = $bucket;
            }
            if ($cols['expires_at'] && $rowExpires !== null) {
                $tx->expires_at = $rowExpires;
            }
            if ($cols['remaining'] && $remaining !== null) {
                $tx->remaining = $remaining;
            }
            if ($cols['available_at'] && $rowAvailable !== null) {
                $tx->available_at = $rowAvailable;
            }
            $tx->type = $type;
            $tx->points = $points;
            $tx->balance_after = $balance;
            $tx->description = $description;
            $tx->save();

            return $tx;
        });
    }

    /**
     * Take $amount from the user's gift lots (rows with remaining > 0). Normal spending takes the
     * unexpired lots first, soonest expiry first, never-expiring last; an `expiry` takes the expired
     * lots first. Returns the latest expiry consumed, or null when a never-expiring lot was touched.
     * Called inside record()'s transaction, user row locked.
     */
    private function consumeGiftLots(int $userId, int $amount, bool $expiredFirst): ?CarbonInterface
    {
        $now = now();
        $lots = UserPointTransaction::query()
            ->where('user_id', $userId)->where('bucket', self::BUCKET_GIFT)->where('remaining', '>', 0)
            ->lockForUpdate()->get(['id', 'remaining', 'expires_at']);
        $sorted = $lots->sort(function ($a, $b) use ($now, $expiredFirst): int {
            $aExpired = $a->expires_at !== null && Carbon::parse($a->expires_at)->lte($now);
            $bExpired = $b->expires_at !== null && Carbon::parse($b->expires_at)->lte($now);
            if ($aExpired !== $bExpired) {
                return ($expiredFirst ? $bExpired <=> $aExpired : $aExpired <=> $bExpired);
            }
            if (($a->expires_at === null) !== ($b->expires_at === null)) {
                return $a->expires_at === null ? 1 : -1; // never-expiring last
            }
            $byDate = $a->expires_at === null ? 0 : Carbon::parse($a->expires_at)->getTimestamp() <=> Carbon::parse($b->expires_at)->getTimestamp();

            return $byDate !== 0 ? $byDate : ((int) $a->id <=> (int) $b->id);
        });

        $left = $amount;
        $latest = null;
        $neverExpires = false;
        foreach ($sorted as $lot) {
            if ($left <= 0) {
                break;
            }
            $take = min((int) $lot->remaining, $left);
            UserPointTransaction::whereKey($lot->id)->update(['remaining' => (int) $lot->remaining - $take]);
            $left -= $take;
            if ($lot->expires_at === null) {
                $neverExpires = true;
            } else {
                $at = Carbon::parse($lot->expires_at);
                $latest = $latest === null || $at->gt($latest) ? $at : $latest;
            }
        }

        return $neverExpires ? null : $latest;
    }
}
