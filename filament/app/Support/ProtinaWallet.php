<?php

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * One customer's Protinas, split the way Protinas v3 spends them. Built ONLY by
 * App\Services\ProtinaWalletService::forUser(); immutable.
 *
 *   total            users.points_balance (what the header shows: earned + gift).
 *   earnedSpendable  earned Protinas usable now (balance − gift − held earnings).
 *   earnedPending    earnings still inside the 14-day return hold ("en attente").
 *   gift             gift Protinas that have not expired (welcome, reviews, refunded gifts).
 *   debt             users.points_debt: clawbacks not yet repaid. While > 0 nothing can be spent.
 *
 * blockedReason, most severe first:
 *   'unverified'          no verified phone or e-mail: nothing can be spent;
 *   'debt'                a clawback is outstanding: nothing can be spent;
 *   'gift_frozen'         two refusals in the window: gift frozen, earned still usable;
 *   'welcome_phone_used'  the delivery phone belongs to another account's welcome claim (gift only).
 *
 * Never carries the order budget (A, m, K, S) — that lives only inside OrderBudget.
 */
final class ProtinaWallet
{
    public const BLOCK_UNVERIFIED = 'unverified';
    public const BLOCK_DEBT = 'debt';
    public const BLOCK_GIFT_FROZEN = 'gift_frozen';
    public const BLOCK_WELCOME_PHONE_USED = 'welcome_phone_used';

    public function __construct(
        public readonly int $total,
        public readonly int $earnedSpendable,
        public readonly int $earnedPending,
        public readonly ?CarbonInterface $nextAvailableAt,
        public readonly int $gift,
        public readonly ?CarbonInterface $giftExpiresAt,
        public readonly int $debt,
        public readonly ?CarbonInterface $giftFrozenUntil,
        public readonly ?string $blockedReason = null,
        public readonly ?CarbonInterface $codConfirmUntil = null,
        /** True when the wallet split has not run for this account: the whole balance is treated as gift. */
        public readonly bool $unsplit = false,
        /**
         * Rule 17: the account's phone was verified at least loyalty.cod.trusted_phone_days ago, so a
         * confirmation call reaches its owner. False (email-only account, or a number verified
         * recently) keeps the Protinas of an order under the confirmation thresholds.
         */
        public readonly bool $phoneTrusted = true,
        /** When the current phone becomes trusted (null: no verified phone). */
        public readonly ?CarbonInterface $phoneTrustedFrom = null,
        /** The open gift lots include a welcome gift (« Cadeau de bienvenue » in the copy, « Cadeau » otherwise). */
        public readonly bool $giftHasWelcome = false,
    ) {
    }

    /** A guest, or an account with nothing: every amount is 0. */
    public static function empty(): self
    {
        return new self(0, 0, 0, null, 0, null, 0, null);
    }

    /** No earned or gift Protinas may be spent at all (unverified account or outstanding debt). */
    public function isBlocked(): bool
    {
        return in_array($this->blockedReason, [self::BLOCK_UNVERIFIED, self::BLOCK_DEBT], true);
    }

    /** Gift Protinas this order may use (before the order budget caps them). */
    public function usableGift(): int
    {
        if ($this->blockedReason !== null) {
            return 0; // every block reason also blocks the gift
        }

        return max(0, $this->gift);
    }

    /** Earned Protinas this order may use. */
    public function usableEarned(): int
    {
        return $this->isBlocked() ? 0 : max(0, $this->earnedSpendable);
    }

    /** Every order of this account needs a phone confirmation (repeat refuser). */
    public function requiresCodConfirmation(): bool
    {
        return $this->codConfirmUntil !== null && $this->codConfirmUntil->isFuture();
    }

    /** Same wallet, gift unusable for this order (e.g. delivery phone of another welcome claim). */
    public function withGiftBlocked(string $reason): self
    {
        if ($this->blockedReason !== null) {
            return $this; // the gift is already blocked, possibly for a stronger reason
        }

        return new self($this->total, $this->earnedSpendable, $this->earnedPending, $this->nextAvailableAt,
            $this->gift, $this->giftExpiresAt, $this->debt, $this->giftFrozenUntil, $reason,
            $this->codConfirmUntil, $this->unsplit, $this->phoneTrusted, $this->phoneTrustedFrom, $this->giftHasWelcome);
    }

    /**
     * Customer-safe JSON block (profile, dashboard, history). Dates are ISO-8601.
     *
     * @return array{total: int, value_dt: float, earned_spendable: int, earned_pending: int, pending_available_at: ?string, gift_balance: int, gift_expires_at: ?string, debt_points: int, gift_frozen_until: ?string, blocked_reason: ?string, gift_has_welcome: bool, phone_trusted: bool, phone_trusted_from: ?string}
     */
    public function toArray(int $pointsPerDt = 20): array
    {
        $pointsPerDt = max(1, $pointsPerDt);

        return [
            'total' => $this->total,
            'value_dt' => round($this->total / $pointsPerDt, 3),
            'earned_spendable' => $this->earnedSpendable,
            'earned_pending' => $this->earnedPending,
            'pending_available_at' => $this->nextAvailableAt?->toIso8601String(),
            'gift_balance' => $this->gift,
            'gift_expires_at' => $this->giftExpiresAt?->toIso8601String(),
            'debt_points' => $this->debt,
            'gift_frozen_until' => $this->giftFrozenUntil?->toIso8601String(),
            'blocked_reason' => $this->blockedReason,
            'gift_has_welcome' => $this->giftHasWelcome,
            // Rule 17 at checkout: without a phone verified long enough ago, Protinas pay at most under
            // the confirmation thresholds (about half an order). The wallet tiles say so instead of « sans limite ».
            'phone_trusted' => $this->phoneTrusted,
            'phone_trusted_from' => $this->phoneTrustedFrom?->toIso8601String(),
        ];
    }
}
