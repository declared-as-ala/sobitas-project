<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PackDiscountService;
use Illuminate\Http\JsonResponse;

class LoyaltyRulesController extends Controller
{
    public function __invoke(PackDiscountService $pack): JsonResponse
    {
        $perDt = max(1, (int) config('loyalty.points.points_per_dt', 20));
        $seconds = max(0, (int) config('loyalty.rules_cache_seconds', 300));
        return response()->json([
            'points_per_dt' => $perDt,
            'earn_per_dt' => (int) config('loyalty.points.earn_per_dt', 1),
            'max_total_discount_percent' => (int) config('loyalty.checkout.max_total_discount_percent', 10),
            'pack' => [
                'tiers' => $pack->tiers(),
                'excludes_promo_lines' => (bool) config('loyalty.pack.exclude_promo_lines', true),
                'stacks_with_coupon' => false,
            ],
            'delivery' => [
                'fee_dt' => (float) config('loyalty.checkout.delivery_fee_dt', 10),
                'free_from_dt' => (float) config('loyalty.checkout.free_delivery_from_dt', 300),
            ],
            'welcome' => [
                'points' => (int) config('welcome_bonus.points', 300),
                'value_dt' => round((int) config('welcome_bonus.points', 300) / $perDt, 3),
                'unlock' => config('welcome_bonus.unlock_on_first_delivery', true) ? 'first_delivered_order' : 'phone_verification',
            ],
        ])->header('Cache-Control', 'public, max-age='.$seconds);
    }
}
