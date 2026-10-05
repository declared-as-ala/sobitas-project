<?php

namespace App\Services;

use App\Models\Product;

/**
 * The hidden per-order budget of Protinas v3. Integer millimes throughout.
 *
 *   A = Σ costed ⌊rate⌋·price·qty + (m·uncosted − 100·e/ppd·P) / 100 + F − K − S
 *       rate = (price − prix_achat·(1 + TVA)) / price, rounded down to a 5 % step (costedMarginMm)
 *
 *   P  programme goods at their real (promo) price — machines are never in here
 *   m  loyalty.budget.margin_floor_percent (used for every line without a prix_achat)
 *   e  the earn reserve: earn_per_dt points per DT, each worth 1000/ppd millimes
 *   F  delivery fee actually charged (0 when free or a free-delivery code applies)
 *   K  courier cost per trip, S safety amount
 *
 *   pack or code  ≤ maxCommercial(A) = A·ppd/(ppd − e)
 *   gift          ≤ giftRoom(A, D)   = A − ⌈D·(ppd − e)/ppd⌉
 *
 * so every order that receives a giveaway still nets ≥ S when the real margin is at least m.
 *
 * ⚠️ NOTHING IN HERE MAY REACH A CUSTOMER. A, m, K, S and prix_achat are never serialised by an
 * API. The only public outputs are the derived thresholds (giftFullFromDt, freeShippingCodeFromDt),
 * which the storefront needs for its copy and which the spec publishes on /loyalty/rules.
 * Every rounding goes the shop's way (floor on what the shop gives, ceil on what it reserves).
 */
class OrderBudget
{
    /** Upper bound (DT) of the basket scan used by the admin thresholds below. */
    public const SCAN_HORIZON_DT = 5000;

    public static function millimes(float|int|string $dt): int
    {
        return (int) round((float) $dt * 1000, 0, PHP_ROUND_HALF_UP);
    }

    public static function floorDiv(int $a, int $b): int
    {
        $q = intdiv($a, $b);
        if (($a % $b !== 0) && (($a < 0) !== ($b < 0))) {
            $q--;
        }

        return $q;
    }

    public static function ceilDiv(int $a, int $b): int
    {
        return -self::floorDiv(-$a, $b);
    }

    // ── Configuration (read every call: tests and config:cache both stay honest) ─────────────

    /** Margin floor in basis points (15 % → 1500), so a fractional floor such as 13.5 stays exact. */
    public function marginFloorBasisPoints(): int
    {
        return max(0, (int) round((float) config('loyalty.budget.margin_floor_percent', 15) * 100));
    }

    public function courierMm(): int
    {
        return max(0, self::millimes(config('loyalty.budget.courier_cost_dt', 10)));
    }

    public function safetyMm(): int
    {
        return max(0, self::millimes(config('loyalty.budget.safety_dt', 3)));
    }

    public function pointsPerDt(): int
    {
        return max(1, (int) config('loyalty.points.points_per_dt', 20));
    }

    public function earnPerDt(): int
    {
        return max(0, (int) config('loyalty.points.earn_per_dt', 1));
    }

    public function deliveryFeeMm(): int
    {
        return max(0, self::millimes(config('loyalty.checkout.delivery_fee_dt', 10)));
    }

    public function freeDeliveryFromMm(): int
    {
        return max(0, self::millimes(config('loyalty.checkout.free_delivery_from_dt', 300)));
    }

    /**
     * Percentage step (basis points) a costed line's margin rate is rounded DOWN to before it enters
     * A. A capped code, pack or gift on the public quote is A in another form: with each line's exact
     * price − prix_achat, one quote on one product gave its purchase price back to the millime. Stepped,
     * a quote only tells which 5 % band the margin falls in, and the shop keeps up to one step more.
     */
    public const COSTED_MARGIN_STEP_BP = 500;

    /** VAT added to prix_achat, in basis points: Coordinate tva (the shop's invoice rate), 19 % when unset. */
    public static function vatBasisPoints(): int
    {
        $rate = 19.0;
        try {
            $tva = \App\Models\Coordinate::getCached()?->tva;
            if ($tva !== null && $tva !== '' && is_numeric($tva)) {
                $rate = max(0.0, (float) $tva);
            }
        } catch (\Throwable) {
            // No coordinates table (partial installs, test schemas): the standard rate.
        }

        return (int) round($rate * 100);
    }

    /**
     * The real unit cost of a product in millimes, VAT INCLUDED like every price A is built on, or
     * null when unknown (the floor m applies).
     *
     * products.prix_achat is typed HT, as on the supplier's invoice (the admin field says so), and
     * the VAT is added here, rounded up. A cost typed TTC by mistake then only counts 19 % too high —
     * a smaller budget, never a giveaway the margin cannot pay for.
     */
    public static function costMm(Product $product): ?int
    {
        $attributes = $product->getAttributes();
        if (! array_key_exists('prix_achat', $attributes) || $attributes['prix_achat'] === null || $attributes['prix_achat'] === '') {
            return null;
        }
        $costHt = self::millimes($attributes['prix_achat']);
        if ($costHt <= 0) {
            return null; // 0 is an empty cell, not a free product
        }

        return self::ceilDiv($costHt * (10000 + self::vatBasisPoints()), 10000);
    }

    /**
     * The margin a costed line brings into A (millimes), or null when the product has no prix_achat
     * (its goods then count at the floor m). (price − cost) / price is rounded DOWN to a whole
     * COSTED_MARGIN_STEP_BP before it is applied to the line, so A never echoes a purchase price.
     */
    public static function costedMarginMm(Product $product, int $unitPriceMm, int $quantity): ?int
    {
        $cost = self::costMm($product);
        if ($cost === null) {
            return null;
        }
        $quantity = max(0, $quantity);
        if ($unitPriceMm <= 0) {
            return -$cost * $quantity;
        }
        $rateBp = self::floorDiv(($unitPriceMm - $cost) * 10000, $unitPriceMm);
        $steppedBp = self::floorDiv($rateBp, self::COSTED_MARGIN_STEP_BP) * self::COSTED_MARGIN_STEP_BP;

        return self::floorDiv($unitPriceMm * $quantity * $steppedBp, 10000);
    }

    // ── The budget ────────────────────────────────────────────────────────────────────────────

    /**
     * @param array<int, array{product: Product, quantity: int}> $programmeLines lines that ARE in the
     *        programme (Product::isLoyaltyExcluded() false), priced at getEffectiveUnitPrice()
     */
    public function budget(array $programmeLines, int $shippingChargedMm): int
    {
        $goods = 0;
        $costedMargin = 0;
        $uncosted = 0;
        foreach ($programmeLines as $line) {
            $product = $line['product'];
            $qty = (int) $line['quantity'];
            $unit = self::millimes($product->getEffectiveUnitPrice());
            $amount = $unit * $qty;
            $goods += $amount;
            $margin = self::costedMarginMm($product, $unit, $qty);
            if ($margin === null) {
                $uncosted += $amount;
            } else {
                $costedMargin += $margin;
            }
        }

        return $this->budgetFromTotals($goods, $costedMargin, $uncosted, $shippingChargedMm);
    }

    /** Pure form of budget(): the same A from pre-summed integer millimes. */
    public function budgetFromTotals(int $programmeGoodsMm, int $costedMarginMm, int $uncostedGoodsMm, int $shippingChargedMm): int
    {
        $ppd = $this->pointsPerDt();
        $numerator = $this->marginFloorBasisPoints() * $ppd * $uncostedGoodsMm
            - 10000 * $this->earnPerDt() * $programmeGoodsMm;

        return $costedMarginMm + self::floorDiv($numerator, 10000 * $ppd)
            + $shippingChargedMm - $this->courierMm() - $this->safetyMm();
    }

    /** Largest pack or code amount (millimes) the budget allows: A·ppd/(ppd − e), 0 when A ≤ 0. */
    public function maxCommercial(int $budgetMm): int
    {
        $ppd = $this->pointsPerDt();
        $kept = $ppd - $this->earnPerDt();
        if ($budgetMm <= 0 || $kept <= 0) {
            return 0;
        }

        return intdiv($budgetMm * $ppd, $kept);
    }

    /** Budget left for gift Protinas (millimes) once the commercial discount D is reserved. */
    public function giftRoom(int $budgetMm, int $discountMm): int
    {
        $ppd = $this->pointsPerDt();
        $reserved = self::ceilDiv(max(0, $discountMm) * max(0, $ppd - $this->earnPerDt()), $ppd);

        return max(0, $budgetMm - $reserved);
    }

    // ── Admin thresholds (generic basket of programme goods without prix_achat) ──────────────

    /** @var array<string, int|null> memo keyed by every input, so a config change is never served stale */
    private static array $thresholds = [];

    /** @return array{m: int, k: int, s: int, ppd: int, earn: int, fee: int, free: int} */
    private function snapshot(): array
    {
        return ['m' => $this->marginFloorBasisPoints(), 'k' => $this->courierMm(), 's' => $this->safetyMm(),
            'ppd' => $this->pointsPerDt(), 'earn' => $this->earnPerDt(), 'fee' => $this->deliveryFeeMm(),
            'free' => $this->freeDeliveryFromMm()];
    }

    /** A for a generic basket of $goodsMm programme goods; F follows the delivery threshold. */
    private static function genericBudget(array $c, int $goodsMm, bool $freeShippingCode = false): int
    {
        $fee = ! $freeShippingCode && $goodsMm < $c['free'] ? $c['fee'] : 0;

        return self::floorDiv($c['m'] * $c['ppd'] * $goodsMm - 10000 * $c['earn'] * $goodsMm, 10000 * $c['ppd'])
            + $fee - $c['k'] - $c['s'];
    }

    private static function genericMaxCommercial(array $c, int $budgetMm): int
    {
        $kept = $c['ppd'] - $c['earn'];

        return $budgetMm <= 0 || $kept <= 0 ? 0 : intdiv($budgetMm * $c['ppd'], $kept);
    }

    /** True when a $percent % code eventually fits for every large basket (slope of maxCommercial). */
    private static function percentSafeAsymptotically(array $c, int $percent): bool
    {
        $kept = $c['ppd'] - $c['earn'];

        return $kept > 0 && $percent * 100 * $kept <= $c['m'] * $c['ppd'] - 10000 * $c['earn'];
    }

    private static function slopePositive(array $c): bool
    {
        return $c['m'] * $c['ppd'] > 10000 * $c['earn'];
    }

    private static function horizonDt(array $c): int
    {
        return max(self::SCAN_HORIZON_DT, intdiv($c['free'], 1000) * 2);
    }

    /**
     * Smallest whole-DT basket from which $holds is true for every basket above it (scanned in
     * 1-DT steps up to the horizon, plus the asymptotic check). Null when it never settles.
     *
     * @param callable(int $goodsMm): bool $holds
     */
    private static function settlesFrom(array $c, callable $holds, bool $asymptoticallyTrue): ?int
    {
        if (! $asymptoticallyTrue) {
            return null;
        }
        $horizon = self::horizonDt($c);
        for ($dt = $horizon; $dt >= 1; $dt--) {
            if (! $holds($dt * 1000)) {
                return $dt === $horizon ? null : $dt + 1;
            }
        }

        return 1;
    }

    private function memo(string $name, array $args, callable $compute): ?int
    {
        $key = $name.'|'.json_encode([$this->snapshot(), $args]);
        if (! array_key_exists($key, self::$thresholds)) {
            if (count(self::$thresholds) > 500) {
                self::$thresholds = [];
            }
            self::$thresholds[$key] = $compute($this->snapshot());
        }

        return self::$thresholds[$key];
    }

    /** Smallest basket (whole DT) from which a $percent % code is never capped. */
    public function safePercentFromDt(int $percent): ?int
    {
        if ($percent <= 0) {
            return 1;
        }

        return $this->memo('pct-from', [$percent], fn (array $c): ?int => self::settlesFrom($c,
            fn (int $p): bool => intdiv($p * $percent, 100) <= self::genericMaxCommercial($c, self::genericBudget($c, $p)),
            self::percentSafeAsymptotically($c, $percent)));
    }

    /**
     * Largest whole percent a code may carry when its minimum order is $minOrderDt, so that it is
     * never capped (5 % from 60 DT at m = 15 %). 0 when no percent is safe from that minimum.
     */
    public function safeCouponPercent(float $minOrderDt): int
    {
        $minMm = max(1, self::millimes($minOrderDt));

        return (int) $this->memo('pct-max', [$minMm], function (array $c) use ($minMm): int {
            $safe = function (int $percent) use ($c, $minMm): bool {
                if (! self::percentSafeAsymptotically($c, $percent)) {
                    return false;
                }
                $check = fn (int $p): bool => intdiv($p * $percent, 100)
                    <= self::genericMaxCommercial($c, self::genericBudget($c, $p));
                if (! $check($minMm)) {
                    return false;
                }
                for ($dt = intdiv($minMm, 1000) + 1, $horizon = self::horizonDt($c); $dt <= $horizon; $dt++) {
                    if (! $check($dt * 1000)) {
                        return false;
                    }
                }

                return true;
            };
            $lo = 0;
            $hi = 100;
            while ($lo < $hi) { // a smaller percent is safe whenever a larger one is
                $mid = intdiv($lo + $hi + 1, 2);
                if ($safe($mid)) {
                    $lo = $mid;
                } else {
                    $hi = $mid - 1;
                }
            }

            return $lo;
        });
    }

    /** Smallest basket (whole DT) from which a fixed code worth $valueDt is never capped (15 DT → 173). */
    public function safeFixedFrom(float $valueDt): ?int
    {
        $value = max(0, self::millimes($valueDt));
        if ($value === 0) {
            return 1;
        }

        return $this->memo('fixed-from', [$value], fn (array $c): ?int => self::settlesFrom($c,
            fn (int $p): bool => min($value, $p) <= self::genericMaxCommercial($c, self::genericBudget($c, $p)),
            self::slopePositive($c)));
    }

    /** Smallest basket (whole DT) from which the whole gift ($giftPoints, default the welcome gift) applies (180 at m = 15 %). */
    public function giftFullFromDt(?int $giftPoints = null): ?int
    {
        $points = $giftPoints ?? (int) config('welcome_bonus.points', 300);
        if ($points <= 0) {
            return 1;
        }

        return $this->memo('gift-full', [$points], fn (array $c): ?int => self::settlesFrom($c,
            fn (int $p): bool => intdiv(max(0, self::genericBudget($c, $p)) * $c['ppd'], 1000) >= $points,
            self::slopePositive($c)));
    }

    /** Smallest basket (whole DT) from which a free-delivery code is accepted (130 DT at m = 15 %). */
    public function freeShippingCodeFromDt(): ?int
    {
        return $this->memo('ship-code', [], fn (array $c): ?int => self::settlesFrom($c,
            fn (int $p): bool => self::genericBudget($c, $p, true) >= 0,
            self::slopePositive($c)));
    }

    /**
     * Minimum real margin (percent, 2 decimals) a pack tier needs on its own to keep S
     * (200 DT / 3 % → 9.35 at K = 10, S = 3). Used by `protinas:check-rules`.
     */
    public function minMarginPercentForPack(float $fromDt, int $percent): float
    {
        $p = max(1, self::millimes($fromDt));
        $ppd = $this->pointsPerDt();
        $earn = $this->earnPerDt();
        $discount = intdiv($p * $percent, 100);
        $fee = $p < $this->freeDeliveryFromMm() ? $this->deliveryFeeMm() : 0;
        // m/100 ≥ (D·(ppd − e)/ppd + K + S − F)/P + e/ppd
        $needed = ($discount * ($ppd - $earn) / $ppd + $this->courierMm() + $this->safetyMm() - $fee) / $p + $earn / $ppd;

        return round($needed * 100, 2);
    }
}
