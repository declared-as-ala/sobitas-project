<?php

namespace Tests\Feature;

use App\Models\Affilie;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\SousCategory;
use App\Services\CheckoutPricingService;
use App\Services\OrderBudget;
use App\Support\ProtinaWallet;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Protinas v3 pricing (spec §B, §C, F12) at m = 15 %, K = 10 DT, S = 3 DT. Every expected number
 * below was recomputed with .claude/codex/briefs/protinas-v3-engine.py (integer millimes).
 */
class ProtinasV3PricingTest extends TestCase
{
    use ProtinasV3Schema;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildProtinasV3Database();
    }

    private static function wallet(int $earned = 0, int $gift = 0, int $debt = 0): ProtinaWallet
    {
        return new ProtinaWallet($earned + $gift, $earned, 0, null, $gift, null, $debt, null,
            $debt > 0 ? ProtinaWallet::BLOCK_DEBT : null);
    }

    private static function item(float $price, bool $promo = false, ?string $subcategory = null): Product
    {
        $product = new Product($promo ? ['prix' => $price * 1.5, 'promo' => $price] : ['prix' => $price]);
        if ($subcategory !== null) {
            $product->setRelation('sousCategorie', new SousCategory(['slug' => $subcategory]));
        }

        return $product;
    }

    /** @return array<string, mixed> the customer-safe pricing */
    private function price(array $products, bool $pack = false, ?Coupon $coupon = null, ?ProtinaWallet $wallet = null,
        int $requestedEarned = 0, bool $useGift = true): array
    {
        $lines = array_map(fn (Product $p) => ['product' => $p, 'quantity' => 1], $products);

        return app(CheckoutPricingService::class)->priceV3($lines, $coupon, $pack, $requestedEarned, true, $wallet, $useGift)['pricing'];
    }

    public function test_200_pack_and_660_earned_pays_delivery_first_then_goods(): void
    {
        $p = $this->price([self::item(200)], true, null, self::wallet(660), 660);
        $this->assertSame(6.0, $p['pack']['amount_dt']);
        $this->assertSame(660, $p['protinas']['used_points']);
        $this->assertSame(10.0, $p['protinas']['used_on_shipping_dt']);   // 200 Protinas
        $this->assertSame(23.0, $p['protinas']['used_on_goods_dt']);      // 460 Protinas
        $this->assertSame(0.0, $p['shipping_dt']);
        $this->assertSame(10.0, $p['shipping_gross_dt']);
        $this->assertSame(171.0, $p['total_dt']);
        $this->assertSame(171, $p['earn_on_delivery_points']);
        $this->assertSame(0, $p['protinas']['remaining_points']);
        $this->assertSame(39.0, $p['savings_dt']);
    }

    public function test_90_dt_with_900_earned(): void
    {
        $p = $this->price([self::item(90)], false, null, self::wallet(900), 900);
        $this->assertSame(55.0, $p['total_dt']);
        $this->assertSame(0.0, $p['shipping_dt']);
        $this->assertSame(10.0, $p['protinas']['used_on_shipping_dt']);
        $this->assertSame(35.0, $p['protinas']['used_on_goods_dt']);
        $this->assertSame(55, $p['earn_on_delivery_points']);
        $this->assertSame(900, $p['protinas']['used_earned_points']);
    }

    public function test_776_pack_with_500_earned(): void
    {
        $p = $this->price([self::item(776)], true, null, self::wallet(500), 500);
        $this->assertSame(54.32, $p['pack']['amount_dt']);
        $this->assertSame(696.68, $p['total_dt']);
        $this->assertSame(696, $p['earn_on_delivery_points']);
    }

    public function test_gloves_paid_entirely_with_earned_protinas_need_a_phone_confirmation(): void
    {
        $p = $this->price([self::item(30)], false, null, self::wallet(5000), 5000);
        $this->assertSame(800, $p['protinas']['used_points']);
        $this->assertSame(0.0, $p['total_dt']);
        $this->assertSame(30.0, $p['protinas']['used_on_goods_dt']);
        $this->assertSame(0, $p['earn_on_delivery_points']);
        $this->assertTrue($p['requires_phone_confirmation']);
    }

    public static function giftRooms(): array
    {
        return [
            '30' => [30, false, 0], '59' => [59, false, 58], '100' => [100, false, 140], '130' => [130, false, 200],
            '150' => [150, false, 240], '180' => [180, false, 300], '300' => [300, false, 300],
            '200 + pack' => [200, true, 226], '300 + pack' => [300, true, 169], '350 + pack' => [350, true, 107],
            '500 + pack' => [500, true, 75],
        ];
    }

    #[DataProvider('giftRooms')]
    public function test_gift_is_bounded_by_the_order_budget(float $goods, bool $pack, int $giftPoints): void
    {
        $p = $this->price([self::item($goods)], $pack, null, self::wallet(0, 300));
        $this->assertSame($giftPoints, $p['protinas']['used_gift_points']);
        $this->assertSame(300 - $giftPoints, $p['protinas']['gift_left_points']);
        $this->assertSame(180, $p['protinas']['gift_full_from_dt']);
    }

    public function test_welcome_at_180_and_pack_500_match_the_customer_copy(): void
    {
        $p = $this->price([self::item(180)], false, null, self::wallet(0, 300));
        $this->assertSame(175.0, $p['total_dt']);
        $this->assertSame(15.0, $p['savings_dt']);
        $this->assertSame(175, $p['earn_on_delivery_points']);
        $this->assertFalse($p['requires_phone_confirmation']);

        $p = $this->price([self::item(500)], true, null, self::wallet(0, 300));
        $this->assertSame(461.25, $p['total_dt']);
        $this->assertSame(48.75, $p['savings_dt']);
        $this->assertSame(461, $p['earn_on_delivery_points']);
        $this->assertSame(225, $p['protinas']['gift_left_points']);

        // « Garder pour plus tard »
        $kept = $this->price([self::item(180)], false, null, self::wallet(0, 300), 0, false);
        $this->assertSame(0, $kept['protinas']['used_gift_points']);
        $this->assertSame(300, $kept['protinas']['max_gift_points']);
        $this->assertSame(190.0, $kept['total_dt']);
    }

    public function test_pack_applies_to_promo_lines_and_v2_still_excludes_them(): void
    {
        $promo = self::item(200, true);
        $this->assertSame(6.0, $this->price([$promo], true)['pack']['amount_dt']);

        config(['loyalty.rules_version' => 2, 'loyalty.pack.exclude_promo_lines' => true]);
        $v2 = app(CheckoutPricingService::class)->price([['product' => $promo, 'quantity' => 1]], null, true, 0, 0, true);
        $this->assertSame(0.0, $v2['pack']['amount_dt']);
    }

    public function test_floor_13_caps_the_pack_and_leaves_no_gift(): void
    {
        config(['loyalty.budget.margin_floor_percent' => 13]);
        $p = $this->price([self::item(500)], true, null, self::wallet(0, 300));
        $this->assertSame(28.421, $p['pack']['amount_dt']);
        $this->assertTrue($p['pack']['capped']);
        $this->assertSame(0, $p['protinas']['used_gift_points']);
        $this->assertSame(471.579, $p['total_dt']);
    }

    public function test_codes_are_guarded_by_the_budget_unless_the_owner_accepts_a_loss(): void
    {
        $guarded = $this->price([self::item(300)], false, new Coupon(['code' => 'NEW10', 'type' => 'percent', 'value' => 10]), self::wallet(0, 300));
        $this->assertSame(17.894, $guarded['coupon']['amount_dt']);
        $this->assertTrue($guarded['coupon']['capped']);
        $this->assertSame(0, $guarded['protinas']['used_gift_points']);
        $this->assertSame(282.106, $guarded['total_dt']);

        $honoured = $this->price([self::item(300)], false,
            new Coupon(['code' => 'OLD10', 'type' => 'percent', 'value' => 10, 'allow_over_budget' => true]));
        $this->assertSame(30.0, $honoured['coupon']['amount_dt']);
        $this->assertFalse($honoured['coupon']['capped']);
        $this->assertSame(270.0, $honoured['total_dt']);

        $fivePercent = $this->price([self::item(300)], true, new Coupon(['code' => 'CINQ', 'type' => 'percent', 'value' => 5]), self::wallet(0, 300));
        $this->assertTrue($fivePercent['coupon']['applied']);
        $this->assertFalse($fivePercent['pack']['applied']);
        $this->assertSame(15.0, $fivePercent['coupon']['amount_dt']);
        $this->assertSame(55, $fivePercent['protinas']['used_gift_points']);
        $this->assertSame(282.25, $fivePercent['total_dt']);

        $twenty = $this->price([self::item(200)], false, new Coupon(['code' => 'VINGT', 'type' => 'percent', 'value' => 20]));
        $this->assertSame(17.894, $twenty['coupon']['amount_dt']);
        $this->assertSame(192.106, $twenty['total_dt']);

        $tie = $this->price([self::item(200)], true, new Coupon(['code' => 'TIE3', 'type' => 'percent', 'value' => 3]));
        $this->assertFalse($tie['coupon']['applied']);
        $this->assertSame('pack_better', $tie['coupon']['reason']);
    }

    public function test_free_delivery_code_needs_130_dt(): void
    {
        $ship = fn () => new Coupon(['code' => 'LIVRAISON', 'type' => Coupon::TYPE_FREE_SHIPPING, 'value' => 0]);
        $refused = $this->price([self::item(129)], false, $ship());
        $this->assertFalse($refused['coupon']['applied']);
        $this->assertSame('free_shipping_minimum', $refused['coupon']['reason']);
        $this->assertSame(130, $refused['coupon']['min_goods_dt']);
        $this->assertSame(139.0, $refused['total_dt']);

        $accepted = $this->price([self::item(130)], false, $ship());
        $this->assertTrue($accepted['coupon']['applied']);
        $this->assertSame(130.0, $accepted['total_dt']);

        $withGift = $this->price([self::item(150)], false, $ship(), self::wallet(0, 300));
        $this->assertSame(40, $withGift['protinas']['used_gift_points']);
        $this->assertSame(148.0, $withGift['total_dt']);
    }

    public function test_machines_are_outside_the_programme(): void
    {
        $p = $this->price([self::item(5200, false, 'cardio-fitness'), self::item(200)], true, null, self::wallet(0, 300));
        $this->assertSame(5400.0, $p['goods_dt']);
        $this->assertSame(200.0, $p['programme_goods_dt']);
        $this->assertSame(5200.0, $p['excluded_goods_dt']);
        $this->assertSame(6.0, $p['pack']['amount_dt']);          // on the whey only
        $this->assertSame(10.0, $p['shipping_gross_dt']);         // the 5,200 DT do not count toward 300
        $this->assertSame(10.0, $p['protinas']['used_on_shipping_dt']); // … and the gift pays it first
        $this->assertSame(226, $p['protinas']['used_gift_points']); // the whey's budget, as for 200 + pack
        $this->assertSame(5392.7, $p['total_dt']);
        // Whey cash only: the gift pays the 10 DT delivery first, then 1.30 DT of goods → 200 − 6 − 1.30.
        $this->assertSame(192, $p['earn_on_delivery_points']);

        // A code on a machine-only basket computes to nothing: the reason names the machines.
        $coded = $this->price([self::item(1200, false, 'cardio-fitness')], false,
            new Coupon(['code' => 'NEW10', 'type' => 'percent', 'value' => 10]));
        $this->assertFalse($coded['coupon']['applied']);
        $this->assertSame('excluded_goods', $coded['coupon']['reason']);
        $this->assertSame(1210.0, $coded['total_dt']);
    }

    public function test_last_step_rounds_to_exactly_zero(): void
    {
        $p = $this->price([self::item(30.03)], false, null, self::wallet(5000), 5000);
        $this->assertSame(801, $p['protinas']['used_points']);
        $this->assertSame(0.0, $p['total_dt']);
    }

    public function test_debt_blocks_every_protina(): void
    {
        $p = $this->price([self::item(200)], false, null, self::wallet(500, 300, 175), 0);
        $this->assertSame(0, $p['protinas']['used_points']);
        $this->assertSame(0, $p['protinas']['max_usable_points']);
        $this->assertSame('debt', $p['protinas']['blocked_reason']);
        $this->assertSame(175, $p['protinas']['debt_points']);
    }

    public function test_thresholds_published_and_shown_in_the_admin(): void
    {
        $budget = app(OrderBudget::class);
        $this->assertSame(180, $budget->giftFullFromDt());
        $this->assertSame(130, $budget->freeShippingCodeFromDt());
        $this->assertSame(5, $budget->safeCouponPercent(60));
        $this->assertSame(173, $budget->safeFixedFrom(15));
        $this->assertSame(9.35, $budget->minMarginPercentForPack(200, 3));
        $this->assertSame(12.18, $budget->minMarginPercentForPack(300, 3));
        $this->assertSame(13.46, $budget->minMarginPercentForPack(350, 5));
        $this->assertSame(14.25, $budget->minMarginPercentForPack(500, 7));

        config(['loyalty.budget.margin_floor_percent' => 20]);
        $this->assertSame(120, $budget->giftFullFromDt());
        $this->assertSame(87, $budget->freeShippingCodeFromDt());
        $this->assertSame(10, $budget->safeCouponPercent(60));
    }

    /**
     * §C brute force: P = 1…3,000 DT step 1 × pack × codes (5/10/20 %, fixed 20/50, free delivery)
     * × gift 0/300/10,000 × earned 0/∞. At a REAL margin of 15 % the shop's position (cash profit +
     * earned Protinas retired − new earned Protinas owed) is never below min(S, the same basket with
     * no giveaway), and prix_ttc always equals prix_ht − coupon − remise + net delivery.
     */
    public function test_property_shop_always_keeps_the_safety_amount(): void
    {
        $svc = app(CheckoutPricingService::class);
        $codes = [null, ['pct', 5], ['pct', 10], ['pct', 20], ['fixed', 20], ['fixed', 50], ['ship']];
        $net = function (array $r, int $P): int {
            $cost = intdiv(85 * $P, 100) + 10_000;

            return $r['total_mm'] - $cost + $r['earned_value_mm'] - intdiv($r['earn_points'] * 1000, 20);
        };
        $run = fn (int $P, int $packPct, int $packAmount, ?array $coupon, int $gift, int $earned) => $svc->computeV3([
            'programme_mm' => $P, 'excluded_mm' => 0, 'costed_margin_mm' => 0, 'uncosted_mm' => $P,
            'pack_percent' => $packPct, 'pack_amount_mm' => $packAmount, 'coupon' => $coupon, 'home_delivery' => true,
            'gift_usable' => $gift, 'earned_usable' => $earned, 'requested_earned' => $earned, 'use_gift' => true,
        ]);
        $baskets = 0;
        $violations = [];
        for ($dt = 1; $dt <= 3000; $dt++) {
            $P = $dt * 1000;
            $plain = $net($run($P, 0, 0, null, 0, 0), $P);
            $tier = $dt >= 500 ? 7 : ($dt >= 350 ? 5 : ($dt >= 200 ? 3 : 0));
            foreach ([false, true] as $pack) {
                $packAmount = $pack ? (int) round($P * $tier / 100) : 0;
                foreach ($codes as $code) {
                    $coupon = match ($code[0] ?? null) {
                        null => null,
                        'ship' => ['type' => 'ship', 'amount_mm' => 0, 'allow_over' => false],
                        'pct' => ['type' => 'goods', 'amount_mm' => intdiv($P * $code[1], 100), 'allow_over' => false],
                        'fixed' => ['type' => 'goods', 'amount_mm' => min($code[1] * 1000, $P), 'allow_over' => false],
                    };
                    foreach ([0, 300, 10_000] as $gift) {
                        foreach ([0, 10_000_000] as $earned) {
                            $r = $run($P, $pack ? $tier : 0, $packAmount, $coupon, $gift, $earned);
                            $baskets++;
                            $value = $net($r, $P);
                            $coupon_ = $r['coupon_applied'] ? $r['coupon_applied_mm'] : 0;
                            $identity = $r['goods_mm'] - $coupon_ - ($r['pack_applied_mm'] + $r['on_goods_mm']) + $r['shipping_net_mm'];
                            if ($value < min(3000, $plain) || $identity !== $r['total_mm'] || $r['total_mm'] < 0) {
                                $violations[] = compact('dt', 'pack', 'code', 'gift', 'earned', 'value', 'plain');
                            }
                        }
                    }
                }
            }
        }
        $this->assertSame(252_000, $baskets);
        $this->assertSame([], array_slice($violations, 0, 5));
    }

    public function test_rules_v3_payload_publishes_thresholds_and_never_the_budget(): void
    {
        $response = $this->getJson('/api/loyalty/rules')->assertOk()
            ->assertJsonPath('version', 3)
            ->assertJsonPath('gift.full_from_dt', 180)
            ->assertJsonPath('gift.valid_days', 60)
            ->assertJsonPath('earned.max_percent', 100)
            ->assertJsonPath('earned.hold_days', 14)
            ->assertJsonPath('earned.expires', false)
            ->assertJsonPath('delivery.points', 200)
            ->assertJsonPath('pack.excludes_promo_lines', false)
            ->assertJsonPath('welcome.unlock', 'phone_verification')
            ->assertJsonPath('refusal.forfeit_points', 400)
            ->assertJsonPath('coupons.free_shipping_from_dt', 130)
            ->assertJsonPath('cod.trusted_phone_days', 14)
            ->assertJsonPath('cod.confirm_below_cash_dt', 20)
            ->assertJsonPath('program.excluded_subcategory_slugs', ['materiel-de-musculation', 'cardio-fitness'])
            // For pre-v3 bundles still open over the deploy (« jusqu'à 100 % »), never the old 10 %.
            ->assertJsonPath('max_total_discount_percent', 100);
        foreach (['margin', 'courier', 'safety', 'budget', 'prix_achat'] as $secret) {
            $this->assertStringNotContainsString($secret, (string) $response->getContent());
        }
    }

    public function test_quote_exposes_the_v3_shape_without_internal_figures(): void
    {
        $this->product(1, 180);
        $token = $this->customer(1, 0, 300);
        $response = $this->withToken($token)->postJson('/api/checkout/quote', ['panier' => [['produit_id' => 1, 'quantite' => 1]]])
            ->assertOk()
            ->assertJsonPath('pricing.rules_version', 3)
            ->assertJsonPath('pricing.total_dt', 175)
            ->assertJsonPath('pricing.protinas.used_gift_points', 300)
            ->assertJsonPath('pricing.protinas.gift_balance', 300)
            ->assertJsonPath('pricing.shipping_gross_dt', 10)
            ->assertJsonPath('pricing.earn_on_delivery_points', 175);
        foreach (['budget', 'room_dt', 'ceiling', 'margin', 'prix_achat'] as $secret) {
            $this->assertStringNotContainsString($secret, (string) $response->getContent());
        }
        $this->assertSame(0, DB::table('commandes')->count());
    }

    /**
     * An affiliate-attributed order pays the spread Σ (price − prix_affilie)·qty on delivery. That is a
     * cost of the order: it comes out of the budget before any gift, pack or code.
     */
    public function test_affiliate_commission_is_reserved_inside_the_budget(): void
    {
        $affilie = new Affilie(['name' => 'Ali', 'commission_rate' => 10]);
        $svc = app(CheckoutPricingService::class);
        $line = fn (Product $p) => [['product' => $p, 'quantity' => 1]];

        // 180 DT whey, prix_affilie 162 → spread 18 DT > A = 15 DT: no gift (the plain order nets 0).
        $whey = new Product(['prix' => 180, 'prix_affilie' => 162]);
        $this->assertSame(18_000, CheckoutPricingService::affiliateCostMm($line($whey), $affilie));
        $p = $svc->priceV3($line($whey), null, false, 0, true, self::wallet(0, 300), true, $affilie)['pricing'];
        $this->assertSame(0, $p['protinas']['used_gift_points']);
        $this->assertSame(190.0, $p['total_dt']);
        // « les 15 DT en entier dès 180 DT » does not hold once the commission is reserved: no threshold.
        $this->assertNull($p['protinas']['gift_full_from_dt']);
        // The same basket without an affiliate still gets the full welcome gift.
        $plain = $this->price([$whey], false, null, self::wallet(0, 300));
        $this->assertSame(300, $plain['protinas']['used_gift_points']);
        $this->assertSame(180, $plain['protinas']['gift_full_from_dt']);

        // 500 DT pack at a 10 % spread: A = 37 − 50 < 0 → no pack, no gift.
        $pack = $svc->priceV3($line(new Product(['prix' => 500, 'prix_affilie' => 450])), null, true, 0, true,
            self::wallet(0, 300), true, $affilie)['pricing'];
        $this->assertFalse($pack['pack']['applied']);
        $this->assertTrue($pack['pack']['capped']);
        $this->assertSame('not_available', $pack['pack']['reason']); // the checkout says the −7 % does not apply
        $this->assertSame(0, $pack['protinas']['used_gift_points']);
        $this->assertSame(500.0, $pack['total_dt']);
        $this->assertNull($this->price([new Product(['prix' => 500])], true)['pack']['reason']);

        // A guarded code is capped by the same reduced budget.
        $coded = $svc->priceV3($line(new Product(['prix' => 300, 'prix_affilie' => 290])), new Coupon(['code' => 'NEW10', 'type' => 'percent', 'value' => 10]),
            false, 0, true, null, true, $affilie)['pricing'];
        $this->assertSame(7.368, $coded['coupon']['amount_dt']); // (17 − 10) · 20/19
        $this->assertNull($coded['coupon']['full_from_dt']);       // « en entier dès 60 DT » would be false here

        // No prix_affilie on any line: the service pays the affiliate's rate on the cash base.
        $this->assertSame(18_000, CheckoutPricingService::affiliateCostMm($line(new Product(['prix' => 180])), $affilie));
        $this->assertSame(0, CheckoutPricingService::affiliateCostMm($line($whey), null));
        // Machines stay outside: their commission comes out of their own margin, as before v3.
        $this->assertSame(0, CheckoutPricingService::affiliateCostMm(
            [['product' => self::item(5200, false, 'cardio-fitness'), 'quantity' => 1], ['product' => new Product(['prix' => 100, 'prix_affilie' => 100]), 'quantity' => 1]],
            $affilie));
    }

    /** At a real 15 % margin an affiliate order with a giveaway still nets ≥ S after the commission (P = 1…1,500 DT). */
    public function test_property_affiliate_orders_keep_the_safety_amount(): void
    {
        $svc = app(CheckoutPricingService::class);
        $violations = [];
        for ($dt = 1; $dt <= 1500; $dt++) {
            $P = $dt * 1000;
            $commission = intdiv($P, 20); // prix_affilie = retail − 5 % (at − 10 % no giveaway ever fits)
            $tier = $dt >= 500 ? 7 : ($dt >= 350 ? 5 : ($dt >= 200 ? 3 : 0));
            foreach ([false, true] as $pack) {
                foreach ([0, 300, 10_000] as $gift) {
                    $r = $svc->computeV3([
                        'programme_mm' => $P, 'excluded_mm' => 0, 'costed_margin_mm' => 0, 'uncosted_mm' => $P,
                        'pack_percent' => $pack ? $tier : 0, 'pack_amount_mm' => $pack ? (int) round($P * $tier / 100) : 0,
                        'coupon' => null, 'home_delivery' => true, 'gift_usable' => $gift, 'earned_usable' => 0,
                        'requested_earned' => 0, 'use_gift' => true, 'affiliate_cost_mm' => $commission,
                    ]);
                    $giveaway = $r['discount_mm'] + $r['gift_value_mm'] > 0;
                    $net = $r['total_mm'] - (intdiv(85 * $P, 100) + 10_000) - intdiv($r['earn_points'] * 1000, 20) - $commission;
                    if ($giveaway && $net < 3000) {
                        $violations[] = compact('dt', 'pack', 'gift', 'net');
                    }
                }
            }
        }
        $this->assertSame([], array_slice($violations, 0, 5));
    }

    public function test_an_account_without_a_trusted_phone_cannot_let_its_protinas_trigger_rule_17(): void
    {
        $untrusted = new ProtinaWallet(5000, 5000, 0, null, 0, null, 0, null, null, null, false, false, null);
        $p = $this->price([self::item(30)], false, null, $untrusted, 5000);
        $this->assertSame(400, $p['protinas']['used_earned_points']);
        $this->assertSame(20.001, $p['total_dt']);                  // ≥ 20 DT cash and < 50 % in Protinas
        $this->assertFalse($p['requires_phone_confirmation']);
        $this->assertSame('phone_not_trusted', $p['protinas']['limited_reason']);
        $this->assertSame(19.999, $p['protinas']['limited_max_dt']); // the binding cap the hint quotes

        // 5 DT + delivery: the 20 DT cash floor leaves nothing for Protinas, and the hint must say so.
        $tiny = $this->price([self::item(5)], false, null, $untrusted, 5000);
        $this->assertSame(0, $tiny['protinas']['used_points']);
        $this->assertSame('phone_not_trusted', $tiny['protinas']['limited_reason']);
        $this->assertSame(0.0, $tiny['protinas']['limited_max_dt']);

        $trusted = $this->price([self::item(30)], false, null, self::wallet(5000), 5000);
        $this->assertSame(800, $trusted['protinas']['used_points']);
        $this->assertTrue($trusted['requires_phone_confirmation']);
        $this->assertNull($trusted['protinas']['limited_reason']);
        $this->assertNull($trusted['protinas']['limited_max_dt']);

        // A wallet the cap does not reach is untouched and says nothing.
        $small = new ProtinaWallet(100, 100, 0, null, 0, null, 0, null, null, null, false, false, null);
        $p = $this->price([self::item(180)], false, null, $small, 100);
        $this->assertSame(100, $p['protinas']['used_earned_points']);
        $this->assertNull($p['protinas']['limited_reason']);
    }

    public function test_prix_achat_never_serialises_and_feeds_the_budget(): void
    {
        $product = new Product(['prix' => 100, 'prix_achat' => 60]);
        $this->assertArrayNotHasKey('prix_achat', $product->toArray());
        // 40 DT of real margin instead of 15 % · 100: A = 40 − 5 + 10 − 13 = 32 DT → full welcome gift.
        $p = $this->price([$product], false, null, self::wallet(0, 300));
        $this->assertSame(300, $p['protinas']['used_gift_points']);
    }
}
