<?php

$defaultTiers = [
    ['from_dt' => 200, 'percent' => 3],
    ['from_dt' => 350, 'percent' => 5],
    ['from_dt' => 500, 'percent' => 7],
];
$tiers = $defaultTiers;
$rawTiers = env('PACK_TIERS');
if ($rawTiers !== null) {
    $parsed = [];
    foreach (explode(',', (string) $rawTiers) as $part) {
        if (! preg_match('/^\s*(\d+):(\d+)\s*$/', $part, $matches)
            || (int) $matches[1] <= 0 || (int) $matches[2] > 100) {
            $parsed = [];
            break;
        }
        $parsed[] = ['from_dt' => (int) $matches[1], 'percent' => (int) $matches[2]];
    }
    if ($parsed && count(array_unique(array_column($parsed, 'from_dt'))) === count($parsed)) {
        usort($parsed, fn ($a, $b) => $a['from_dt'] <=> $b['from_dt']);
        $tiers = $parsed;
    } else {
        error_log('Invalid PACK_TIERS; using default pack tiers.');
    }
}

return [
    'checkout' => [
        'max_total_discount_percent' => (int) env('LOYALTY_MAX_DISCOUNT_PERCENT', 10),
        'delivery_fee_dt' => (float) env('DELIVERY_FEE_DT', 10),
        'free_delivery_from_dt' => (float) env('FREE_DELIVERY_FROM_DT', 300),
        'total_mismatch_tolerance_dt' => (float) env('CHECKOUT_TOTAL_TOLERANCE_DT', 0.01),
        'quote_throttle_per_minute' => (int) env('CHECKOUT_QUOTE_THROTTLE', 60),
    ],
    'pack' => [
        'tiers' => $tiers,
        'exclude_promo_lines' => (bool) env('PACK_EXCLUDE_PROMO_LINES', true),
    ],
    'points' => [
        'earn_per_dt' => (int) env('PROTINAS_EARN_PER_DT', 1),
        'points_per_dt' => (int) env('PROTINAS_PER_DT', 20),
    ],
    'rules_cache_seconds' => (int) env('LOYALTY_RULES_CACHE_SECONDS', 300),
    'till' => [
        'earn_per_dt' => (int) env('TILL_EARN_PER_DT', 1),
        'points_per_dt' => (int) env('TILL_POINTS_PER_DT', 20),
        'max_total_discount_percent' => (int) env('TILL_MAX_DISCOUNT_PERCENT', 10),
        'min_redeem_points' => (int) env('TILL_MIN_REDEEM_POINTS', 100),
    ],
    'coupons' => ['warn_above_percent' => (float) env('COUPON_WARN_ABOVE_PERCENT', 10)],
];
