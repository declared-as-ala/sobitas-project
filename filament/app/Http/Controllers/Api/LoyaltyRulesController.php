<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckoutPricingService;
use App\Services\OrderBudget;
use App\Services\PackDiscountService;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/loyalty/rules — the customer-facing rules the storefront copy is built from.
 *
 * Never publishes the order budget (margin floor, courier cost, safety amount, purchase costs):
 * only thresholds DERIVED from it that the copy needs (« les 15 DT en entier dès 180 DT »).
 * The response carries `version` and varies its ETag with it, so a cache never serves v2 rules
 * once v3 is live (there is no server-side cache of this endpoint, only HTTP max-age).
 */
class LoyaltyRulesController extends Controller
{
    public function __invoke(PackDiscountService $pack, OrderBudget $budget): JsonResponse
    {
        $perDt = max(1, (int) config('loyalty.points.points_per_dt', 20));
        $seconds = max(0, (int) config('loyalty.rules_cache_seconds', 300));
        $version = CheckoutPricingService::rulesVersion();
        $feeDt = (float) config('loyalty.checkout.delivery_fee_dt', 10);
        $welcomePoints = (int) config('welcome_bonus.points', 300);
        $welcome = [
            'points' => $welcomePoints,
            'value_dt' => round($welcomePoints / $perDt, 3),
            'unlock' => config('welcome_bonus.unlock_on_first_delivery', false) ? 'first_delivered_order' : 'phone_verification',
        ];

        if ($version < 3) {
            $payload = [
                'version' => 2,
                'points_per_dt' => $perDt,
                'earn_per_dt' => (int) config('loyalty.points.earn_per_dt', 1),
                'max_total_discount_percent' => (int) config('loyalty.checkout.max_total_discount_percent', 10),
                'pack' => [
                    'tiers' => $pack->tiers(),
                    'excludes_promo_lines' => (bool) config('loyalty.pack.exclude_promo_lines', false),
                    'stacks_with_coupon' => false,
                ],
                'delivery' => [
                    'fee_dt' => $feeDt,
                    'free_from_dt' => (float) config('loyalty.checkout.free_delivery_from_dt', 300),
                ],
                'welcome' => $welcome,
            ];
        } else {
            $giftDays = max(0, (int) config('loyalty.gift.valid_days', 60));
            $earnedMaxPercent = max(0, min(100, (int) config('loyalty.points.earned_max_percent', 100)));
            $payload = [
                'version' => 3,
                'points_per_dt' => $perDt,
                'earn_per_dt' => (int) config('loyalty.points.earn_per_dt', 1),
                // Not read by the v3 storefront. Kept for bundles built before v3 (a tab left open over
                // the deploy, or the backend landing before the storefront): they print « Protinas :
                // jusqu'à {x} % de vos articles » from it, and without it they printed « jusqu'à  % ».
                // Earned Protinas really do pay up to this share, so the old sentence stays true.
                'max_total_discount_percent' => $earnedMaxPercent,
                'earned' => [
                    'max_percent' => $earnedMaxPercent,
                    'cover_shipping' => (bool) config('loyalty.points.cover_shipping', true),
                    'hold_days' => max(0, (int) config('loyalty.points.earn_hold_days', 14)),
                    'min_cash_dt' => (float) config('loyalty.points.min_cash_dt', 0),
                    'expires' => false,
                ],
                'gift' => [
                    'full_from_dt' => $budget->giftFullFromDt($welcomePoints),
                    'valid_days' => $giftDays,
                    'expires' => $giftDays > 0,
                    'auto_apply' => (bool) config('loyalty.gift.auto_apply', true),
                ],
                'pack' => [
                    'tiers' => $pack->tiers(),
                    'excludes_promo_lines' => (bool) config('loyalty.pack.exclude_promo_lines', false),
                    'stacks_with_coupon' => false,
                ],
                'delivery' => [
                    'fee_dt' => $feeDt,
                    'free_from_dt' => (float) config('loyalty.checkout.free_delivery_from_dt', 300),
                    'points' => (int) round($feeDt * $perDt),
                ],
                'coupons' => [
                    'free_shipping_from_dt' => $budget->freeShippingCodeFromDt(),
                ],
                'welcome' => $welcome,
                'refusal' => [
                    'forfeit_points' => max(0, (int) config('loyalty.refusal.forfeit_points', 400)),
                ],
                // Rule 17: how long a phone must have been verified before Protinas pay half an order.
                // and the cash that must stay due at the door until then (the hint quotes it).
                'cod' => [
                    'trusted_phone_days' => max(0, (int) config('loyalty.cod.trusted_phone_days', 14)),
                    'confirm_below_cash_dt' => (float) config('loyalty.cod.confirm_below_cash_dt', 20),
                ],
                // Rule 19: the cart, product page and search leave these out of free delivery, the
                // pack tiers and the earn line, exactly as the checkout quote does.
                'program' => [
                    'excluded_subcategory_slugs' => array_values(array_filter(array_map(
                        static fn ($slug) => strtolower(trim((string) $slug)),
                        (array) config('loyalty.program.excluded_subcategory_slugs', [])
                    ))),
                ],
            ];
        }

        return response()->json($payload)
            ->header('Cache-Control', 'public, max-age='.$seconds)
            ->header('ETag', '"loyalty-rules-v'.$payload['version'].'-'.substr(sha1((string) json_encode($payload)), 0, 16).'"');
    }
}
