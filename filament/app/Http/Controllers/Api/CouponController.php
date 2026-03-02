<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class CouponController extends Controller
{
    public function __construct(
        private CouponService $couponService
    ) {}

    /**
     * Apply a coupon to cart/order context.
     * Body: { code: string, subtotal_ht: number, frais_livraison?: number, client_id?: number, phone?: string, email?: string }
     * Returns updated totals and discount; uses generic message on invalid to avoid leaking existence.
     */
    public function apply(Request $request): JsonResponse
    {
        $key = 'coupon-apply:' . ($request->ip() ?? 'guest');
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives. Réessayez plus tard.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        $request->validate([
            'code' => ['required', 'string', 'max:64'],
            'subtotal_ht' => ['required', 'numeric', 'min:0'],
            'frais_livraison' => ['nullable', 'numeric', 'min:0'],
            'client_id' => ['nullable', 'integer'],
            'phone' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
        ]);

        $subtotal_ht = (float) $request->input('subtotal_ht');
        $frais_livraison = (float) ($request->input('frais_livraison') ?? 0);
        $client_id = $request->input('client_id') ? (int) $request->input('client_id') : null;
        $phone = $request->input('phone');
        $email = $request->input('email');

        $result = $this->couponService->validateCoupon(
            $request->input('code'),
            $subtotal_ht,
            $client_id,
            $phone,
            $email
        );

        if (! $result['valid']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 200);
        }

        $coupon = $result['coupon'];
        $discount = $this->couponService->computeDiscount($coupon, $subtotal_ht, $frais_livraison);
        $discount_ht = $discount['discount_ht'];
        $discount_ttc = $discount['discount_ttc'];

        $free_shipping = $this->couponService->isFreeShipping($coupon);
        $coordinate = \App\Models\Coordinate::getCached();
        $tvaRate = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 0;
        $timbre = $coordinate && isset($coordinate->timbre) ? (float) $coordinate->timbre : 0;

        $net_ht = $subtotal_ht - $discount_ht;
        $tva_amount = $net_ht * $tvaRate / 100;
        $shipping_after_coupon = $free_shipping ? 0 : $frais_livraison;
        $total_ttc = $net_ht + $tva_amount + $timbre + $shipping_after_coupon;

        return response()->json([
            'success' => true,
            'message' => 'Code promo appliqué.',
            'coupon' => [
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->value,
            ],
            'discount_ht' => round($discount_ht, 2),
            'discount_ttc' => round($discount_ttc, 2),
            'free_shipping' => $free_shipping,
            'totals' => [
                'subtotal_ht' => round($subtotal_ht, 2),
                'discount_ht' => round($discount_ht, 2),
                'net_ht' => round($net_ht, 2),
                'tva' => round($tva_amount, 2),
                'timbre' => round($timbre, 2),
                'frais_livraison' => round($shipping_after_coupon, 2),
                'total_ttc' => round($total_ttc, 2),
            ],
        ]);
    }

    /**
     * Remove applied coupon (stateless: just return totals without coupon).
     */
    public function remove(Request $request): JsonResponse
    {
        $request->validate([
            'subtotal_ht' => ['required', 'numeric', 'min:0'],
            'frais_livraison' => ['nullable', 'numeric', 'min:0'],
        ]);

        $subtotal_ht = (float) $request->input('subtotal_ht');
        $frais_livraison = (float) ($request->input('frais_livraison') ?? 0);
        $coordinate = \App\Models\Coordinate::getCached();
        $tvaRate = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 0;
        $timbre = $coordinate && isset($coordinate->timbre) ? (float) $coordinate->timbre : 0;

        $tva_amount = $subtotal_ht * $tvaRate / 100;
        $total_ttc = $subtotal_ht + $tva_amount + $timbre + $frais_livraison;

        return response()->json([
            'success' => true,
            'message' => 'Code promo retiré.',
            'coupon' => null,
            'discount_ht' => 0,
            'discount_ttc' => 0,
            'free_shipping' => false,
            'totals' => [
                'subtotal_ht' => round($subtotal_ht, 2),
                'discount_ht' => 0,
                'net_ht' => round($subtotal_ht, 2),
                'tva' => round($tva_amount, 2),
                'timbre' => round($timbre, 2),
                'frais_livraison' => round($frais_livraison, 2),
                'total_ttc' => round($total_ttc, 2),
            ],
        ]);
    }
}
