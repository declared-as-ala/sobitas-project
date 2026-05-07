<?php

namespace App\Services;

use App\Enums\PartnerAppliesChannel;
use App\Enums\PartnerCommissionTransactionStatus;
use App\Enums\PartnerCommissionTransactionType;
use App\Enums\PartnerPayoutStatus;
use App\Enums\PartnerStatus;
use App\Models\Coordinate;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Partner;
use App\Models\PartnerCommissionTransaction;
use App\Models\PartnerPayout;
use App\Models\Ticket;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Boutique ticket partner commissions: ledger + payouts. No commande / website attribution.
 *
 * Commission base: net HT paid after regular remise, partner promo discount, and loyalty redemption
 * (matches Ticket POS `computeTicketTotals()['final_paid_amount']`). Delivery fees are not used on POS tickets.
 */
class PartnerCommissionService
{
    public function __construct(
        protected CouponService $couponService
    ) {}

    public function resolveAppliesChannel(Coupon $coupon): PartnerAppliesChannel
    {
        $raw = $coupon->applies_channel ?? 'website';
        if ($raw instanceof PartnerAppliesChannel) {
            return $raw;
        }

        return PartnerAppliesChannel::tryFrom((string) $raw) ?? PartnerAppliesChannel::Website;
    }

    public function commissionBaseFromTotals(array $totals): float
    {
        return max(0.0, (float) ($totals['final_paid_amount'] ?? 0));
    }

    public function calculateCommissionAmount(float $base, float $ratePercent): float
    {
        return round(max(0.0, $base) * max(0.0, $ratePercent) / 100, 3);
    }

    /**
     * Customer discount (HT) applied after regular remise, before loyalty.
     */
    public function computePartnerDiscountHt(Coupon $coupon, float $baseAfterRegularDiscountHt): float
    {
        if ($coupon->type === Coupon::TYPE_FREE_SHIPPING) {
            return 0.0;
        }

        $disc = $this->couponService->computeDiscount($coupon, max(0.0, $baseAfterRegularDiscountHt), 0);

        return min(max(0.0, (float) ($disc['discount_ht'] ?? 0)), max(0.0, $baseAfterRegularDiscountHt));
    }

    public function effectiveCommissionRatePercent(Coupon $coupon, Partner $partner): float
    {
        if ($coupon->commission_rate !== null && (float) $coupon->commission_rate > 0) {
            return (float) $coupon->commission_rate;
        }

        return (float) $partner->default_commission_rate;
    }

    /**
     * @return array{valid: bool, message: string, coupon: ?Coupon, partner: ?Partner}
     */
    public function validatePartnerCodeForTicket(
        string $code,
        float $subtotal_ht_after_regular_discount,
        ?int $client_id = null,
        ?string $phone = null,
        ?string $email = null,
    ): array {
        $normalized = $this->couponService->normalizeCode($code);
        /** @var Coupon|null $coupon */
        $coupon = Coupon::query()->with('partner')->whereRaw('UPPER(TRIM(code)) = ?', [$normalized])->first();

        if (! $coupon || ! $coupon->is_partner_code) {
            return ['valid' => false, 'message' => __('Code partenaire invalide.'), 'coupon' => null, 'partner' => null];
        }

        $channel = $this->resolveAppliesChannel($coupon);
        if (! $channel->allowsBoutique()) {
            return ['valid' => false, 'message' => __('Ce code n’est pas utilisable en boutique.'), 'coupon' => null, 'partner' => null];
        }

        $partner = $coupon->partner;
        if (! $partner) {
            return ['valid' => false, 'message' => __('Partenaire introuvable pour ce code.'), 'coupon' => null, 'partner' => null];
        }

        if ($partner->status !== PartnerStatus::Active) {
            return ['valid' => false, 'message' => __('Ce partenaire n’est pas actif.'), 'coupon' => null, 'partner' => null];
        }

        if (! $coupon->is_active) {
            return ['valid' => false, 'message' => __('Ce code n’est plus actif.'), 'coupon' => null, 'partner' => null];
        }

        $now = Carbon::now();
        if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
            return ['valid' => false, 'message' => __('Ce code n’est pas encore valide.'), 'coupon' => null, 'partner' => null];
        }
        if ($coupon->ends_at && $now->gt($coupon->ends_at)) {
            return ['valid' => false, 'message' => __('Ce code a expiré.'), 'coupon' => null, 'partner' => null];
        }

        $baseCandidate = max(0.0, $subtotal_ht_after_regular_discount);
        if ($coupon->min_order_amount !== null && $baseCandidate < (float) $coupon->min_order_amount) {
            return [
                'valid' => false,
                'message' => __('Montant minimum (après remise) : :amount TND (HT).', ['amount' => number_format((float) $coupon->min_order_amount, 2)]),
                'coupon' => null,
                'partner' => null,
            ];
        }

        if ($coupon->usage_limit_total !== null) {
            $used = CouponRedemption::where('coupon_id', $coupon->id)->count();
            if ($used >= $coupon->usage_limit_total) {
                return ['valid' => false, 'message' => __('Ce code a atteint sa limite d’utilisation.'), 'coupon' => null, 'partner' => null];
            }
        }

        if ($coupon->usage_limit_per_client !== null) {
            $query = CouponRedemption::where('coupon_id', $coupon->id);
            if ($client_id) {
                $query->where('client_id', $client_id);
            } elseif ($phone) {
                $query->where('phone_snapshot', $this->couponServiceNormalizePhone($phone));
            } elseif ($email) {
                $query->where('email_snapshot', $email);
            } else {
                return ['valid' => false, 'message' => __('Client requis pour utiliser ce code.'), 'coupon' => null, 'partner' => null];
            }

            if ($query->count() >= $coupon->usage_limit_per_client) {
                return ['valid' => false, 'message' => __('Limite d’utilisation par client atteinte.'), 'coupon' => null, 'partner' => null];
            }
        }

        return ['valid' => true, 'message' => '', 'coupon' => $coupon, 'partner' => $partner];
    }

    private function couponServiceNormalizePhone(?string $phone): string
    {
        if ($phone === null || $phone === '') {
            return '';
        }

        return preg_replace('/\D/', '', $phone);
    }

    /**
     * Preview discount + commission from totals array (see Ticket POS computeTicketTotals).
     *
     * @return array{discount_ht: float, rate: float, commission_amount: float, commission_base: float}
     */
    public function previewFromTotals(Coupon $coupon, Partner $partner, array $totals): array
    {
        $baseAfterRegular = max(0.0, (float) ($totals['base_after_regular_discount'] ?? 0));
        $discountHt = $this->computePartnerDiscountHt($coupon, $baseAfterRegular);
        $commissionBase = max(0.0, (float) ($totals['final_paid_amount'] ?? 0));
        $rate = $this->effectiveCommissionRatePercent($coupon, $partner);
        $commissionAmount = $this->calculateCommissionAmount($commissionBase, $rate);

        return [
            'discount_ht' => $discountHt,
            'rate' => $rate,
            'commission_amount' => $commissionAmount,
            'commission_base' => $commissionBase,
        ];
    }

    /**
     * Single write path: redemption row (once per ticket+coupon), ledger commission, ticket timestamps.
     */
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

            $partner = Partner::query()->whereKey($locked->partner_id)->first();
            $coupon = Coupon::query()->whereKey($locked->partner_code_id)->first();

            if (! $partner || ! $coupon || $partner->status !== PartnerStatus::Active) {
                return;
            }

            $base = max(0.0, (float) ($locked->partner_commission_base ?? 0));
            $rate = (float) ($locked->partner_commission_rate ?? 0);
            $amount = max(0.0, (float) ($locked->partner_commission_amount ?? $this->calculateCommissionAmount($base, $rate)));

            $coordinate = Coordinate::getCached();
            $tvaRate = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 0;
            $discountHt = max(0.0, (float) ($locked->partner_discount_amount ?? 0));
            $discountTtc = round($discountHt + ($discountHt * $tvaRate / 100), 3);

            CouponRedemption::query()->firstOrCreate(
                [
                    'coupon_id' => $coupon->id,
                    'ticket_id' => $locked->id,
                ],
                [
                    'order_id' => null,
                    'client_id' => $locked->client_id,
                    'phone_snapshot' => $locked->client?->phone_1 ? $this->couponServiceNormalizePhone($locked->client->phone_1) : '',
                    'email_snapshot' => $locked->client?->email ?? '',
                    'discount_amount_ht' => $discountHt,
                    'discount_amount_ttc' => $discountTtc,
                ]
            );

            $balanceAfter = $this->getAvailableBalance($partner) + $amount;

            PartnerCommissionTransaction::query()->create([
                'partner_id' => $partner->id,
                'partner_code_id' => $coupon->id,
                'ticket_id' => $locked->id,
                'type' => PartnerCommissionTransactionType::Commission,
                'status' => PartnerCommissionTransactionStatus::Confirmed,
                'commission_base' => $base,
                'commission_rate' => $rate,
                'amount' => $amount,
                'balance_after' => round($balanceAfter, 3),
                'description' => __('Commission ticket :num', ['num' => (string) ($locked->numero ?? $locked->id)]),
                'metadata' => [
                    'ticket_id' => $locked->id,
                    'coupon_code' => $coupon->code,
                ],
                'created_by' => Auth::id(),
            ]);

            $locked->forceFill([
                'partner_commission_processed_at' => now(),
                'partner_commission_base' => $base,
                'partner_commission_rate' => $rate,
                'partner_commission_amount' => $amount,
            ])->save();
        });
    }

    /**
     * Reverse a confirmed commission for a ticket (idempotent via metadata flag).
     */
    public function reverseTicketCommission(Ticket $ticket, ?string $reason = null): void
    {
        DB::transaction(function () use ($ticket, $reason) {
            /** @var Ticket $locked */
            $locked = Ticket::query()->whereKey($ticket->id)->lockForUpdate()->firstOrFail();

            $original = PartnerCommissionTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', PartnerCommissionTransactionType::Commission)
                ->where('status', PartnerCommissionTransactionStatus::Confirmed)
                ->first();

            if (! $original) {
                return;
            }

            $already = PartnerCommissionTransaction::query()
                ->where('ticket_id', $locked->id)
                ->where('type', PartnerCommissionTransactionType::Reversal)
                ->where('status', PartnerCommissionTransactionStatus::Confirmed)
                ->where('metadata->reverses_transaction_id', $original->id)
                ->exists();

            if ($already) {
                return;
            }

            $partner = Partner::query()->whereKey($original->partner_id)->firstOrFail();
            $amount = max(0.0, (float) $original->amount);
            $balanceAfter = $this->getAvailableBalance($partner) - $amount;

            PartnerCommissionTransaction::query()->create([
                'partner_id' => $partner->id,
                'partner_code_id' => $original->partner_code_id,
                'ticket_id' => $locked->id,
                'type' => PartnerCommissionTransactionType::Reversal,
                'status' => PartnerCommissionTransactionStatus::Confirmed,
                'commission_base' => $original->commission_base,
                'commission_rate' => $original->commission_rate,
                'amount' => $amount,
                'balance_after' => round($balanceAfter, 3),
                'description' => $reason ?? __('Annulation commission ticket :num', ['num' => (string) ($locked->numero ?? $locked->id)]),
                'metadata' => [
                    'reverses_transaction_id' => $original->id,
                ],
                'created_by' => Auth::id(),
            ]);
        });
    }

    /**
     * Credits: confirmed commissions + adjustments (signed). Debits: confirmed reversals + paid payouts + pending payouts.
     */
    public function getAvailableBalance(Partner $partner): float
    {
        $partnerId = $partner->id;

        $commissionCredit = (float) PartnerCommissionTransaction::query()
            ->where('partner_id', $partnerId)
            ->where('type', PartnerCommissionTransactionType::Commission)
            ->where('status', PartnerCommissionTransactionStatus::Confirmed)
            ->sum('amount');

        $adjustmentNet = (float) PartnerCommissionTransaction::query()
            ->where('partner_id', $partnerId)
            ->where('type', PartnerCommissionTransactionType::Adjustment)
            ->where('status', PartnerCommissionTransactionStatus::Confirmed)
            ->sum('amount');

        $reversalDebit = (float) PartnerCommissionTransaction::query()
            ->where('partner_id', $partnerId)
            ->where('type', PartnerCommissionTransactionType::Reversal)
            ->where('status', PartnerCommissionTransactionStatus::Confirmed)
            ->sum('amount');

        $payoutDebit = (float) PartnerCommissionTransaction::query()
            ->where('partner_id', $partnerId)
            ->where('type', PartnerCommissionTransactionType::Payout)
            ->whereIn('status', [
                PartnerCommissionTransactionStatus::Pending,
                PartnerCommissionTransactionStatus::Paid,
            ])
            ->sum('amount');

        return round($commissionCredit + $adjustmentNet - $reversalDebit - $payoutDebit, 3);
    }

    /**
     * Creates payout row + ledger row (pending). Marks partner payout pending until paid.
     *
     * @throws \InvalidArgumentException
     */
    public function createPayout(Partner $partner, float $amount, ?string $adminNote = null): PartnerPayout
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException(__('Montant de paiement invalide.'));
        }

        return DB::transaction(function () use ($partner, $amount, $adminNote) {
            $lockedPartner = Partner::query()->whereKey($partner->id)->lockForUpdate()->firstOrFail();

            $balance = $this->getAvailableBalance($lockedPartner);
            if ($amount > $balance + 0.0001) {
                throw new \InvalidArgumentException(__('Solde partenaire insuffisant.'));
            }

            $payout = PartnerPayout::query()->create([
                'partner_id' => $lockedPartner->id,
                'amount' => $amount,
                'status' => PartnerPayoutStatus::Pending,
                'admin_note' => $adminNote,
                'created_by' => Auth::id(),
            ]);

            $balanceAfter = $balance - $amount;

            PartnerCommissionTransaction::query()->create([
                'partner_id' => $lockedPartner->id,
                'partner_code_id' => null,
                'ticket_id' => null,
                'type' => PartnerCommissionTransactionType::Payout,
                'status' => PartnerCommissionTransactionStatus::Pending,
                'commission_base' => 0,
                'commission_rate' => 0,
                'amount' => $amount,
                'balance_after' => round($balanceAfter, 3),
                'description' => __('Paiement partenaire #:id', ['id' => (string) $payout->id]),
                'metadata' => ['partner_payout_id' => $payout->id],
                'created_by' => Auth::id(),
            ]);

            return $payout;
        });
    }

    public function markPayoutPaid(PartnerPayout $payout, ?string $paymentReference = null): void
    {
        DB::transaction(function () use ($payout, $paymentReference) {
            $locked = PartnerPayout::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === PartnerPayoutStatus::Paid) {
                return;
            }

            $locked->forceFill([
                'status' => PartnerPayoutStatus::Paid,
                'paid_at' => now(),
                'payment_reference' => $paymentReference,
            ])->save();

            PartnerCommissionTransaction::query()
                ->where('partner_id', $locked->partner_id)
                ->where('type', PartnerCommissionTransactionType::Payout)
                ->where('status', PartnerCommissionTransactionStatus::Pending)
                ->where('metadata->partner_payout_id', $locked->id)
                ->update(['status' => PartnerCommissionTransactionStatus::Paid]);
        });
    }

    public function adjustBalance(Partner $partner, float $signedAmount, ?string $note = null): PartnerCommissionTransaction
    {
        return DB::transaction(function () use ($partner, $signedAmount, $note) {
            $balance = $this->getAvailableBalance($partner);
            $balanceAfter = round($balance + $signedAmount, 3);

            return PartnerCommissionTransaction::query()->create([
                'partner_id' => $partner->id,
                'partner_code_id' => null,
                'ticket_id' => null,
                'type' => PartnerCommissionTransactionType::Adjustment,
                'status' => PartnerCommissionTransactionStatus::Confirmed,
                'commission_base' => 0,
                'commission_rate' => 0,
                'amount' => $signedAmount,
                'balance_after' => $balanceAfter,
                'description' => $note ?? __('Ajustement manuel'),
                'metadata' => [],
                'created_by' => Auth::id(),
            ]);
        });
    }
}
