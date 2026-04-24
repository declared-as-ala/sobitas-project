<?php

namespace App\Services;

use App\Enums\CommissionTransactionStatus;
use App\Enums\CommissionTransactionType;
use App\Enums\PartnerStatus;
use App\Models\Commande;
use App\Models\Partner;
use App\Models\PartnerCommissionTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PartnerCommissionService
{
    /**
     * Create a confirmed commission transaction for an order.
     * Idempotent: skips silently if a commission already exists for this order.
     */
    public function createCommission(Commande $commande): ?PartnerCommissionTransaction
    {
        $partner = $commande->partner;
        if (! $partner || ! $partner->isActive()) {
            return null;
        }

        // Idempotency: one commission earn per order
        $existing = PartnerCommissionTransaction::where('order_id', $commande->id)
            ->where('type', CommissionTransactionType::Commission->value)
            ->whereNotIn('status', [CommissionTransactionStatus::Cancelled->value])
            ->first();

        if ($existing) {
            Log::info('PartnerCommissionService: commission already exists', [
                'order_id'   => $commande->id,
                'partner_id' => $partner->id,
            ]);
            return $existing;
        }

        return DB::transaction(function () use ($commande, $partner) {
            // Commission base = subtotal after discount, excl. delivery
            $base = $commande->commission_base
                ?? max(0, ($commande->prix_ht ?? 0) - ($commande->discount_ht ?? 0) - ($commande->loyalty_discount ?? 0));

            $couponRate = $commande->coupon?->commission_rate;
            $rate       = ($couponRate !== null) ? $couponRate : $partner->getEffectiveCommissionRate();

            $amount  = round($base * $rate / 100, 3);
            $balance = $this->computeRunningBalance($partner) + $amount;

            $tx = PartnerCommissionTransaction::create([
                'partner_id'    => $partner->id,
                'order_id'      => $commande->id,
                'promo_code_id' => $commande->coupon_id,
                'type'          => CommissionTransactionType::Commission->value,
                'amount'        => $amount,
                'balance_after' => $balance,
                'status'        => CommissionTransactionStatus::Confirmed->value,
                'description'   => 'Commission commande #' . $commande->numero,
                'metadata'      => [
                    'commission_rate' => $rate,
                    'commission_base' => $base,
                    'order_number'    => $commande->numero,
                ],
            ]);

            Log::info('PartnerCommissionService: commission created', [
                'tx_id'      => $tx->id,
                'partner_id' => $partner->id,
                'order_id'   => $commande->id,
                'amount'     => $amount,
            ]);

            return $tx;
        });
    }

    /**
     * Reverse a commission when an order is cancelled/refunded.
     * Idempotent: skips if reversal already exists.
     */
    public function reverseCommission(Commande $commande): ?PartnerCommissionTransaction
    {
        $partner = $commande->partner;
        if (! $partner) {
            return null;
        }

        // Idempotency: one reversal per order
        $existing = PartnerCommissionTransaction::where('order_id', $commande->id)
            ->where('type', CommissionTransactionType::Reversal->value)
            ->first();

        if ($existing) {
            return $existing;
        }

        // Find the original commission to reverse
        $original = PartnerCommissionTransaction::where('order_id', $commande->id)
            ->where('type', CommissionTransactionType::Commission->value)
            ->where('status', CommissionTransactionStatus::Confirmed->value)
            ->first();

        if (! $original) {
            return null;
        }

        return DB::transaction(function () use ($commande, $partner, $original) {
            // Mark original as cancelled
            $original->update(['status' => CommissionTransactionStatus::Cancelled->value]);

            $balance = $this->computeRunningBalance($partner) - $original->amount;

            $tx = PartnerCommissionTransaction::create([
                'partner_id'    => $partner->id,
                'order_id'      => $commande->id,
                'promo_code_id' => $commande->coupon_id,
                'type'          => CommissionTransactionType::Reversal->value,
                'amount'        => -$original->amount,
                'balance_after' => max(0, $balance),
                'status'        => CommissionTransactionStatus::Confirmed->value,
                'description'   => 'Annulation commission commande #' . $commande->numero,
                'metadata'      => ['original_tx_id' => $original->id],
            ]);

            Log::info('PartnerCommissionService: commission reversed', [
                'tx_id'      => $tx->id,
                'partner_id' => $partner->id,
                'order_id'   => $commande->id,
            ]);

            return $tx;
        });
    }

    /**
     * Record a payout and create the corresponding ledger entry.
     */
    public function recordPayout(\App\Models\PartnerPayout $payout): PartnerCommissionTransaction
    {
        return DB::transaction(function () use ($payout) {
            $partner = $payout->partner;
            $balance = $this->computeRunningBalance($partner) - $payout->amount;

            $tx = PartnerCommissionTransaction::create([
                'partner_id'  => $payout->partner_id,
                'type'        => CommissionTransactionType::Payout->value,
                'amount'      => -$payout->amount,
                'balance_after' => max(0, $balance),
                'status'      => CommissionTransactionStatus::Paid->value,
                'description' => 'Paiement partenaire #' . $payout->id,
                'metadata'    => ['payout_id' => $payout->id, 'reference' => $payout->payment_reference],
                'created_by'  => $payout->created_by,
            ]);

            $payout->update([
                'status'  => 'paid',
                'paid_at' => now(),
            ]);

            return $tx;
        });
    }

    /** Running balance from the ledger (confirmed commissions - paid payouts - reversals). */
    public function computeRunningBalance(Partner $partner): float
    {
        $earned = (float) PartnerCommissionTransaction::where('partner_id', $partner->id)
            ->where('type', CommissionTransactionType::Commission->value)
            ->where('status', CommissionTransactionStatus::Confirmed->value)
            ->sum('amount');

        $deducted = (float) PartnerCommissionTransaction::where('partner_id', $partner->id)
            ->whereIn('type', [CommissionTransactionType::Payout->value])
            ->whereIn('status', [CommissionTransactionStatus::Paid->value])
            ->sum('amount');

        return max(0, $earned + $deducted); // payouts are stored as negative amounts
    }

    /** Attach partner_id to order if the applied coupon belongs to an active partner. */
    public function attachPartnerToOrder(Commande $commande): void
    {
        if ($commande->partner_id) {
            return; // already set
        }

        $coupon = $commande->coupon;
        if (! $coupon || ! $coupon->partner_id) {
            return;
        }

        $partner = Partner::find($coupon->partner_id);
        if (! $partner || ! $partner->isActive()) {
            return;
        }

        $base = max(0, ($commande->prix_ht ?? 0) - ($commande->discount_ht ?? 0));
        $rate = $coupon->commission_rate ?? $partner->getEffectiveCommissionRate();

        $commande->update([
            'partner_id'           => $partner->id,
            'commission_base'      => $base,
            'estimated_commission' => round($base * $rate / 100, 3),
        ]);
    }
}
