<?php

namespace App\Services;

use App\Enums\LoyaltyCardStatus;
use App\Enums\LoyaltyTransactionType;
use App\Models\Client;
use App\Models\Commande;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyPointTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoyaltyService
{
    // ── Card management ──────────────────────────────────

    /**
     * Get or create loyalty card for a client.
     */
    public function getOrCreateCard(Client $client): LoyaltyCard
    {
        $card = LoyaltyCard::where('client_id', $client->id)->first();
        if ($card) {
            return $card;
        }

        return LoyaltyCard::create([
            'client_id'   => $client->id,
            'card_number' => LoyaltyCard::generateCardNumber(),
            'qr_token'    => LoyaltyCard::generateQrToken(),
            'status'      => LoyaltyCardStatus::Active->value,
            'issued_at'   => now(),
        ]);
    }

    // ── Points balance ───────────────────────────────────

    public function getBalance(int $clientId): int
    {
        return (int) LoyaltyPointTransaction::where('client_id', $clientId)->sum('points');
    }

    public function getMonetaryValue(int $clientId): float
    {
        $points  = $this->getBalance($clientId);
        $rate    = (int) config('loyalty.points_per_dt', 10);

        return $rate > 0 ? round($points / $rate, 3) : 0;
    }

    // ── Points earning ───────────────────────────────────

    /**
     * Earn points for a completed/delivered order.
     * Idempotent: one earn transaction per order.
     */
    public function earnPointsForOrder(Commande $commande): ?LoyaltyPointTransaction
    {
        $clientId = $commande->client_id ?? $commande->user_id;
        if (! $clientId) {
            return null;
        }

        // Idempotency
        $existing = LoyaltyPointTransaction::where('order_id', $commande->id)
            ->where('type', LoyaltyTransactionType::Earn->value)
            ->first();

        if ($existing) {
            Log::info('LoyaltyService: earn already exists', ['order_id' => $commande->id]);
            return $existing;
        }

        $client = Client::find($clientId);
        if (! $client) {
            return null;
        }

        // Ensure card exists
        $this->getOrCreateCard($client);

        return DB::transaction(function () use ($commande, $clientId) {
            $base   = $this->computeEarnBase($commande);
            $ppCur  = (int) config('loyalty.points_per_currency', 1);
            $points = (int) floor($base * $ppCur);

            if ($points <= 0) {
                return null;
            }

            $tx = LoyaltyPointTransaction::create([
                'client_id'     => $clientId,
                'order_id'      => $commande->id,
                'type'          => LoyaltyTransactionType::Earn->value,
                'points'        => $points,
                'monetary_value'=> round($points / config('loyalty.points_per_dt', 10), 3),
                'description'   => 'Points gagnés — commande #' . $commande->numero,
                'metadata'      => [
                    'earn_base'           => $base,
                    'points_per_currency' => $ppCur,
                    'order_number'        => $commande->numero,
                ],
            ]);

            // Update commande snapshot
            $commande->update(['loyalty_points_earned' => $points]);

            Log::info('LoyaltyService: points earned', [
                'tx_id'     => $tx->id,
                'client_id' => $clientId,
                'order_id'  => $commande->id,
                'points'    => $points,
            ]);

            return $tx;
        });
    }

    /**
     * Record the loyalty redemption transaction when an order with redeemed points is confirmed.
     * Idempotent: one redeem transaction per order.
     */
    public function recordRedemptionForOrder(Commande $commande): ?LoyaltyPointTransaction
    {
        if (! $commande->loyalty_points_redeemed) {
            return null;
        }

        $clientId = $commande->client_id ?? $commande->user_id;
        if (! $clientId) {
            return null;
        }

        // Idempotency
        $existing = LoyaltyPointTransaction::where('order_id', $commande->id)
            ->where('type', LoyaltyTransactionType::Redeem->value)
            ->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($commande, $clientId) {
            $points = (int) $commande->loyalty_points_redeemed;

            $tx = LoyaltyPointTransaction::create([
                'client_id'      => $clientId,
                'order_id'       => $commande->id,
                'type'           => LoyaltyTransactionType::Redeem->value,
                'points'         => -$points,
                'monetary_value' => -round($commande->loyalty_discount ?? 0, 3),
                'description'    => 'Points utilisés — commande #' . $commande->numero,
                'metadata'       => [
                    'loyalty_discount' => $commande->loyalty_discount,
                    'order_number'     => $commande->numero,
                ],
            ]);

            Log::info('LoyaltyService: redemption recorded', [
                'tx_id'     => $tx->id,
                'client_id' => $clientId,
                'order_id'  => $commande->id,
                'points'    => $points,
            ]);

            return $tx;
        });
    }

    /**
     * Reverse both earn and redeem transactions for a cancelled order.
     * Idempotent per order.
     */
    public function reverseOrderTransactions(Commande $commande): void
    {
        $clientId = $commande->client_id ?? $commande->user_id;
        if (! $clientId) {
            return;
        }

        // Idempotency: only one reversal per order
        $reversalExists = LoyaltyPointTransaction::where('order_id', $commande->id)
            ->where('type', LoyaltyTransactionType::Reversal->value)
            ->exists();

        if ($reversalExists) {
            return;
        }

        DB::transaction(function () use ($commande, $clientId) {
            // Reverse earned points
            $earnTx = LoyaltyPointTransaction::where('order_id', $commande->id)
                ->where('type', LoyaltyTransactionType::Earn->value)
                ->first();

            if ($earnTx && $earnTx->points > 0) {
                LoyaltyPointTransaction::create([
                    'client_id'   => $clientId,
                    'order_id'    => $commande->id,
                    'type'        => LoyaltyTransactionType::Reversal->value,
                    'points'      => -$earnTx->points,
                    'description' => 'Annulation points gagnés — commande #' . $commande->numero,
                    'metadata'    => ['reversed_tx_id' => $earnTx->id],
                ]);
            }

            // Restore redeemed points
            $redeemTx = LoyaltyPointTransaction::where('order_id', $commande->id)
                ->where('type', LoyaltyTransactionType::Redeem->value)
                ->first();

            if ($redeemTx && $redeemTx->points < 0) {
                LoyaltyPointTransaction::create([
                    'client_id'   => $clientId,
                    'order_id'    => $commande->id,
                    'type'        => LoyaltyTransactionType::Reversal->value,
                    'points'      => abs($redeemTx->points),
                    'description' => 'Restauration points utilisés — commande annulée #' . $commande->numero,
                    'metadata'    => ['reversed_tx_id' => $redeemTx->id],
                ]);
            }

            Log::info('LoyaltyService: transactions reversed for order', [
                'order_id'  => $commande->id,
                'client_id' => $clientId,
            ]);
        });
    }

    // ── Redemption validation ────────────────────────────

    /**
     * Validate and compute a redemption.
     * Returns ['valid' => bool, 'message' => string, 'points' => int, 'discount' => float].
     */
    public function validateRedemption(int $clientId, float $orderSubtotal, int $pointsToRedeem): array
    {
        $available = $this->getBalance($clientId);
        $minRedeem = (int) config('loyalty.min_points_to_redeem', 100);
        $maxPct    = (float) config('loyalty.max_discount_percent', 0.50);
        $ppDt      = (int) config('loyalty.points_per_dt', 10);

        if ($pointsToRedeem <= 0) {
            return ['valid' => false, 'message' => 'Nombre de points invalide.', 'points' => 0, 'discount' => 0];
        }

        if ($available < $minRedeem) {
            return ['valid' => false, 'message' => "Minimum {$minRedeem} points requis.", 'points' => 0, 'discount' => 0];
        }

        if ($pointsToRedeem > $available) {
            return ['valid' => false, 'message' => 'Solde de points insuffisant.', 'points' => 0, 'discount' => 0];
        }

        $discount     = round($pointsToRedeem / $ppDt, 3);
        $maxDiscount  = round($orderSubtotal * $maxPct, 3);

        if ($discount > $maxDiscount) {
            $discount       = $maxDiscount;
            $pointsToRedeem = (int) ceil($discount * $ppDt);
            $pointsToRedeem = min($pointsToRedeem, $available);
        }

        return [
            'valid'    => true,
            'message'  => '',
            'points'   => $pointsToRedeem,
            'discount' => $discount,
        ];
    }

    // ── Helpers ──────────────────────────────────────────

    private function computeEarnBase(Commande $commande): float
    {
        $earnOnDiscounted = (bool) config('loyalty.earn_on_discounted_orders', true);
        $earnOnDelivery   = (bool) config('loyalty.earn_on_delivery_fee', false);

        $base = (float) ($commande->prix_ht ?? 0);

        if (! $earnOnDiscounted) {
            // Do not earn if a coupon was applied
            if ($commande->coupon_id) {
                return 0;
            }
        } else {
            $base -= (float) ($commande->discount_ht ?? 0);
        }

        // Exclude the part paid with loyalty points
        $base -= (float) ($commande->loyalty_discount ?? 0);

        if ($earnOnDelivery) {
            $base += (float) ($commande->frais_livraison ?? 0);
        }

        return max(0, $base);
    }
}
