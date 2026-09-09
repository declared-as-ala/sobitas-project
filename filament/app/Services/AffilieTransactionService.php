<?php

namespace App\Services;

use App\Enums\AffilieCodeStatus;
use App\Enums\AffilieStatus;
use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Models\Affilie;
use App\Models\AffilieCode;
use App\Models\AffilieTransaction;
use App\Models\Ticket;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Boutique ticket affilie commissions and payments (affilie_codes + affilie_transactions).
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
}
