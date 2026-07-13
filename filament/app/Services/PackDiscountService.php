<?php

namespace App\Services;

/**
 * Single source of truth for the "pack" (bundle) tier discount.
 *
 * Tier table (applied on subtotal_ht in DT):
 *   subtotal_ht >= 200 DT  -> 5%
 *   subtotal_ht >= 350 DT  -> 8%
 *   subtotal_ht >= 500 DT  -> 12%
 *   otherwise              -> 0%
 *
 * The owner tunes the economy here; the frontend must mirror these numbers.
 */
class PackDiscountService
{
    /**
     * Ordered ascending by threshold. Kept as the ONE place the tiers live.
     *
     * @var array<int, array{threshold: float, percent: int}>
     */
    private const TIERS = [
        ['threshold' => 200.0, 'percent' => 5],
        ['threshold' => 350.0, 'percent' => 8],
        ['threshold' => 500.0, 'percent' => 12],
    ];

    /**
     * Discount percent (0, 5, 8 or 12) for a given HT subtotal.
     */
    public function percentForSubtotal(float $subtotalHt): int
    {
        $percent = 0;
        foreach (self::TIERS as $tier) {
            if ($subtotalHt >= $tier['threshold']) {
                $percent = $tier['percent'];
            }
        }

        return $percent;
    }

    /**
     * Discount amount in DT, rounded to 3 decimals.
     */
    public function amountForSubtotal(float $subtotalHt): float
    {
        if ($subtotalHt <= 0) {
            return 0.0;
        }

        $percent = $this->percentForSubtotal($subtotalHt);

        return round($subtotalHt * $percent / 100, 3);
    }

    /**
     * The next tier the cart could reach, or null if already at the top tier.
     *
     * @return array{threshold: float, percent: int, remaining: float}|null
     */
    public function nextTier(float $subtotalHt): ?array
    {
        foreach (self::TIERS as $tier) {
            if ($subtotalHt < $tier['threshold']) {
                return [
                    'threshold' => (float) $tier['threshold'],
                    'percent'   => (int) $tier['percent'],
                    'remaining' => round($tier['threshold'] - $subtotalHt, 3),
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
