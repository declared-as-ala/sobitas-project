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

$excludedSubcategories = array_values(array_filter(array_map('trim', explode(',',
    (string) env('LOYALTY_EXCLUDED_SUBCATEGORIES', 'materiel-de-musculation,cardio-fitness')))));
$reminderDays = array_values(array_filter(array_map('intval', explode(',',
    (string) env('PROTINAS_GIFT_REMINDER_DAYS', '7,1'))), fn (int $d) => $d > 0));

return [
    /*
     * 3 = Protinas v3 (two wallets, hidden order budget, points up to 100 % + delivery).
     * 2 = the 02/10/2026 rules (10 % ceiling), kept byte-identical for an instant rollback.
     * Code default IS the launch value (nobody edits the VPS .env from the repo).
     */
    'rules_version' => (int) env('LOYALTY_RULES_VERSION', 3),
    'checkout' => [
        // v2 only. v3 has no visible ceiling: the hidden order budget (below) bounds every giveaway.
        'max_total_discount_percent' => (int) env('LOYALTY_MAX_DISCOUNT_PERCENT', 10),
        'delivery_fee_dt' => (float) env('DELIVERY_FEE_DT', 10),
        'free_delivery_from_dt' => (float) env('FREE_DELIVERY_FROM_DT', 300),
        'total_mismatch_tolerance_dt' => (float) env('CHECKOUT_TOTAL_TOLERANCE_DT', 0.01),
        'quote_throttle_per_minute' => (int) env('CHECKOUT_QUOTE_THROTTLE', 60),
    ],
    /*
     * ⚠️ NEVER SENT TO ANY API. A = (m − earn)·P + F − K − S is the most the shop gives away on one
     * order (pack or code + gift Protinas); every giveaway order still nets ≥ S at a real margin ≥ m.
     * Products with `prix_achat` filled use their real margin instead of m.
     */
    'budget' => [
        'margin_floor_percent' => (float) env('LOYALTY_MARGIN_FLOOR_PERCENT', 15),
        'courier_cost_dt' => (float) env('LOYALTY_COURIER_COST_DT', 10),
        'safety_dt' => (float) env('LOYALTY_SAFETY_DT', 3),
    ],
    'pack' => [
        'tiers' => $tiers,
        // v3 launch value: promo lines get the pack discount too (the promo price is the real price).
        'exclude_promo_lines' => (bool) env('PACK_EXCLUDE_PROMO_LINES', false),
    ],
    'points' => [
        'earn_per_dt' => (int) env('PROTINAS_EARN_PER_DT', 1),
        'points_per_dt' => (int) env('PROTINAS_PER_DT', 20),
        // v3: earned Protinas pay up to this share of the products, plus the delivery when allowed.
        'earned_max_percent' => (int) env('PROTINAS_EARNED_MAX_PERCENT', 100),
        'cover_shipping' => (bool) env('PROTINAS_COVER_SHIPPING', true),
        'min_cash_dt' => (float) env('PROTINAS_MIN_CASH_DT', 0),
        'earn_hold_days' => (int) env('PROTINAS_EARN_HOLD_DAYS', 14),
    ],
    'gift' => [
        // 0 = gifts never expire. Gifts that existed before v3 never expire whatever this says.
        'valid_days' => (int) env('PROTINAS_GIFT_VALID_DAYS', 60),
        'refund_grace_days' => (int) env('PROTINAS_GIFT_REFUND_GRACE_DAYS', 7),
        'reminder_days' => $reminderDays ?: [7, 1],
        'sms_reminders' => (bool) env('PROTINAS_SMS_REMINDERS', false),
        'auto_apply' => (bool) env('PROTINAS_GIFT_AUTO_APPLY', true),
    ],
    'refusal' => [
        'forfeit_points' => (int) env('PROTINAS_REFUSAL_FORFEIT_POINTS', 400),
        'freeze_after' => (int) env('PROTINAS_REFUSAL_FREEZE_AFTER', 2),
        'window_days' => (int) env('PROTINAS_REFUSAL_WINDOW_DAYS', 90),
        'freeze_days' => (int) env('PROTINAS_REFUSAL_FREEZE_DAYS', 90),
    ],
    'cod' => [
        'confirm_below_cash_dt' => (float) env('PROTINAS_CONFIRM_BELOW_CASH_DT', 20),
        'confirm_points_share_percent' => (int) env('PROTINAS_CONFIRM_POINTS_SHARE', 50),
        // Rule 17 calls the account's verified phone. Until a phone has been verified this many days
        // (email-only accounts: never), an order's Protinas stay under the two thresholds above, so a
        // stolen account cannot answer its own confirmation call with a freshly verified SIM.
        'trusted_phone_days' => (int) env('PROTINAS_TRUSTED_PHONE_DAYS', 14),
    ],
    'program' => [
        // Machines: no pack, no gift, no earning, and they do not count toward the tiers or free delivery.
        'excluded_subcategory_slugs' => $excludedSubcategories,
    ],
    'rules_cache_seconds' => (int) env('LOYALTY_RULES_CACHE_SECONDS', 300),
    'till' => [
        'earn_per_dt' => (int) env('TILL_EARN_PER_DT', 1),
        'points_per_dt' => (int) env('TILL_POINTS_PER_DT', 20),
        'max_total_discount_percent' => (int) env('TILL_MAX_DISCOUNT_PERCENT', 10),
        'min_redeem_points' => (int) env('TILL_MIN_REDEEM_POINTS', 100),
    ],
    'coupons' => [
        'warn_above_percent' => (float) env('COUPON_WARN_ABOVE_PERCENT', 10),
        // v3: a code is capped to the order budget unless the code itself has allow_over_budget.
        'margin_guard' => (bool) env('COUPON_MARGIN_GUARD', true),
    ],
];
