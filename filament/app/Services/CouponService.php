<?php

namespace App\Services;

use App\Enums\AffilieAppliesChannel;
use App\Models\Coordinate;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use Illuminate\Support\Carbon;

class CouponService
{
    /**
     * Normalize code: trim and uppercase for case-insensitive lookup.
     */
    public function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    /**
     * Validate coupon and return [valid: bool, message: string, coupon: ?Coupon].
     * Context: subtotal_ht (sum of line items HT), client_id (nullable), phone, email.
     * min_order_amount is checked against subtotal_ht (HT base).
     */
    public function validateCoupon(
        string $code,
        float $subtotal_ht,
        ?int $client_id = null,
        ?string $phone = null,
        ?string $email = null
    ): array {
        $normalized = $this->normalizeCode($code);
        $coupon = Coupon::whereRaw('UPPER(TRIM(code)) = ?', [$normalized])->first();

        if (! $coupon) {
            return ['valid' => false, 'message' => __('Code promo invalide ou expiré.'), 'coupon' => null];
        }

        if (! $coupon->is_active) {
            return ['valid' => false, 'message' => __('Ce code promo n\'est plus actif.'), 'coupon' => null];
        }

        if ($coupon->is_affilie_code) {
            $channel = $coupon->applies_channel instanceof AffilieAppliesChannel
                ? $coupon->applies_channel
                : (AffilieAppliesChannel::tryFrom((string) ($coupon->applies_channel ?? 'website')) ?? AffilieAppliesChannel::Website);

            if (! $channel->allowsWebsite()) {
                return ['valid' => false, 'message' => __('Ce code est réservé à la boutique.'), 'coupon' => null];
            }
        }

        $now = Carbon::now();
        if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
            return ['valid' => false, 'message' => __('Ce code promo n\'est pas encore valide.'), 'coupon' => null];
        }
        if ($coupon->ends_at && $now->gt($coupon->ends_at)) {
            return ['valid' => false, 'message' => __('Ce code promo a expiré.'), 'coupon' => null];
        }

        if ($coupon->min_order_amount !== null && $subtotal_ht < (float) $coupon->min_order_amount) {
            return [
                'valid' => false,
                'message' => __('Montant minimum de commande : :amount TND (HT).', ['amount' => number_format($coupon->min_order_amount, 2)]),
                'coupon' => null,
            ];
        }

        if ($coupon->usage_limit_total !== null) {
            $used = CouponRedemption::where('coupon_id', $coupon->id)->count();
            if ($used >= $coupon->usage_limit_total) {
                return ['valid' => false, 'message' => __('Ce code a atteint sa limite d\'utilisation.'), 'coupon' => null];
            }
        }

        if ($coupon->usage_limit_per_client !== null) {
            $query = CouponRedemption::where('coupon_id', $coupon->id);
            if ($client_id) {
                $query->where('client_id', $client_id);
            } else {
                if ($phone) {
                    $query->where('phone_snapshot', $this->normalizePhone($phone));
                } elseif ($email) {
                    $query->where('email_snapshot', $email);
                } else {
                    return ['valid' => false, 'message' => __('Identifiant client requis pour ce code.'), 'coupon' => null];
                }
            }
            if ($query->count() >= $coupon->usage_limit_per_client) {
                return ['valid' => false, 'message' => __('Vous avez déjà utilisé ce code le nombre maximum de fois.'), 'coupon' => null];
            }
        }

        return ['valid' => true, 'message' => '', 'coupon' => $coupon];
    }

    /**
     * Compute discount for a coupon given totals.
     * Accounting: discount applied to HT first; TVA is computed on net HT.
     * Returns ['discount_ht' => float, 'discount_ttc' => float].
     * For percent: base = subtotal_ht, cap by max_discount_amount if set.
     * Rules v3 passes PROGRAMME goods as the base (machines excluded) and prices in millimes through
     * discountMillimes(); this float form stays for the v2 path and the admin documents.
     */
    public function computeDiscount(Coupon $coupon, float $subtotal_ht, float $frais_livraison = 0): array
    {
        $discount_ht = 0.0;

        switch ($coupon->type) {
            case Coupon::TYPE_PERCENT:
                $discount_ht = $subtotal_ht * ((float) $coupon->value / 100);
                if ($coupon->max_discount_amount !== null) {
                    $discount_ht = min($discount_ht, (float) $coupon->max_discount_amount);
                }
                break;
            case Coupon::TYPE_FIXED:
                $discount_ht = min((float) $coupon->value, $subtotal_ht);
                break;
            case Coupon::TYPE_FREE_SHIPPING:
                $discount_ht = 0;
                // Caller can treat free_shipping by zeroing frais_livraison instead of discount_ht
                break;
            default:
                $discount_ht = $subtotal_ht * ((float) $coupon->value / 100);
                if ($coupon->max_discount_amount !== null) {
                    $discount_ht = min($discount_ht, (float) $coupon->max_discount_amount);
                }
        }

        $discount_ht = round($discount_ht, 2);
        $coordinate = Coordinate::getCached();
        $tvaRate = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 0;
        $discount_ttc = $discount_ht + ($discount_ht * $tvaRate / 100);
        $discount_ttc = round($discount_ttc, 2);

        return ['discount_ht' => $discount_ht, 'discount_ttc' => $discount_ttc];
    }

    /**
     * Protinas v3: the code's amount in integer millimes on $baseMm (programme goods only — machines
     * never carry a code). Floors, so a rounding never gives away a millime the code did not promise.
     * Free-delivery codes return 0 (the caller zeroes the delivery fee instead).
     */
    public function discountMillimes(Coupon $coupon, int $baseMm): int
    {
        $baseMm = max(0, $baseMm);
        $value = max(0.0, (float) $coupon->value);
        switch ($coupon->type) {
            case Coupon::TYPE_FREE_SHIPPING:
                return 0;
            case Coupon::TYPE_FIXED:
                return min((int) round($value * 1000, 0, PHP_ROUND_HALF_UP), $baseMm);
            case Coupon::TYPE_PERCENT:
            default:
                $amount = (int) floor($baseMm * $value / 100 + 1e-6);
                if ($coupon->max_discount_amount !== null) {
                    $amount = min($amount, (int) round((float) $coupon->max_discount_amount * 1000, 0, PHP_ROUND_HALF_UP));
                }

                return max(0, min($amount, $baseMm));
        }
    }

    /** The TTC figure stored beside a (possibly budget-capped) coupon discount_ht, same rule as computeDiscount(). */
    public function discountTtc(float $discountHt): float
    {
        $coordinate = Coordinate::getCached();
        $tvaRate = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 0;

        return round($discountHt + ($discountHt * $tvaRate / 100), 2);
    }

    /**
     * For free_shipping: return whether coupon applies; caller zeroes shipping.
     */
    public function isFreeShipping(Coupon $coupon): bool
    {
        return $coupon->type === Coupon::TYPE_FREE_SHIPPING;
    }

    private function normalizePhone(?string $phone): string
    {
        if ($phone === null || $phone === '') {
            return '';
        }
        return preg_replace('/\D/', '', $phone);
    }
}
