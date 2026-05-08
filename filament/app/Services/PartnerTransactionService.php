<?php

namespace App\Services;

use App\Enums\PartnerCodeStatus;
use App\Enums\PartnerStatus;
use App\Enums\PartnerTransactionStatus;
use App\Enums\PartnerTransactionType;
use App\Models\Partner;
use App\Models\PartnerCode;
use App\Models\PartnerTransaction;
use App\Models\Ticket;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Boutique ticket partner commissions and payments (partner_codes + partner_transactions).
 */
class PartnerTransactionService
{
    public function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    /**
     * @return array{valid: bool, message: string, partnerCode: ?PartnerCode, partner: ?Partner}
     */
    public function validatePartnerCodeForTicket(
        string $code,
        float $subtotal_ht_after_regular_discount,
        ?int $client_id = null,
        ?string $phone = null,
        ?string $email = null,
    ): array {
        unset($client_id, $phone, $email);

        $normalized = $this->normalizeCode($code);
        /** @var PartnerCode|null $partnerCode */
        $partnerCode = PartnerCode::query()
            ->with('partner')
            ->whereRaw('UPPER(TRIM(code)) = ?', [$normalized])
            ->first();

        if (! $partnerCode) {
            return ['valid' => false, 'message' => __('Code partenaire invalide.'), 'partnerCode' => null, 'partner' => null];
        }

        if ($partnerCode->status !== PartnerCodeStatus::Active) {
            return ['valid' => false, 'message' => __('Ce code partenaire n’est pas actif.'), 'partnerCode' => null, 'partner' => null];
        }

        $partner = $partnerCode->partner;
        if (! $partner) {
            return ['valid' => false, 'message' => __('Partenaire introuvable pour ce code.'), 'partnerCode' => null, 'partner' => null];
        }

        if ($partner->status !== PartnerStatus::Active) {
            return ['valid' => false, 'message' => __('Ce partenaire n’est pas actif.'), 'partnerCode' => null, 'partner' => null];
        }

        if ($subtotal_ht_after_regular_discount < 0) {
            return ['valid' => false, 'message' => __('Montant ticket invalide.'), 'partnerCode' => null, 'partner' => null];
        }

        return ['valid' => true, 'message' => '', 'partnerCode' => $partnerCode, 'partner' => $partner];
    }

    public function effectiveCommissionRatePercent(PartnerCode $code, Partner $partner): float
    {
        if ($code->commission_rate !== null && (float) $code->commission_rate > 0) {
            return (float) $code->commission_rate;
        }

        return $partner->effectiveCommissionRate();
    }

    public function computePartnerDiscountHt(PartnerCode $code, float $baseAfterRegularDiscountHt): float
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
    public function previewFromTotals(PartnerCode $code, Partner $partner, array $totals): array
    {
        $baseAfterRegular = max(0.0, (float) ($totals['base_after_regular_discount'] ?? 0));
        $discountHt = $this->computePartnerDiscountHt($code, $baseAfterRegular);
        $commissionBase = max(0.0, (float) ($totals['final_paid_amount'] ?? 0));
        $rate = $this->effectiveCommissionRatePercent($code, $partner);
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

            if ($locked->partner_commission_processed_at !== null) {
                return;
            }

            if (! $locked->partner_id || ! $locked->partner_code_id) {
                return;
            }

            if (PartnerTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', PartnerTransactionType::Commission)
                ->where('status', PartnerTransactionStatus::Confirmed)
                ->exists()) {
                return;
            }

            $partner = Partner::query()->whereKey($locked->partner_id)->lockForUpdate()->first();
            $code = PartnerCode::query()->whereKey($locked->partner_code_id)->first();

            if (! $partner || ! $code || $partner->status !== PartnerStatus::Active) {
                return;
            }

            $base = max(0.0, (float) ($locked->partner_commission_base ?? 0));
            $rate = (float) ($locked->partner_commission_rate ?? 0);
            $amount = max(0.0, (float) ($locked->partner_commission_amount ?? $this->calculateCommissionAmount($base, $rate)));

            if ($amount <= 0.0001) {
                $locked->forceFill(['partner_commission_processed_at' => now()])->save();

                return;
            }

            $balanceBefore = (float) ($partner->current_balance ?? 0);
            $newBalance = round($balanceBefore + $amount, 3);

            PartnerTransaction::query()->create([
                'partner_id' => $partner->id,
                'partner_code_id' => $code->id,
                'ticket_id' => $locked->id,
                'type' => PartnerTransactionType::Commission,
                'status' => PartnerTransactionStatus::Confirmed,
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

            $partner->forceFill([
                'current_balance' => $newBalance,
                'total_earned' => round((float) ($partner->total_earned ?? 0) + $amount, 3),
            ])->save();

            $code->increment('used_count');

            $locked->forceFill([
                'partner_commission_processed_at' => now(),
                'partner_commission_base' => $base,
                'partner_commission_rate' => $rate,
                'partner_commission_amount' => $amount,
            ])->save();
        });
    }

    public function reverseTicketCommission(Ticket $ticket, ?string $reason = null): void
    {
        DB::transaction(function () use ($ticket, $reason) {
            /** @var Ticket $locked */
            $locked = Ticket::query()->whereKey($ticket->id)->lockForUpdate()->firstOrFail();

            $original = PartnerTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', PartnerTransactionType::Commission)
                ->where('status', PartnerTransactionStatus::Confirmed)
                ->first();

            if (! $original) {
                return;
            }

            $already = PartnerTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', PartnerTransactionType::Reversal)
                ->where('status', PartnerTransactionStatus::Confirmed)
                ->get()
                ->contains(fn (PartnerTransaction $r) => (int) data_get($r->metadata, 'reverses_transaction_id') === (int) $original->id);

            if ($already) {
                return;
            }

            $partner = Partner::query()->whereKey($original->partner_id)->lockForUpdate()->firstOrFail();
            $credit = max(0.0, (float) $original->amount);
            $signed = -round($credit, 3);
            $newBal = round((float) ($partner->current_balance ?? 0) + $signed, 3);

            PartnerTransaction::query()->create([
                'partner_id' => $partner->id,
                'partner_code_id' => $original->partner_code_id,
                'ticket_id' => $locked->id,
                'type' => PartnerTransactionType::Reversal,
                'status' => PartnerTransactionStatus::Confirmed,
                'amount' => $signed,
                'balance_after' => $newBal,
                'description' => $reason ?? __('Annulation commission ticket :num', ['num' => (string) ($locked->numero ?? $locked->id)]),
                'metadata' => [
                    'reverses_transaction_id' => $original->id,
                ],
                'created_by' => Auth::id(),
            ]);

            $partner->forceFill([
                'current_balance' => $newBal,
                'total_earned' => round(max(0.0, (float) ($partner->total_earned ?? 0) + $signed), 3),
            ])->save();
        });
    }

    public function getAvailableBalance(Partner $partner): float
    {
        return round((float) ($partner->fresh()->current_balance ?? 0), 3);
    }

    /**
     * Single-step payout: records a paid payment and updates partner balances.
     *
     * @throws \InvalidArgumentException
     */
    public function recordPartnerPayment(Partner $partner, float $amount, ?string $adminNote = null, ?string $paymentReference = null): void
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException(__('Montant de paiement invalide.'));
        }

        DB::transaction(function () use ($partner, $amount, $adminNote, $paymentReference) {
            $lockedPartner = Partner::query()->whereKey($partner->id)->lockForUpdate()->firstOrFail();
            $bal = (float) ($lockedPartner->current_balance ?? 0);
            if ($amount > $bal + 0.0001) {
                throw new \InvalidArgumentException(__('Solde partenaire insuffisant.'));
            }

            $signed = -round($amount, 3);
            $newBal = round($bal + $signed, 3);

            PartnerTransaction::query()->create([
                'partner_id' => $lockedPartner->id,
                'ticket_id' => null,
                'partner_code_id' => null,
                'type' => PartnerTransactionType::Payment,
                'status' => PartnerTransactionStatus::Paid,
                'amount' => $signed,
                'balance_after' => $newBal,
                'description' => __('Paiement partenaire'),
                'metadata' => array_filter([
                    'admin_note' => $adminNote,
                    'payment_reference' => $paymentReference,
                ]),
                'created_by' => Auth::id(),
            ]);

            $lockedPartner->forceFill([
                'current_balance' => $newBal,
                'total_paid' => round((float) ($lockedPartner->total_paid ?? 0) + $amount, 3),
            ])->save();
        });
    }

    public function adjustBalance(Partner $partner, float $signedAmount, ?string $note = null): PartnerTransaction
    {
        return DB::transaction(function () use ($partner, $signedAmount, $note) {
            $lockedPartner = Partner::query()->whereKey($partner->id)->lockForUpdate()->firstOrFail();
            $bal = (float) ($lockedPartner->current_balance ?? 0);
            $newBal = round($bal + $signedAmount, 3);

            $tx = PartnerTransaction::query()->create([
                'partner_id' => $lockedPartner->id,
                'ticket_id' => null,
                'partner_code_id' => null,
                'type' => PartnerTransactionType::Adjustment,
                'status' => PartnerTransactionStatus::Confirmed,
                'amount' => $signedAmount,
                'balance_after' => $newBal,
                'description' => $note ?? __('Ajustement manuel'),
                'metadata' => [],
                'created_by' => Auth::id(),
            ]);

            $earnedDelta = $signedAmount > 0 ? $signedAmount : 0.0;
            $lockedPartner->forceFill([
                'current_balance' => $newBal,
                'total_earned' => round((float) ($lockedPartner->total_earned ?? 0) + $earnedDelta, 3),
            ])->save();

            return $tx;
        });
    }
}
