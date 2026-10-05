<?php

namespace App\Services;

use App\Models\Affilie;
use App\Models\Coupon;
use App\Models\Product;
use App\Support\ProtinaWallet;

/**
 * Read-only checkout arithmetic. All intermediate amounts are integer millimes.
 *
 * Two rule sets, chosen by `loyalty.rules_version`:
 *   2  the 02/10/2026 rules (priceV2, byte-identical: one 10 % ceiling, points on goods only);
 *   3  Protinas v3 (priceV3): earned Protinas up to 100 % of the goods + the delivery, gift
 *      Protinas and the one commercial discount bounded by the hidden order budget (OrderBudget).
 *
 * ⚠️ priceV3()['internal'] carries the order budget. It is for the order row only (budget_dt) and
 * must never be serialised; price() returns the customer-safe 'pricing' part alone.
 */
class CheckoutPricingService
{
    private ?OrderBudget $budget = null;

    private function budget(): OrderBudget
    {
        return $this->budget ??= app(OrderBudget::class);
    }

    public static function millimes(float|int|string $dt): int
    {
        return (int) round((float) $dt * 1000, 0, PHP_ROUND_HALF_UP);
    }

    private static function dt(int $millimes): float
    {
        return round($millimes / 1000, 3);
    }

    public static function rulesVersion(): int
    {
        return (int) config('loyalty.rules_version', 3) >= 3 ? 3 : 2;
    }

    /**
     * @param array<int, array{product: Product, quantity: int}> $lines
     * @param int $requestedPoints v2: points to spend; v3: EARNED Protinas to spend (gift is automatic)
     * @param ProtinaWallet|null $wallet v3 only; null = guest (empty wallet)
     * @param bool $useGift v3 only; false = « Garder pour plus tard »
     */
    public function price(
        array $lines,
        ?Coupon $validCoupon,
        bool $packRequested,
        ?int $lockedBalance,
        int $requestedPoints,
        bool $homeDelivery,
        int $pendingWelcomePoints = 0,
        ?ProtinaWallet $wallet = null,
        bool $useGift = true,
    ): array {
        if (self::rulesVersion() < 3) {
            return $this->priceV2($lines, $validCoupon, $packRequested, $lockedBalance, $requestedPoints,
                $homeDelivery, $pendingWelcomePoints);
        }

        return $this->priceV3($lines, $validCoupon, $packRequested, $requestedPoints, $homeDelivery, $wallet, $useGift)['pricing'];
    }

    /**
     * The 02/10/2026 rules, unchanged (rollback path: LOYALTY_RULES_VERSION=2).
     *
     * @param array<int, array{product: Product, quantity: int}> $lines
     */
    public function priceV2(
        array $lines,
        ?Coupon $validCoupon,
        bool $packRequested,
        ?int $lockedBalance,
        int $requestedPoints,
        bool $homeDelivery,
        int $pendingWelcomePoints = 0,
    ): array {
        $goods = 0;
        $fullPriceGoods = 0;
        foreach ($lines as $line) {
            $product = $line['product'];
            $amount = self::millimes($product->getEffectiveUnitPrice()) * (int) $line['quantity'];
            $goods += $amount;
            if (! $product->hasActivePromo()) {
                $fullPriceGoods += $amount;
            }
        }

        $packService = app(PackDiscountService::class);
        $packPercent = $packRequested ? $packService->percentForSubtotal(self::dt($goods)) : 0;
        $packBase = config('loyalty.pack.exclude_promo_lines', true) ? $fullPriceGoods : $goods;
        $packAmount = (int) round($packBase * $packPercent / 100, 0, PHP_ROUND_HALF_UP);
        $shipping = $homeDelivery && $goods < self::millimes(config('loyalty.checkout.free_delivery_from_dt', 300))
            ? self::millimes(config('loyalty.checkout.delivery_fee_dt', 10)) : 0;
        $freeShippingReason = $homeDelivery && $shipping === 0 ? 'threshold' : null;

        $couponService = app(CouponService::class);
        $couponAmount = 0;
        $couponApplied = false;
        $couponReason = null;
        if ($validCoupon) {
            if ($couponService->isFreeShipping($validCoupon)) {
                $shipping = 0;
                $freeShippingReason = 'coupon';
                $couponApplied = true;
            } else {
                $couponAmount = self::millimes($couponService->computeDiscount(
                    $validCoupon, self::dt($goods), self::dt($shipping)
                )['discount_ht']);
                if ($couponAmount > $packAmount) {
                    $couponApplied = true;
                    $packAmount = 0;
                } else {
                    $couponReason = 'pack_better';
                }
            }
        }
        $commercial = $packAmount + $couponAmount * (int) $couponApplied;
        $ceilingPercent = (int) config('loyalty.checkout.max_total_discount_percent', 10);
        $ceiling = intdiv($goods * $ceilingPercent, 100);
        $room = max(0, $ceiling - $commercial);
        $pointsPerDt = max(1, (int) config('loyalty.points.points_per_dt', 20));
        $balance = max(0, $lockedBalance ?? 0);
        if ($requestedPoints > $balance) {
            throw new \DomainException('Solde Protina insuffisant');
        }
        $maxPoints = min($balance, intdiv($room * $pointsPerDt, 1000));
        $usedPoints = min(max(0, $requestedPoints), $maxPoints);
        $pointsMillimes = intdiv($usedPoints * 1000, $pointsPerDt);
        $goodsPaid = max(0, $goods - $commercial - $pointsMillimes);
        $totalDiscount = $commercial + $pointsMillimes;
        $next = $packService->nextTier(self::dt($goods));

        return [
            'goods_dt' => self::dt($goods),
            'full_price_goods_dt' => self::dt($fullPriceGoods),
            'pack' => ['percent' => $packPercent, 'amount_dt' => self::dt($packAmount), 'applied' => $packAmount > 0],
            'coupon' => [
                'code' => $validCoupon?->code,
                'type' => $validCoupon?->type,
                'amount_dt' => self::dt($couponAmount),
                'applied' => $couponApplied,
                'reason' => $couponReason,
            ],
            'free_shipping_reason' => $freeShippingReason,
            'ceiling_percent' => $ceilingPercent,
            'ceiling_dt' => self::dt($ceiling),
            'room_dt' => self::dt($room),
            'protinas' => [
                'balance' => $balance,
                'pending_welcome_points' => $pendingWelcomePoints,
                'max_usable_points' => $maxPoints,
                'max_usable_dt' => self::dt(intdiv($maxPoints * 1000, $pointsPerDt)),
                'used_points' => $usedPoints,
                'used_dt' => self::dt($pointsMillimes),
                'remaining_points' => $balance - $usedPoints,
            ],
            'shipping_dt' => self::dt($shipping),
            'total_discount_dt' => self::dt($totalDiscount),
            'total_discount_percent' => $goods > 0 ? round($totalDiscount * 100 / $goods, 3) : 0,
            'total_dt' => self::dt($goodsPaid + $shipping),
            'earn_on_delivery_points' => intdiv($goodsPaid * max(0, (int) config('loyalty.points.earn_per_dt', 1)), 1000),
            'next_pack_tier' => $next ? [
                'from_dt' => $next['threshold'], 'percent' => $next['percent'], 'remaining_dt' => $next['remaining'],
            ] : null,
        ];
    }

    /**
     * Programme goods (machines excluded) of a cart, in DT — what a v3 code's minimum is checked against.
     *
     * @param array<int, array{product: Product, quantity: int}> $lines
     */
    public static function programmeGoodsDt(array $lines): float
    {
        $sum = 0;
        foreach ($lines as $line) {
            if (! $line['product']->isLoyaltyExcluded()) {
                $sum += self::millimes($line['product']->getEffectiveUnitPrice()) * (int) $line['quantity'];
            }
        }

        return self::dt($sum);
    }

    /**
     * What an affiliate-attributed order will pay its affiliate on delivery, in millimes, for the
     * PROGRAMME lines — a cost of the order, so rule 6 takes it out of the budget before any pack,
     * code or gift (otherwise the giveaway spends the margin and the commission comes on top).
     *
     * Mirrors AffilieTransactionService::processOrderCommission(): the spread
     * Σ max(0, selling price − prix_affilie)·qty over lines that carry a prix_affilie (a pack, code
     * or Protinas never shrink it); when NO line of the order is priced, the service falls back to
     * the affiliate's rate on the cash base, bounded here by rate × programme goods. Machines are
     * outside the programme: their commission comes out of their own margin, as before v3.
     *
     * @param array<int, array{product: Product, quantity: int}> $lines
     */
    public static function affiliateCostMm(array $lines, ?Affilie $affilie): int
    {
        if ($affilie === null) {
            return 0;
        }
        $spread = 0;
        $programme = 0;
        $anyPriced = false;
        foreach ($lines as $line) {
            $product = $line['product'];
            $qty = max(0, (int) $line['quantity']);
            $raw = $product->getAttributes()['prix_affilie'] ?? null;
            $priced = $raw !== null && $raw !== '';
            $anyPriced = $anyPriced || $priced;
            if ($product->isLoyaltyExcluded()) {
                continue;
            }
            $price = self::millimes($product->getEffectiveUnitPrice());
            $programme += $price * $qty;
            if ($priced) {
                $spread += max(0, $price - self::millimes($raw)) * $qty;
            }
        }
        if (! $anyPriced) {
            $rateBasisPoints = max(0, (int) round($affilie->effectiveCommissionRate() * 100));

            return OrderBudget::ceilDiv($programme * $rateBasisPoints, 10000);
        }

        return $spread;
    }

    /**
     * Protinas v3 for real cart lines.
     *
     * @param array<int, array{product: Product, quantity: int}> $lines
     * @param Affilie|null $affilie the active affiliate the order is attributed to (affiliate_subdomain)
     * @return array{pricing: array<string, mixed>, internal: array<string, int|string|null|bool>}
     */
    public function priceV3(
        array $lines,
        ?Coupon $validCoupon,
        bool $packRequested,
        int $requestedEarnedPoints,
        bool $homeDelivery,
        ?ProtinaWallet $wallet = null,
        bool $useGift = true,
        ?Affilie $affilie = null,
    ): array {
        $programme = 0;
        $excluded = 0;
        $fullPriceProgramme = 0;
        $costedMargin = 0;
        $uncosted = 0;
        foreach ($lines as $line) {
            $product = $line['product'];
            $qty = (int) $line['quantity'];
            $unit = self::millimes($product->getEffectiveUnitPrice());
            $amount = $unit * $qty;
            if ($product->isLoyaltyExcluded()) {
                $excluded += $amount;
                continue;
            }
            $programme += $amount;
            if (! $product->hasActivePromo()) {
                $fullPriceProgramme += $amount;
            }
            // Stepped margin rate, never price − prix_achat itself: the capped amounts below are public.
            $margin = OrderBudget::costedMarginMm($product, $unit, $qty);
            if ($margin === null) {
                $uncosted += $amount;
            } else {
                $costedMargin += $margin;
            }
        }

        $packService = app(PackDiscountService::class);
        $packPercent = $packRequested ? $packService->percentForSubtotal(self::dt($programme)) : 0;
        $packBase = config('loyalty.pack.exclude_promo_lines', false) ? $fullPriceProgramme : $programme;
        $packAmount = (int) round($packBase * $packPercent / 100, 0, PHP_ROUND_HALF_UP);

        $coupon = null;
        if ($validCoupon) {
            $couponService = app(CouponService::class);
            $coupon = [
                'type' => $couponService->isFreeShipping($validCoupon) ? 'ship' : 'goods',
                'amount_mm' => $couponService->discountMillimes($validCoupon, $programme),
                'allow_over' => (bool) ($validCoupon->getAttributes()['allow_over_budget'] ?? false),
                'percent' => $validCoupon->type === Coupon::TYPE_PERCENT ? (float) $validCoupon->value : null,
                'fixed_dt' => $validCoupon->type === Coupon::TYPE_FIXED ? (float) $validCoupon->value : null,
            ];
        }

        $wallet ??= ProtinaWallet::empty();
        $r = $this->computeV3([
            'programme_mm' => $programme,
            'excluded_mm' => $excluded,
            'costed_margin_mm' => $costedMargin,
            'uncosted_mm' => $uncosted,
            'pack_percent' => $packPercent,
            'pack_amount_mm' => $packAmount,
            'coupon' => $coupon,
            'home_delivery' => $homeDelivery,
            'gift_usable' => $wallet->usableGift(),
            'earned_usable' => $wallet->usableEarned(),
            'requested_earned' => max(0, $requestedEarnedPoints),
            'use_gift' => $useGift,
            'cod_confirm' => $wallet->requiresCodConfirmation(),
            'phone_trusted' => $wallet->phoneTrusted,
            'affiliate_cost_mm' => self::affiliateCostMm($lines, $affilie),
        ]);

        $budget = $this->budget();
        $ppd = $budget->pointsPerDt();
        $next = $packService->nextTier(self::dt($programme));
        // An affiliate-attributed order reserves the commission inside the budget first, so the
        // generic thresholds (« en entier dès 180 DT », « s'applique en entier dès 60 DT ») do not hold
        // for it: none is published rather than a false one.
        $affiliateReduced = (int) ($r['affiliate_cost_mm'] ?? 0) > 0;
        $couponFullFrom = null;
        if ($coupon && $r['coupon_capped'] && ! $affiliateReduced) {
            $couponFullFrom = $coupon['percent'] !== null
                ? $budget->safePercentFromDt((int) ceil($coupon['percent']))
                : ($coupon['fixed_dt'] !== null ? $budget->safeFixedFrom($coupon['fixed_dt']) : null);
        }
        $usedPoints = $r['gift_points'] + $r['earned_points'];

        $pricing = [
            'rules_version' => 3,
            'goods_dt' => self::dt($r['goods_mm']),
            'programme_goods_dt' => self::dt($programme),
            'excluded_goods_dt' => self::dt($excluded),
            'full_price_goods_dt' => self::dt($fullPriceProgramme),
            'pack' => [
                'percent' => $packPercent,
                'amount_dt' => self::dt($r['pack_applied_mm']),
                'applied' => $r['pack_applied_mm'] > 0,
                'capped' => $r['pack_capped'],
                // Asked for, earned by the basket, and still nothing (the budget held it all back, not
                // a better code): the checkout says so instead of letting the promised −x % vanish.
                'reason' => $packAmount > 0 && $r['pack_applied_mm'] === 0 && ! $r['coupon_applied'] ? 'not_available' : null,
            ],
            'coupon' => [
                'code' => $validCoupon?->code,
                'type' => $validCoupon?->type,
                'amount_dt' => self::dt($r['coupon_applied_mm']),
                'applied' => $r['coupon_applied'],
                'capped' => $r['coupon_capped'],
                'reason' => $r['coupon_reason'],
                'min_goods_dt' => $r['coupon_reason'] === 'free_shipping_minimum' ? $budget->freeShippingCodeFromDt() : null,
                'full_from_dt' => $couponFullFrom,
            ],
            'free_shipping_reason' => $r['free_shipping_reason'],
            'shipping_gross_dt' => self::dt($r['shipping_gross_mm']),
            'shipping_dt' => self::dt($r['shipping_net_mm']),
            'protinas' => [
                'balance' => $wallet->total,
                'earned_spendable' => $wallet->earnedSpendable,
                'earned_pending' => $wallet->earnedPending,
                'pending_available_at' => $wallet->nextAvailableAt?->toIso8601String(),
                'gift_balance' => $wallet->gift,
                'gift_expires_at' => $wallet->giftExpiresAt?->toIso8601String(),
                'debt_points' => $wallet->debt,
                'gift_frozen_until' => $wallet->giftFrozenUntil?->toIso8601String(),
                'max_gift_points' => $r['max_gift_points'],
                'max_earned_points' => $r['max_earned_points'],
                'max_usable_points' => $r['gift_points'] + $r['max_earned_points'],
                'max_usable_dt' => self::dt(intdiv(($r['gift_points'] + $r['max_earned_points']) * 1000, $ppd)),
                'used_points' => $usedPoints,
                'used_gift_points' => $r['gift_points'],
                'used_earned_points' => $r['earned_points'],
                'used_dt' => self::dt($r['value_mm']),
                'used_gift_dt' => self::dt($r['gift_value_mm']),
                'used_earned_dt' => self::dt($r['earned_value_mm']),
                'used_on_shipping_dt' => self::dt($r['on_ship_mm']),
                'used_on_goods_dt' => self::dt($r['on_goods_mm']),
                'gift_applied' => $r['gift_points'] > 0,
                'gift_full_from_dt' => $affiliateReduced ? null : $budget->giftFullFromDt(),
                'gift_left_points' => max(0, $wallet->gift - $r['gift_points']),
                'remaining_points' => max(0, $wallet->total - $usedPoints),
                'blocked_reason' => $wallet->blockedReason,
                // Rule 17 without a long-verified phone: Protinas held under the confirmation thresholds.
                'limited_reason' => $r['phone_limited'] ? 'phone_not_trusted' : null,
                // …and the most they may pay on this order then (0: the cash floor leaves nothing).
                'limited_max_dt' => $r['phone_limited'] ? self::dt((int) $r['limited_max_mm']) : null,
                'phone_trusted_from' => $r['phone_limited'] ? $wallet->phoneTrustedFrom?->toIso8601String() : null,
                // Whether the gift wallet holds a welcome gift (the copy says « Cadeau de bienvenue » only then).
                'gift_has_welcome' => $wallet->giftHasWelcome,
            ],
            'savings_dt' => self::dt($r['savings_mm']),
            'total_discount_dt' => self::dt($r['discount_mm'] + $r['value_mm']),
            'total_dt' => self::dt($r['total_mm']),
            'earn_on_delivery_points' => $r['earn_points'],
            'earn_available_after_days' => max(0, (int) config('loyalty.points.earn_hold_days', 14)),
            'requires_phone_confirmation' => $r['requires_phone_confirmation'],
            'next_pack_tier' => $next ? [
                'from_dt' => $next['threshold'], 'percent' => $next['percent'], 'remaining_dt' => $next['remaining'],
            ] : null,
        ];

        return ['pricing' => $pricing, 'internal' => $r + ['wallet_unsplit' => $wallet->unsplit]];
    }

    /**
     * The v3 engine on integers only (millimes / points). Pure apart from configuration; the
     * property test drives it directly. Mirrors .claude/codex/briefs/protinas-v3-engine.py.
     *
     * @param array{programme_mm: int, excluded_mm: int, costed_margin_mm: int, uncosted_mm: int, pack_percent: int, pack_amount_mm: int, coupon: ?array{type: string, amount_mm: int, allow_over: bool}, home_delivery: bool, gift_usable: int, earned_usable: int, requested_earned: int, use_gift: bool, cod_confirm?: bool} $in
     * @return array<string, int|bool|string|null>
     */
    public function computeV3(array $in): array
    {
        $budget = $this->budget();
        $ppd = $budget->pointsPerDt();
        $earnRate = $budget->earnPerDt();
        $kept = max(0, $ppd - $earnRate);
        $P = max(0, (int) $in['programme_mm']);
        $X = max(0, (int) $in['excluded_mm']);
        $goods = $P + $X;
        $fee = $budget->deliveryFeeMm();
        $homeDelivery = (bool) $in['home_delivery'];
        $F = $homeDelivery && $P < $budget->freeDeliveryFromMm() ? $fee : 0;
        $packAmount = max(0, (int) $in['pack_amount_mm']);
        $coupon = $in['coupon'] ?? null;
        $guard = (bool) config('loyalty.coupons.margin_guard', true);
        // An affiliate-attributed order pays its commission on delivery: a cost, reserved first.
        $affiliateCost = max(0, (int) ($in['affiliate_cost_mm'] ?? 0));
        $budgetFor = fn (int $shipping): int => $budget->budgetFromTotals($P, (int) $in['costed_margin_mm'], (int) $in['uncosted_mm'], $shipping)
            - $affiliateCost;

        $couponReason = null;
        $couponApplied = false;
        $couponCapped = false;
        $couponAppliedMm = 0;
        $freeShippingReason = $homeDelivery && $F === 0 ? 'threshold' : null;
        $Feff = $F;

        if ($coupon !== null && $coupon['type'] === 'ship') {
            if ($F === 0) {
                $couponReason = $homeDelivery ? 'shipping_already_free' : null;
            } else {
                $budgetShip = $budgetFor(0);
                $packShip = min($packAmount, $budget->maxCommercial($budgetShip));
                $accepted = (bool) $coupon['allow_over'] || ! $guard
                    || $budgetShip - OrderBudget::ceilDiv($packShip * $kept, $ppd) >= 0;
                if ($accepted) {
                    $Feff = 0;
                    $couponApplied = true;
                    $freeShippingReason = 'coupon';
                } else {
                    $couponReason = 'free_shipping_minimum';
                }
            }
        }

        $A = $budgetFor($Feff);
        $dMax = $budget->maxCommercial($A);
        $packApplied = min($packAmount, $dMax);
        $packCapped = $packApplied < $packAmount;
        $D = $packApplied;
        $kind = $packApplied > 0 ? 'pack' : null;

        if ($coupon !== null && $coupon['type'] !== 'ship') {
            $c = max(0, (int) $coupon['amount_mm']);
            $honoured = (bool) $coupon['allow_over'] || ! $guard;
            $cC = $honoured ? $c : min($c, $dMax);
            if ($cC > $packApplied) {
                $D = $cC;
                $kind = 'coupon';
                $couponApplied = true;
                $couponAppliedMm = $cC;
                $couponCapped = $cC < $c;
                $packApplied = 0;
                $packCapped = false;
            } elseif ($packApplied > 0) {
                $couponReason = 'pack_better';
            } else {
                // Guarded to nothing on this basket: the code is not consumed. A code that computes to
                // nothing because the basket is machines (outside the programme) says so.
                $couponReason = $c > 0 ? 'budget' : ($X > 0 ? 'excluded_goods' : null);
                $couponCapped = $c > 0;
            }
        }

        $due = $goods - $D + $Feff;
        // What Protinas (gift + earned) may pay: earned_max_percent of the goods, the delivery when
        // cover_shipping, and never below min_cash at the door.
        $coverShipping = (bool) config('loyalty.points.cover_shipping', true);
        $maxPercent = max(0, min(100, (int) config('loyalty.points.earned_max_percent', 100)));
        $minCash = max(0, OrderBudget::millimes(config('loyalty.points.min_cash_dt', 0)));
        $payable = max(0, min($due - $minCash, intdiv(max(0, $goods - $D) * $maxPercent, 100) + ($coverShipping ? $Feff : 0)));

        // Rule 17 is answered by the account's verified phone. An account without one verified for
        // loyalty.cod.trusted_phone_days (email-only, or a number swapped in recently) may not let its
        // Protinas trigger the confirmation: they stay under the cash floor and the share.
        $confirmBelow = OrderBudget::millimes(config('loyalty.cod.confirm_below_cash_dt', 20));
        $share = max(0, (int) config('loyalty.cod.confirm_points_share_percent', 50));
        $phoneCapped = false;
        if (array_key_exists('phone_trusted', $in) && $in['phone_trusted'] === false && $due > 0) {
            $untriggered = max(0, min($due - $confirmBelow, OrderBudget::floorDiv($share * $due - 1, 100)));
            $phoneCapped = $untriggered < $payable;
            $payable = min($payable, $untriggered);
        }

        // Gift Protinas: only inside the budget left after the commercial discount.
        $room = $budget->giftRoom($A, $D);
        // Said to the customer only when the cap really holds Protinas back on this basket.
        $phoneLimited = $phoneCapped && intdiv((min(max(0, (int) $in['gift_usable']), intdiv($room * $ppd, 1000))
            + max(0, (int) $in['earned_usable'])) * 1000, $ppd) > $payable;
        $maxGiftPoints = min(max(0, (int) $in['gift_usable']), intdiv($room * $ppd, 1000), OrderBudget::ceilDiv($payable * $ppd, 1000));
        $giftPoints = ! empty($in['use_gift']) ? $maxGiftPoints : 0;
        $giftValue = min(intdiv($giftPoints * 1000, $ppd), $payable);

        // Earned Protinas: up to everything left; the last step rounds up (the shop absorbs ≤ 49 millimes).
        $rest = max(0, $payable - $giftValue);
        $restPoints = OrderBudget::ceilDiv($rest * $ppd, 1000);
        $maxEarnedPoints = min(max(0, (int) $in['earned_usable']), $restPoints);
        $earnedPoints = min(max(0, (int) $in['requested_earned']), $maxEarnedPoints);
        $earnedValue = min(intdiv($earnedPoints * 1000, $ppd), $rest);

        $value = $giftValue + $earnedValue;
        $onShip = $coverShipping ? min($Feff, $value) : 0;
        $onGoods = $value - $onShip;
        $earnBase = max(0, $P - $D - $onGoods);
        $earnPoints = intdiv($earnBase, 1000) * $earnRate;
        $total = $due - $value;
        $savings = $D + $value + ($homeDelivery ? $fee - $Feff : 0);

        // Rule 17: little cash at the door, or Protinas ≥ share % of the amount due → staff call the
        // account's verified phone before « Envoyer vers Aramex ». Repeat refusers: every order.
        $requiresConfirmation = ($due > 0 && ($total < $confirmBelow || $value * 100 >= $share * $due))
            || ! empty($in['cod_confirm']);

        return [
            'goods_mm' => $goods,
            'programme_mm' => $P,
            'excluded_mm' => $X,
            'shipping_gross_mm' => $F,
            'shipping_charged_mm' => $Feff,
            'shipping_net_mm' => $Feff - $onShip,
            'free_shipping_reason' => $freeShippingReason,
            'budget_mm' => $A,
            'max_commercial_mm' => $dMax,
            'pack_applied_mm' => $packApplied,
            'pack_capped' => $packCapped,
            'coupon_applied' => $couponApplied,
            'coupon_applied_mm' => $couponAppliedMm,
            'coupon_capped' => $couponCapped,
            'coupon_reason' => $couponReason,
            'discount_mm' => $D,
            'discount_kind' => $kind,
            'gift_room_mm' => $room,
            'due_mm' => $due,
            'max_gift_points' => $maxGiftPoints,
            'gift_points' => $giftPoints,
            'gift_value_mm' => $giftValue,
            'max_earned_points' => $maxEarnedPoints,
            'earned_points' => $earnedPoints,
            'earned_value_mm' => $earnedValue,
            'value_mm' => $value,
            'on_ship_mm' => $onShip,
            'on_goods_mm' => $onGoods,
            'earn_base_mm' => $earnBase,
            'earn_points' => $earnPoints,
            'total_mm' => $total,
            'savings_mm' => $savings,
            'requires_phone_confirmation' => $requiresConfirmation,
            'phone_limited' => $phoneLimited,
            'limited_max_mm' => $payable,
            'affiliate_cost_mm' => $affiliateCost,
        ];
    }
}
