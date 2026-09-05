<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\User;
use App\Models\UserPointTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Single source of truth for the loyalty points economy.
 *
 *   EARN_RATE            = 1  point earned per 1 DT of product spend before
 *                          loyalty redemption (floored; shipping excluded).
 *   REDEEM_POINTS_PER_DT = 20 points == 1 DT of discount.
 *   MAX_REDEEM_FRACTION  = 0.5 — points cover at most 50% of the
 *                          post-coupon, post-pack HT subtotal.
 *
 * Effective cashback is therefore 5%. Tune the three constants below to
 * change the whole economy in one place.
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
 */
class PointsService
{
    public const EARN_RATE = 1;

    public const REDEEM_POINTS_PER_DT = 20;

    public const MAX_REDEEM_FRACTION = 0.5;

    /** Order statuses (etat) that GRANT earned points — i.e. delivered/paid. */
    public const DELIVERED_STATUSES = ['livree', 'livrée', 'livre'];

    /** Order statuses that REVOKE earned points and REFUND redeemed ones. */
    public const CANCELLED_STATUSES = ['annuler', 'annulee', 'annulée', 'retour', 'retourner', 'retournee', 'retournée'];

    /**
     * Convert a whole number of points to its DT value (3 decimals).
     */
    public function pointsToDt(int $points): float
    {
        if ($points <= 0) {
            return 0.0;
        }

        return round($points / self::REDEEM_POINTS_PER_DT, 3);
    }

    /**
     * Points earned for a given net-paid HT amount (floored).
     */
    public function earnForSpend(float $netPaidHt): int
    {
        if ($netPaidHt <= 0) {
            return 0;
        }

        return (int) floor($netPaidHt * self::EARN_RATE);
    }

    /**
     * Product spend eligible for new points.
     *
     * Redeemed points are a payment instrument, not a commercial discount: a
     * customer spending an old reward still earns on the product price before
     * that reward. Coupon and pack savings remain excluded. The original goods
     * subtotal is a hard ceiling, so a malformed ledger can never inflate an
     * order's reward beyond the server-priced products.
     */
    public function earnableSpend(float $orderTotal, float $shipping, int $redeemedPoints, float $grossProducts): float
    {
        $paidGoods = max(0, $orderTotal - max(0, $shipping));
        $redeemedValue = $this->pointsToDt(abs(min(0, $redeemedPoints)));

        return round(min(max(0, $grossProducts), $paidGoods + $redeemedValue), 3);
    }

    /**
     * Maximum DT that points may cover for a given HT base (3 decimals).
     */
    public function maxRedeemableDt(float $baseHt): float
    {
        if ($baseHt <= 0) {
            return 0.0;
        }

        return round($baseHt * self::MAX_REDEEM_FRACTION, 3);
    }

    /**
     * PURE redemption math from an EXPLICIT balance. The caller is responsible
     * for reading that balance under a row lock (lockForUpdate) so the amount it
     * discounts and the amount it later consumes come from the SAME value —
     * otherwise two concurrent checkouts could double-spend. Capped by BOTH the
     * balance and maxRedeemableDt (50% of the HT base). Only whole points that
     * are actually converted are returned.
     *
     * @return array{0: int, 1: float}  [pointsConsumed, discountDt]
     */
    public function computeRedemption(int $balance, int $requestedPoints, float $baseHt): array
    {
        $balance = max(0, $balance);
        $requestedPoints = max(0, $requestedPoints);
        $usablePoints = min($requestedPoints, $balance);

        if ($usablePoints <= 0 || $baseHt <= 0) {
            return [0, 0.0];
        }

        // Cap by the 50% fraction, expressed in whole points.
        $maxDt = $this->maxRedeemableDt($baseHt);
        $maxPointsByCap = (int) floor($maxDt * self::REDEEM_POINTS_PER_DT);

        $pointsConsumed = min($usablePoints, $maxPointsByCap);
        if ($pointsConsumed <= 0) {
            return [0, 0.0];
        }

        $discountDt = $this->pointsToDt($pointsConsumed);
        // Guard against any float rounding pushing us past the cap.
        if ($discountDt > $maxDt) {
            $discountDt = $maxDt;
        }

        return [$pointsConsumed, $discountDt];
    }

    /**
     * Estimate-only convenience (reads the possibly-stale in-memory balance).
     * NEVER use this to decide a consumed amount — the checkout path locks the
     * user row and calls computeRedemption() with the locked balance.
     *
     * @return array{0: int, 1: float}  [pointsConsumed, discountDt]
     */
    public function redeem(User $user, int $requestedPoints, float $baseHt): array
    {
        return $this->computeRedemption((int) ($user->points_balance ?? 0), $requestedPoints, $baseHt);
    }

    /**
     * Loyalty lifecycle driven by order status. Called by CommandeObserver when
     * `etat` changes. Best-effort — any throw is caught by the observer so it can
     * never block an admin status change.
     *
     *   delivered            -> earn on products before loyalty redemption (once per order).
     *   cancelled / returned -> claw back any earned points AND refund any
     *                           redeemed points (a cancelled order must never
     *                           cost the customer points).
     *
     * Only a real User carries a balance; a guest (a Client id in user_id)
     * resolves to null via User::find and is skipped.
     */
    public function syncOnStatusChange(Commande $commande): void
    {
        $userId = $commande->user_id;
        if (empty($userId)) {
            return;
        }
        $user = User::find($userId);
        if (! $user) {
            return;
        }

        $etat = (string) $commande->etat;

        if (in_array($etat, self::DELIVERED_STATUSES, true)) {
            $redeemedPoints = (int) UserPointTransaction::where('commande_id', $commande->id)
                ->where('type', 'redeem')
                ->sum('points');
            $earnableSpend = $this->earnableSpend(
                (float) $commande->prix_ttc,
                (float) ($commande->frais_livraison ?? 0),
                $redeemedPoints,
                (float) $commande->prix_ht
            );
            // earn() dedupes per commande via the ledger, so re-saving a delivered
            // order will not credit the points twice.
            $this->earn(
                $user,
                $earnableSpend,
                (int) $commande->id,
                'Protinas gagnées (commande ' . ($commande->numero ?? $commande->id) . ' livrée)'
            );

            return;
        }

        if (in_array($etat, self::CANCELLED_STATUSES, true)) {
            $this->reverseForCommande($user, (int) $commande->id, (string) ($commande->numero ?? $commande->id));
        }
    }

    /**
     * Reverse the points side-effects of a cancelled/returned order (idempotent):
     * claw back earned points (negative adjustment) and refund redeemed points
     * (positive adjustment). Deduped by the sign of any existing adjustment row
     * already recorded for the commande.
     */
    private function reverseForCommande(User $user, int $commandeId, string $label): void
    {
        $earned = (int) UserPointTransaction::where('commande_id', $commandeId)->where('type', 'earn')->sum('points');
        $redeemed = (int) UserPointTransaction::where('commande_id', $commandeId)->where('type', 'redeem')->sum('points'); // <= 0

        $hasClawback = UserPointTransaction::where('commande_id', $commandeId)
            ->where('type', 'adjustment')->where('points', '<', 0)->exists();
        $hasRefund = UserPointTransaction::where('commande_id', $commandeId)
            ->where('type', 'adjustment')->where('points', '>', 0)->exists();

        if ($earned > 0 && ! $hasClawback) {
            $this->record(
                $user,
                'adjustment',
                -$earned,
                'Annulation des Protinas gagnées (commande ' . $label . ')',
                $commandeId,
                null,
                'order:'.$commandeId.':earn-reversal',
            );
        }
        if ($redeemed < 0 && ! $hasRefund) {
            // -redeemed is a POSITIVE refund of the points that had been spent.
            $this->record(
                $user,
                'adjustment',
                -$redeemed,
                'Remboursement des Protinas utilisées (commande ' . $label . ')',
                $commandeId,
                null,
                'order:'.$commandeId.':redeem-refund',
            );
        }
    }

    /**
     * Best-effort earning. NEVER throws — a points failure must not affect a
     * real order. Guards against double-counting per commande.
     */
    public function earn(User $user, float $netPaidHt, ?int $commandeId, ?string $description = null): void
    {
        try {
            $points = $this->earnForSpend($netPaidHt);
            if ($points <= 0) {
                return;
            }

            if ($commandeId !== null) {
                $already = UserPointTransaction::where('commande_id', $commandeId)
                    ->where('type', 'earn')
                    ->exists();
                if ($already) {
                    return;
                }
            }

            $this->record(
                $user,
                'earn',
                $points,
                $description ?? 'Protinas gagnées sur commande',
                $commandeId,
                null,
                $commandeId !== null ? 'order:'.$commandeId.':earn' : null,
            );
        } catch (\Throwable $e) {
            Log::error('PointsService.earn failed', [
                'user_id'     => $user->getKey(),
                'commande_id' => $commandeId,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    /**
     * Credit the flat reward for a published, human-written, purchase-backed review.
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
     * reversed turns "publish, get paid, delete" into a loop. Idempotent by the sign of any
     * existing adjustment already recorded against the review.
     */
    public function reverseForReview(User $user, int $reviewId): bool
    {
        try {
            if (! Schema::hasColumn('user_point_transactions', 'review_id')) {
                return false;
            }

            $earned = (int) UserPointTransaction::where('review_id', $reviewId)->where('type', 'earn')->sum('points');
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

            $tx = $this->record(
                $user,
                'adjustment',
                -$earned,
                'Annulation des Protinas d’avis (avis retiré)',
                null,
                $reviewId,
                'review:'.$reviewId.':reversal',
            );
            if (! $tx->wasRecentlyCreated) {
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('PointsService.reverseForReview failed', ['review_id' => $reviewId, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Atomically write a ledger row and update users.points_balance.
     *
     * Locks the user row (lockForUpdate) inside a transaction so concurrent
     * orders cannot race the balance. Works whether or not the caller already
     * opened a transaction (nested = savepoint). A redemption that exceeds the
     * locked balance is rejected instead of being silently clamped.
     */
    public function record(
        User $user,
        string $type,
        int $points,
        ?string $description = null,
        ?int $commandeId = null,
        ?int $reviewId = null,
        ?string $idempotencyKey = null,
    ): UserPointTransaction
    {
        return DB::transaction(function () use ($user, $type, $points, $description, $commandeId, $reviewId, $idempotencyKey) {
            $locked = User::whereKey($user->getKey())->lockForUpdate()->first();
            $current = (int) ($locked?->points_balance ?? 0);

            if ($idempotencyKey !== null && Schema::hasColumn('user_point_transactions', 'idempotency_key')) {
                $existing = UserPointTransaction::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();
                if ($existing) {
                    $user->points_balance = $current;

                    return $existing;
                }
            }

            if ($type === 'redeem' && $points >= 0) {
                throw new \InvalidArgumentException('A loyalty redemption must debit points.');
            }
            if ($type === 'redeem' && abs($points) > $current) {
                throw new \DomainException('Insufficient loyalty points balance.');
            }

            $newBalance = $current + $points;
            if ($newBalance < 0) {
                $newBalance = 0;
            }

            // Query-builder update — bypasses mass-assignment guarding.
            User::whereKey($user->getKey())->update(['points_balance' => $newBalance]);
            // Keep the in-memory model consistent for subsequent reads.
            $user->points_balance = $newBalance;

            $tx = new UserPointTransaction();
            $tx->user_id = $user->getKey();
            $tx->commande_id = $commandeId;
            if ($reviewId !== null && Schema::hasColumn('user_point_transactions', 'review_id')) {
                $tx->review_id = $reviewId;
            }
            if ($idempotencyKey !== null && Schema::hasColumn('user_point_transactions', 'idempotency_key')) {
                $tx->idempotency_key = $idempotencyKey;
            }
            $tx->type = $type;
            $tx->points = $points;
            $tx->balance_after = $newBalance;
            $tx->description = $description;
            $tx->save();

            return $tx;
        });
    }
}
