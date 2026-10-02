<?php

namespace App\Services;

/**
 * Single source of truth for the "pack" (bundle) tier discount.
 *
 * Default tiers (selected using gross goods, configured in loyalty.pack.tiers):
 *   subtotal_ht >= 200 DT  -> 3%
 *   subtotal_ht >= 350 DT  -> 5%
 *   subtotal_ht >= 500 DT  -> 7%
 *   otherwise              -> 0%
 *
 * Pack is applied only to full-price lines by CheckoutPricingService.
 */
class PackDiscountService
{
    /**
     * Compatibility alias; runtime tiers live in config/loyalty.php.
     *
     * @var array<int, array{threshold: float, percent: int}>
     */
    public const TIERS = [
        ['from_dt' => 200, 'percent' => 3],
        ['from_dt' => 350, 'percent' => 5],
        ['from_dt' => 500, 'percent' => 7],
    ];

    public function tiers(): array
    {
        return config('loyalty.pack.tiers', self::TIERS);
    }

    /**
     * Discount percent for a given goods subtotal.
     */
    public function percentForSubtotal(float $subtotalHt): int
    {
        $percent = 0;
        foreach ($this->tiers() as $tier) {
            if ($subtotalHt >= $tier['from_dt']) {
                $percent = $tier['percent'];
            }
        }

        return $percent;
    }

    /**
     * Discount amount in DT, rounded to 3 decimals.
     */
    public function amountForSubtotal(float $subtotalHt, ?float $fullPriceSubtotalHt = null): float
    {
        if ($subtotalHt <= 0) {
            return 0.0;
        }

        $percent = $this->percentForSubtotal($subtotalHt);

        $base = config('loyalty.pack.exclude_promo_lines', true)
            ? ($fullPriceSubtotalHt ?? $subtotalHt) : $subtotalHt;
        return round($base * $percent / 100, 3);
    }

    /**
     * The next tier the cart could reach, or null if already at the top tier.
     *
     * @return array{threshold: float, percent: int, remaining: float}|null
     */
    public function nextTier(float $subtotalHt): ?array
    {
        foreach ($this->tiers() as $tier) {
            if ($subtotalHt < $tier['from_dt']) {
                return [
                    'threshold' => (float) $tier['from_dt'],
                    'percent'   => (int) $tier['percent'],
                    'remaining' => round($tier['from_dt'] - $subtotalHt, 3),
                ];
            }
        }

        return null;
    }

    /**
     * Human label like "-8%" or null when there is no discount.
     */
    public function label(int $percent): ?string
    {
        return $percent > 0 ? '-' . $percent . '%' : null;
    }
}
