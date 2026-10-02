<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Product;

/** Read-only checkout arithmetic. All intermediate amounts are integer millimes. */
class CheckoutPricingService
{
    public static function millimes(float|int|string $dt): int
    {
        return (int) round((float) $dt * 1000, 0, PHP_ROUND_HALF_UP);
    }

    private static function dt(int $millimes): float
    {
        return round($millimes / 1000, 3);
    }

    /**
     * @param array<int, array{product: Product, quantity: int}> $lines
     */
    public function price(
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
}
