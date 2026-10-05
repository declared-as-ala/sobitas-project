<?php

namespace App\Console\Commands;

use App\Models\Coupon;
use App\Services\CheckoutPricingService;
use App\Services\CouponService;
use App\Services\OrderBudget;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Every active promo code's worst case under the Protinas v3 order budget (spec §E « Existing
 * coupons »). Read-only: the owner reads it, then ticks « Accepter une perte possible » only on the
 * codes chosen deliberately.
 *
 *   php artisan protinas:coupons-review [--to=1000]
 *
 * Each code is priced by the REAL checkout engine (CheckoutPricingService::computeV3) on every basket
 * from its minimum to --to DT, in 1 DT steps, with and without the 300-Protinas welcome gift, on
 * generic programme goods at the margin floor (products with a prix_achat do better). It reports
 * where the guard reduces or refuses the code, and the smallest net margin the shop keeps:
 *
 *   net = m·P + delivery charged − courier − discount − gift − Protinas earned
 *
 * A guarded code never goes below the safety amount S; a code with « perte acceptée » can.
 *
 * Codes are printed as #id only: vps-run logs are readable by anyone (public repository).
 */
class ProtinasCouponsReview extends Command
{
    protected $signature = 'protinas:coupons-review {--to=1000 : Largest basket scanned (DT)}';

    protected $description = 'Read-only worst case of every active promo code under the Protinas v3 budget';

    public function handle(CheckoutPricingService $pricing, OrderBudget $budget, CouponService $coupons): int
    {
        if (! Schema::hasTable('coupons')) {
            $this->error('coupons table missing.');

            return self::FAILURE;
        }
        $hasAllow = Schema::hasColumn('coupons', 'allow_over_budget');
        $to = max(10, (int) $this->option('to'));
        $ppd = $budget->pointsPerDt();
        $marginBp = $budget->marginFloorBasisPoints();
        $courier = $budget->courierMm();
        $safety = $budget->safetyMm();
        $welcome = (int) config('welcome_bonus.points', 300);
        $guard = (bool) config('loyalty.coupons.margin_guard', true);
        $dt = fn (int $mm): string => number_format($mm / 1000, 3, ',', ' ');

        $active = Coupon::query()->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->orderBy('id')->get();
        $this->info(sprintf('%d active code(s) · guard %s · margin floor %s %% · baskets up to %d DT',
            $active->count(), $guard ? 'on' : 'OFF', rtrim(rtrim(number_format($marginBp / 100, 2, ',', ''), '0'), ','), $to));

        $rows = [];
        $losing = 0;
        foreach ($active as $coupon) {
            $allowOver = $hasAllow && (bool) ($coupon->getAttributes()['allow_over_budget'] ?? false);
            $isShip = $coupons->isFreeShipping($coupon);
            $from = max(1, (int) ceil((float) ($coupon->min_order_amount ?? 0)));
            $worst = null;
            $worstAt = null;
            $reduced = [];
            $refused = [];
            for ($p = $from; $p <= $to; $p++) {
                $goods = $p * 1000;
                $couponInput = [
                    'type' => $isShip ? 'ship' : 'goods',
                    'amount_mm' => $isShip ? 0 : $coupons->discountMillimes($coupon, $goods),
                    'allow_over' => $allowOver,
                ];
                foreach ([0, $welcome] as $gift) {
                    $r = $pricing->computeV3([
                        'programme_mm' => $goods, 'excluded_mm' => 0, 'costed_margin_mm' => 0, 'uncosted_mm' => $goods,
                        'pack_percent' => 0, 'pack_amount_mm' => 0, 'coupon' => $couponInput, 'home_delivery' => true,
                        'gift_usable' => $gift, 'earned_usable' => 0, 'requested_earned' => 0, 'use_gift' => $gift > 0,
                    ]);
                    $net = intdiv($marginBp * $goods, 10000) + (int) $r['shipping_charged_mm'] - $courier
                        - (int) $r['discount_mm'] - (int) $r['gift_value_mm'] - intdiv((int) $r['earn_points'] * 1000, $ppd);
                    // Only baskets where the code does something count for its worst case.
                    $codeActs = (bool) $r['coupon_applied'];
                    if ($codeActs && ($worst === null || $net < $worst)) {
                        $worst = $net;
                        $worstAt = $p;
                    }
                    if ($gift === 0) {
                        if ($r['coupon_applied'] && $r['coupon_capped']) {
                            $reduced[] = $p;
                        } elseif (in_array($r['coupon_reason'], ['budget', 'free_shipping_minimum'], true)) {
                            $refused[] = $p;
                        }
                    }
                }
            }

            $effects = [];
            if ($refused !== []) {
                $effects[] = 'sans effet '.$this->range($refused);
            }
            if ($reduced !== []) {
                $effects[] = 'réduit '.$this->range($reduced);
            }
            if ($isShip && $from < (int) ceil($budget->freeDeliveryFromMm() / 1000)) {
                $effects[] = 'inutile dès '.$dt($budget->freeDeliveryFromMm()).' DT (livraison déjà offerte)';
            }
            // 5 millimes of tolerance: the budget floors to the millime, a guarded code sits at S ± 1.
            $loses = $worst !== null && $worst < $safety - 5;
            $losing += $loses ? 1 : 0;
            $rows[] = [
                // Never the code itself: the vps-run log is public (public repository), and a code with
                // « perte acceptée » is honoured above the budget for anyone who types it.
                '#'.$coupon->id,
                $coupon->type,
                $isShip ? '—' : ($coupon->type === Coupon::TYPE_PERCENT ? rtrim(rtrim(number_format((float) $coupon->value, 2, '.', ''), '0'), '.').' %' : $dt((int) round((float) $coupon->value * 1000)).' DT'),
                $coupon->min_order_amount !== null ? $dt((int) round((float) $coupon->min_order_amount * 1000)).' DT' : '—',
                $allowOver ? 'OUI' : 'non',
                $effects === [] ? 'entier partout' : implode(' · ', $effects),
                $worst === null ? 'jamais appliqué' : $dt($worst).' DT à '.$worstAt.' DT'.($loses ? '  ← PERTE' : ''),
            ];
        }
        $this->table(['code (#id)', 'type', 'valeur', 'minimum', 'perte acceptée', 'effet du plafond (paniers en DT)', 'pire marge nette'], $rows);
        $this->line(sprintf('Marge nette au plancher de marge, sans prix d’achat ; S = %s DT. Codes pouvant perdre de l’argent : %d.', $dt($safety), $losing));
        $this->line('Codes désignés par leur numéro (#id, colonne « # » de la liste des coupons) : ce journal est public, un code n’y figure jamais.');
        $this->comment('Read-only: nothing was written.');

        return self::SUCCESS;
    }

    /** "de 60 à 172 DT", or several ranges when the list has gaps. */
    private function range(array $baskets): string
    {
        sort($baskets);
        $parts = [];
        $start = $prev = array_shift($baskets);
        foreach ($baskets as $p) {
            if ($p === $prev + 1) {
                $prev = $p;
                continue;
            }
            $parts[] = $start === $prev ? $start.' DT' : 'de '.$start.' à '.$prev.' DT';
            $start = $prev = $p;
        }
        $parts[] = $start === $prev ? $start.' DT' : 'de '.$start.' à '.$prev.' DT';

        return implode(', ', $parts);
    }
}
