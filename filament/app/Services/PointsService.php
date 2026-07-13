<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\User;
use App\Models\UserPointTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Single source of truth for the loyalty points economy.
 *
 *   EARN_RATE            = 1  point earned per 1 DT of net-paid HT (floored).
 *   REDEEM_POINTS_PER_DT = 20 points == 1 DT of discount.
 *   MAX_REDEEM_FRACTION  = 0.5 — points cover at most 50% of the
 *                          post-coupon, post-pack HT subtotal.
 *
 * Effective cashback is therefore 5%. Tune the three constants below to
 * change the whole economy in one place.
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
     *   delivered            -> earn points on the net-paid HT (once per order).
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
            $netPaidHt = max(0, (float) $commande->prix_ttc - (float) ($commande->frais_livraison ?? 0));
            // earn() dedupes per commande via the ledger, so re-saving a delivered
            // order will not credit the points twice.
            $this->earn(
                $user,
                $netPaidHt,
                (int) $commande->id,
                'Points gagnés (commande ' . ($commande->numero ?? $commande->id) . ' livrée)'
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
            $this->record($user, 'adjustment', -$earned, 'Annulation des points gagnés (commande ' . $label . ')', $commandeId);
        }
        if ($redeemed < 0 && ! $hasRefund) {
            // -redeemed is a POSITIVE refund of the points that had been spent.
            $this->record($user, 'adjustment', -$redeemed, 'Remboursement des points utilisés (commande ' . $label . ')', $commandeId);
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

            $this->record($user, 'earn', $points, $description ?? 'Points gagnés sur commande', $commandeId);
        } catch (\Throwable $e) {
            Log::error('PointsService.earn failed', [
                'user_id'     => $user->getKey(),
                'commande_id' => $commandeId,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    /**
     * Atomically write a ledger row and update users.points_balance.
     *
     * Locks the user row (lockForUpdate) inside a transaction so concurrent
     * orders cannot race the balance. Works whether or not the caller already
     * opened a transaction (nested = savepoint). Balance never goes negative.
     */
    public function record(User $user, string $type, int $points, ?string $description = null, ?int $commandeId = null): UserPointTransaction
    {
        return DB::transaction(function () use ($user, $type, $points, $description, $commandeId) {
            $locked = User::whereKey($user->getKey())->lockForUpdate()->first();
            $current = (int) ($locked?->points_balance ?? 0);

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
            $tx->type = $type;
            $tx->points = $points;
            $tx->balance_after = $newBalance;
            $tx->description = $description;
            $tx->save();

            return $tx;
        });
    }
}
