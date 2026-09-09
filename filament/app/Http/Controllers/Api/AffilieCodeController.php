<?php

namespace App\Http\Controllers\Api;

use App\Enums\AffilieCodeStatus;
use App\Enums\AffilieStatus;
use App\Http\Controllers\Controller;
use App\Models\AffilieCode;
use Illuminate\Http\JsonResponse;

/**
 * Public preview of a referral code, so the storefront can show "Code d'Ali — -10%" before checkout.
 *
 * ── THIS ENDPOINT DID NOT EXIST EITHER ───────────────────────────────────────────────────────
 * The storefront has been GETting `/partner-codes/{code}` and swallowing the 404 as "unknown
 * code", so every valid code looked invalid and no visitor ever saw what their referrer's code was
 * worth.
 *
 * ── WHAT IT DELIBERATELY DOES NOT RETURN ─────────────────────────────────────────────────────
 * The affiliate's `commission_rate`, their balance, their id, and the code's `used_count`. This is
 * an unauthenticated endpoint addressed by a short string; anything it returns is readable by
 * anyone willing to guess codes. `commission_rate` is the margin the shop pays, per affiliate —
 * publishing it would publish the whole programme's cost structure and let affiliates discover
 * they are on worse terms than each other. The customer needs the discount and a name to
 * recognise. That is all that is here.
 */
class AffilieCodeController extends Controller
{
    /** GET /api/affilie-codes/{code} */
    public function show(string $code): JsonResponse
    {
        $normalized = mb_strtoupper(trim($code));

        $affilieCode = AffilieCode::query()
            ->with('affilie:id,name,business_name,status')
            ->where('code', $normalized)
            ->where('status', AffilieCodeStatus::Active->value)
            ->first();

        // A suspended, rejected or still-pending affiliate's code must not preview as usable: the
        // preview is a promise to the customer, and the coupon layer will refuse it at checkout.
        if ($affilieCode === null
            || $affilieCode->affilie === null
            || $affilieCode->affilie->status !== AffilieStatus::Active) {
            return response()->json(['message' => 'Code introuvable.'], 404);
        }

        return response()->json([
            'code' => (string) $affilieCode->code,
            // 'percentage' | 'fixed' — the values AffilieCode::computeDiscountHt() branches on.
            'discount_type' => (string) ($affilieCode->discount_type ?? 'percentage'),
            'discount_value' => (float) $affilieCode->discount_value,
            // Trading name first: a gym would rather be "Fitness Park Lac" than its owner's name.
            'affilie_name' => (string) ($affilieCode->affilie->business_name ?: $affilieCode->affilie->name),
        ]);
    }
}
