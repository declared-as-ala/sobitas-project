<?php

namespace App\Services;

use App\Enums\LoyaltyCardStatus;
use App\Enums\LoyaltyTransactionType;
use App\Models\Client;
use App\Models\Commande;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyProgramSetting;
use App\Models\LoyaltyPointTransaction;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoyaltyService
{
    /**
     * Resolve CRM client id for loyalty on a commande (never treat users.id as clients.id).
     */
    public function resolveClientIdForCommande(Commande $commande): ?int
    {
        if ($commande->client_id) {
            return (int) $commande->client_id;
        }

        if ($commande->user_id) {
            $user = User::find((int) $commande->user_id);
            if ($user?->client) {
                return (int) $user->client->id;
            }

            // Legacy guest rows: commandes.user_id stored clients.id
            if (Client::where('id', (int) $commande->user_id)->exists()) {
                return (int) $commande->user_id;
            }
        }

        return null;
    }

    // ── Card management ──────────────────────────────────

    /**
     * Get or create loyalty card for a client.
     */
    public function getOrCreateCardForClient(Client $client): LoyaltyCard
    {
        return $this->getOrCreateCard($client);
    }

    public function getOrCreateCard(Client $client): LoyaltyCard
    {
        $card = LoyaltyCard::query()
            ->where('client_id', $client->id)
            ->where('status', '!=', LoyaltyCardStatus::Replaced->value)
            ->orderByRaw("CASE WHEN status = ? THEN 0 ELSE 1 END", [LoyaltyCardStatus::Active->value])
            ->orderByDesc('id')
            ->first();
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
        $rate    = (int) LoyaltyProgramSetting::val('points_per_dt', 10);

        return $rate > 0 ? round($points / $rate, 3) : 0;
    }

    // ── Points earning ───────────────────────────────────

    /**
     * Earn points for a completed/delivered order.
     * Idempotent: one earn transaction per order.
     */
    public function earnPointsForOrder(Commande $commande): ?LoyaltyPointTransaction
    {
        $clientId = $this->resolveClientIdForCommande($commande);
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
            $ppCur  = (int) LoyaltyProgramSetting::val('points_per_currency', 1);
            $points = (int) floor($base * $ppCur);

            if ($points <= 0) {
                return null;
            }

            $tx = LoyaltyPointTransaction::create([
                'client_id'     => $clientId,
                'order_id'      => $commande->id,
                'type'          => LoyaltyTransactionType::Earn->value,
                'points'        => $points,
                'monetary_value'=> round($points / LoyaltyProgramSetting::val('points_per_dt', 10), 3),
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

        $clientId = $this->resolveClientIdForCommande($commande);
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
        $clientId = $this->resolveClientIdForCommande($commande);
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

    /**
     * Manual POS / admin adjustment (positive or negative points).
     */
    public function adjustPoints(int $clientId, int $points, ?string $description = null, ?int $createdBy = null): LoyaltyPointTransaction
    {
        if (! (bool) LoyaltyProgramSetting::val('allow_manual_adjustment', true)) {
            throw new \InvalidArgumentException('Les ajustements manuels sont désactivés.');
        }

        $client = Client::findOrFail($clientId);
        $this->getOrCreateCard($client);
        $newBalance = $this->getBalance($clientId) + $points;
        if ($newBalance < 0) {
            throw new \InvalidArgumentException('Le solde ne peut pas devenir négatif.');
        }

        $ppDt = (int) LoyaltyProgramSetting::val('points_per_dt', 10);

        return LoyaltyPointTransaction::create([
            'client_id'      => $clientId,
            'type'           => LoyaltyTransactionType::Adjustment->value,
            'points'         => $points,
            'monetary_value' => $ppDt > 0 ? round($points / $ppDt, 3) : null,
            'description'    => $description ?? 'Ajustement',
            'created_by'     => $createdBy,
        ]);
    }

    // ── Redemption validation ────────────────────────────

    /**
     * Validate and compute a redemption.
     * Returns ['valid' => bool, 'message' => string, 'points' => int, 'discount' => float].
     */
    public function validateRedemption(int $clientId, float $orderSubtotal, int $pointsToRedeem): array
    {
        $available = $this->getBalance($clientId);
        $minRedeem = (int) LoyaltyProgramSetting::val('min_points_to_redeem', 100);
        $maxPct    = (float) LoyaltyProgramSetting::val('max_discount_percent', 0.50);
        $ppDt      = (int) LoyaltyProgramSetting::val('points_per_dt', 10);

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
        $earnOnDiscounted = (bool) LoyaltyProgramSetting::val('earn_on_discounted_orders', true);
        $earnOnDelivery   = (bool) LoyaltyProgramSetting::val('earn_on_delivery_fee', false);

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

    public function convertPointsToMoney(int $points): float
    {
        $ppDt = (int) LoyaltyProgramSetting::val('points_per_dt', 10);

        return $ppDt > 0 ? round($points / $ppDt, 3) : 0.0;
    }

    public function convertMoneyToPoints(float $amountDt): int
    {
        $ppCur = (int) LoyaltyProgramSetting::val('points_per_currency', 1);

        return (int) floor(max(0, $amountDt) * $ppCur);
    }

    /**
     * Boutique POS: after ticket is finalized, record redeem + earn once.
     * Idempotent via tickets.loyalty_processed_at.
     */
    public function processLoyaltyForPaidPosTicket(Ticket $ticket): void
    {
        if (! (bool) LoyaltyProgramSetting::val('enabled', true)) {
            return;
        }

        $ticket->refresh();

        if (! $ticket->client_id) {
            return;
        }

        if ($ticket->loyalty_processed_at) {
            return;
        }

        $earnStatuses = LoyaltyProgramSetting::val('ticket_earn_trigger_statuses', ['paid']);
        $status = (string) ($ticket->status ?? '');
        if ($status !== '' && ! in_array($status, $earnStatuses, true)) {
            return;
        }

        $client = Client::find($ticket->client_id);
        if (! $client) {
            return;
        }

        $card = $this->resolveCardForTicket($ticket, $client);
        if (! $card) {
            return;
        }

        $redeemPts = (int) ($ticket->loyalty_points_redeemed ?? 0);
        if ($redeemPts > 0 && $card->status !== LoyaltyCardStatus::Active) {
            Log::warning('LoyaltyService: redeem skipped — card not active', [
                'ticket_id' => $ticket->id,
                'card_id'   => $card->id,
                'status'    => $card->status?->value,
            ]);

            return;
        }

        DB::transaction(function () use ($ticket, $client, $card, $redeemPts) {
            $locked = Ticket::query()->whereKey($ticket->id)->lockForUpdate()->first();
            if (! $locked || $locked->loyalty_processed_at) {
                return;
            }

            $clientId = (int) $client->id;
            $ppDt     = (int) LoyaltyProgramSetting::val('points_per_dt', 10);
            $ppCur    = (int) LoyaltyProgramSetting::val('points_per_currency', 1);

            if ($redeemPts > 0) {
                $existingRedeem = LoyaltyPointTransaction::where('ticket_id', $locked->id)
                    ->where('type', LoyaltyTransactionType::Redeem->value)
                    ->exists();
                if (! $existingRedeem) {
                    $balance = $this->getBalance($clientId);
                    if ($balance < $redeemPts) {
                        throw new \RuntimeException('Solde insuffisant pour utiliser ces points.');
                    }

                    $disc = (float) ($locked->loyalty_discount_amount ?? 0);
                    LoyaltyPointTransaction::create([
                        'client_id'        => $clientId,
                        'ticket_id'        => $locked->id,
                        'loyalty_card_id'  => $card->id,
                        'type'             => LoyaltyTransactionType::Redeem->value,
                        'points'           => -$redeemPts,
                        'monetary_value'   => $ppDt > 0 ? -round($redeemPts / $ppDt, 3) : null,
                        'description'      => 'Points utilisés — ticket #' . ($locked->numero ?? $locked->id),
                        'metadata'         => [
                            'loyalty_discount_amount' => $disc,
                            'ticket_numero'         => $locked->numero,
                        ],
                    ]);
                }
            }

            $earnBase = (float) ($locked->prix_ttc ?? 0);
            $earnPts  = (int) floor(max(0, $earnBase) * $ppCur);

            $existingEarn = LoyaltyPointTransaction::where('ticket_id', $locked->id)
                ->where('type', LoyaltyTransactionType::Earn->value)
                ->first();
            if (! $existingEarn && $earnPts > 0) {
                LoyaltyPointTransaction::create([
                    'client_id'       => $clientId,
                    'ticket_id'       => $locked->id,
                    'loyalty_card_id' => $card->id,
                    'type'            => LoyaltyTransactionType::Earn->value,
                    'points'          => $earnPts,
                    'monetary_value'  => $ppDt > 0 ? round($earnPts / $ppDt, 3) : null,
                    'description'     => 'Points gagnés — ticket #' . ($locked->numero ?? $locked->id),
                    'metadata'        => [
                        'earn_base'     => $earnBase,
                        'ticket_numero' => $locked->numero,
                    ],
                ]);
            } elseif ($existingEarn) {
                $earnPts = (int) $existingEarn->points;
            }

            $locked->forceFill([
                'loyalty_points_earned' => $earnPts,
                'loyalty_processed_at'  => now(),
                'loyalty_card_id'       => $card->id,
            ])->saveQuietly();
        });
    }

    /**
     * Reverse earn + redeem ledger rows for a cancelled ticket (idempotent).
     */
    public function reversePointsForTicket(Ticket $ticket): void
    {
        if (! $ticket->client_id) {
            return;
        }

        $reversalExists = LoyaltyPointTransaction::where('ticket_id', $ticket->id)
            ->where('type', LoyaltyTransactionType::Reversal->value)
            ->exists();
        if ($reversalExists) {
            return;
        }

        $clientId = (int) $ticket->client_id;

        DB::transaction(function () use ($ticket, $clientId) {
            $earnTx = LoyaltyPointTransaction::where('ticket_id', $ticket->id)
                ->where('type', LoyaltyTransactionType::Earn->value)
                ->first();
            if ($earnTx && $earnTx->points > 0) {
                LoyaltyPointTransaction::create([
                    'client_id'       => $clientId,
                    'ticket_id'       => $ticket->id,
                    'loyalty_card_id' => $earnTx->loyalty_card_id,
                    'type'            => LoyaltyTransactionType::Reversal->value,
                    'points'          => -$earnTx->points,
                    'description'     => 'Annulation points gagnés — ticket #' . ($ticket->numero ?? $ticket->id),
                    'metadata'        => ['reversed_tx_id' => $earnTx->id],
                ]);
            }

            $redeemTx = LoyaltyPointTransaction::where('ticket_id', $ticket->id)
                ->where('type', LoyaltyTransactionType::Redeem->value)
                ->first();
            if ($redeemTx && $redeemTx->points < 0) {
                LoyaltyPointTransaction::create([
                    'client_id'       => $clientId,
                    'ticket_id'       => $ticket->id,
                    'loyalty_card_id' => $redeemTx->loyalty_card_id,
                    'type'            => LoyaltyTransactionType::Reversal->value,
                    'points'          => abs($redeemTx->points),
                    'description'     => 'Restauration points — ticket annulé #' . ($ticket->numero ?? $ticket->id),
                    'metadata'        => ['reversed_tx_id' => $redeemTx->id],
                ]);
            }
        });
    }

    private function resolveCardForTicket(Ticket $ticket, Client $client): ?LoyaltyCard
    {
        if ($ticket->loyalty_card_id) {
            return LoyaltyCard::where('id', $ticket->loyalty_card_id)
                ->where('client_id', $client->id)
                ->first();
        }

        return LoyaltyCard::where('client_id', $client->id)
            ->where('status', LoyaltyCardStatus::Active)
            ->first()
            ?? $this->getOrCreateCard($client);
    }
}
