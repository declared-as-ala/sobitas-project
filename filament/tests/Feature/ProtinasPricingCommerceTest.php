<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Product;
use App\Services\CheckoutPricingService;
use App\Services\LoyaltyService;
use App\Services\TillPointsConversion;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProtinasPricingCommerceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'cache.default' => 'array',
            'loyalty.checkout.max_total_discount_percent' => 10,
            'loyalty.checkout.delivery_fee_dt' => 10,
            'loyalty.checkout.free_delivery_from_dt' => 300,
            'loyalty.pack.tiers' => [['from_dt' => 200, 'percent' => 3], ['from_dt' => 350, 'percent' => 5], ['from_dt' => 500, 'percent' => 7]],
            'loyalty.pack.exclude_promo_lines' => true,
            'loyalty.points.points_per_dt' => 20, 'loyalty.points.earn_per_dt' => 1,
            'loyalty.till.points_per_dt' => 20, 'loyalty.till.earn_per_dt' => 1,
            'loyalty.till.max_total_discount_percent' => 10, 'loyalty.till.min_redeem_points' => 100,
            // /api/loyalty/rules reports this switch; pin it so the server's own .env cannot flip the test.
            'welcome_bonus.unlock_on_first_delivery' => true,
        ]);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        Schema::create('coordinates', fn (Blueprint $t) => $t->id());
        Schema::create('products', function (Blueprint $t): void {
            $t->id(); $t->decimal('prix', 12, 3); $t->decimal('promo', 12, 3)->nullable();
            $t->timestamp('promo_expiration_date')->nullable();
        });
        Schema::create('users', function (Blueprint $t): void {
            $t->id(); $t->string('name'); $t->string('email'); $t->unsignedInteger('points_balance')->default(0);
            $t->timestamp('email_verified_at')->nullable(); $t->timestamp('phone_verified_at')->nullable();
            $t->timestamps();
        });
        Schema::create('personal_access_tokens', function (Blueprint $t): void {
            $t->id(); $t->string('tokenable_type'); $t->unsignedBigInteger('tokenable_id');
            $t->string('name'); $t->string('token', 64)->unique(); $t->text('abilities')->nullable();
            $t->timestamp('last_used_at')->nullable(); $t->timestamp('expires_at')->nullable(); $t->timestamps();
        });
    }

    private function price(float $goods, bool $pack, int $balance = 0, int $requested = 0, ?Coupon $coupon = null): array
    {
        $product = new Product(['prix' => $goods]);
        return app(CheckoutPricingService::class)->price(
            [['product' => $product, 'quantity' => 1]], $coupon, $pack, $balance, $requested, true
        );
    }

    public static function workedOrders(): array
    {
        return [
            '0453 grandfathered' => [379, true, 300, 300, null, 18.95, 15.0, 345.05, 345, 0],
            '379 new account, welcome pending' => [379, true, 0, 0, null, 18.95, 0.0, 360.05, 360, 0],
            'next 200 basket after 660 points' => [200, true, 660, 660, null, 6.0, 14.0, 190.0, 180, 380],
            '0420 as placed' => [776, true, 0, 0, null, 54.32, 0.0, 721.68, 721, 0],
            '0420 maximum whole points' => [776, true, 500, 500, null, 54.32, 23.25, 698.43, 698, 35],
            '90 DT basket with 900 points' => [90, false, 900, 900, null, 0.0, 9.0, 91.0, 81, 720],
        ];
    }

    #[DataProvider('workedOrders')]
    public function test_worked_order(float $goods, bool $pack, int $balance, int $requested, ?Coupon $coupon,
        float $packDt, float $pointsDt, float $total, int $earn, int $remaining): void
    {
        $pricing = $this->price($goods, $pack, $balance, $requested, $coupon);
        $this->assertSame($packDt, $pricing['pack']['amount_dt']);
        $this->assertSame($pointsDt, $pricing['protinas']['used_dt']);
        $this->assertSame($total, $pricing['total_dt']);
        $this->assertSame($earn, $pricing['earn_on_delivery_points']);
        $this->assertSame($remaining, $pricing['protinas']['remaining_points']);
    }

    public function test_0420_coupon_takes_place_of_pack_and_leaves_no_point_room(): void
    {
        $coupon = new Coupon(['code' => 'PROMO10', 'type' => Coupon::TYPE_PERCENT, 'value' => 10]);
        $pricing = $this->price(776, true, 500, 500, $coupon);
        $this->assertTrue($pricing['coupon']['applied']);
        $this->assertSame(77.6, $pricing['coupon']['amount_dt']);
        $this->assertSame(0.0, $pricing['pack']['amount_dt']);
        $this->assertSame(0, $pricing['protinas']['used_points']);
        $this->assertSame(698.4, $pricing['total_dt']);
    }

    public function test_coupon_tie_keeps_pack_and_coupon_unapplied(): void
    {
        $coupon = new Coupon(['code' => 'TIE3', 'type' => Coupon::TYPE_PERCENT, 'value' => 3]);
        $pricing = $this->price(200, true, 0, 0, $coupon);
        $this->assertTrue($pricing['pack']['applied']);
        $this->assertFalse($pricing['coupon']['applied']);
        $this->assertSame('pack_better', $pricing['coupon']['reason']);
    }

    public function test_free_shipping_coupon_combines_with_pack(): void
    {
        $coupon = new Coupon(['code' => 'SHIP', 'type' => Coupon::TYPE_FREE_SHIPPING, 'value' => 0]);
        $pricing = $this->price(200, true, 0, 0, $coupon);
        $this->assertSame(6.0, $pricing['pack']['amount_dt']);
        $this->assertTrue($pricing['coupon']['applied']);
        $this->assertSame('coupon', $pricing['free_shipping_reason']);
        $this->assertSame(194.0, $pricing['total_dt']);
    }

    public function test_owner_coupon_above_ceiling_is_honoured_alone_and_client_shipping_is_irrelevant(): void
    {
        $coupon = new Coupon(['code' => 'OWNER15', 'type' => Coupon::TYPE_PERCENT, 'value' => 15]);
        $pricing = $this->price(200, true, 500, 500, $coupon);
        $this->assertSame(30.0, $pricing['coupon']['amount_dt']);
        $this->assertSame(0.0, $pricing['pack']['amount_dt']);
        $this->assertSame(0, $pricing['protinas']['used_points']);
        $this->assertSame(10.0, $pricing['shipping_dt']);
        $this->assertSame(180.0, $pricing['total_dt']);
        $this->assertSame(0.0, $this->price(300, false)['shipping_dt']);
    }

    public function test_promo_line_counts_for_tier_but_gets_no_pack_discount(): void
    {
        $full = new Product(['prix' => 100]);
        $promo = new Product(['prix' => 150, 'promo' => 100]);
        $pricing = app(CheckoutPricingService::class)->price([
            ['product' => $full, 'quantity' => 1], ['product' => $promo, 'quantity' => 1],
        ], null, true, 0, 0, true);
        $this->assertSame(200.0, $pricing['goods_dt']);
        $this->assertSame(100.0, $pricing['full_price_goods_dt']);
        $this->assertSame(3.0, $pricing['pack']['amount_dt']);
    }

    public function test_exactly_200_starts_three_percent_tier_and_room_18950_is_379_points(): void
    {
        $this->assertSame(3, $this->price(200, true)['pack']['percent']);
        $pricing = $this->price(379, true, 1000, 1000);
        $this->assertSame(18.95, $pricing['room_dt']);
        $this->assertSame(379, $pricing['protinas']['max_usable_points']);
    }

    public function test_guest_points_and_balance_overrun_are_rejected(): void
    {
        DB::table('products')->insert(['id' => 1, 'prix' => 90]);
        $body = ['commande' => ['livraison_nom' => 'Client', 'livraison_phone' => '20123456'],
            'panier' => [['produit_id' => 1, 'quantite' => 1]], 'points_to_redeem' => 11];
        $this->postJson('/api/checkout/quote', $body)->assertStatus(422)
            ->assertJsonPath('message', 'Veuillez vous reconnecter pour utiliser vos Protinas.');

        DB::table('users')->insert(['id' => 1, 'name' => 'Client', 'email' => 'test@example.test',
            'points_balance' => 10, 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('personal_access_tokens')->insert(['id' => 1, 'tokenable_type' => 'App\\Models\\User',
            'tokenable_id' => 1, 'name' => 'test', 'token' => hash('sha256', 'secret'),
            'abilities' => '["*"]', 'created_at' => now(), 'updated_at' => now()]);
        $this->withToken('1|secret')->postJson('/api/checkout/quote', $body)->assertStatus(422)
            ->assertJsonPath('message', 'Solde Protina insuffisant');
    }

    public function test_quote_ignores_client_shipping_and_exposes_full_pricing_shape_without_order_writes(): void
    {
        DB::table('products')->insert(['id' => 1, 'prix' => 200]);
        $body = ['commande' => ['livraison_nom' => 'Client', 'livraison_phone' => '20123456',
            'frais_livraison' => 0], 'panier' => [['produit_id' => 1, 'quantite' => 1]],
            'pack_discount' => true];
        $this->postJson('/api/checkout/quote', $body)->assertOk()
            ->assertJsonPath('pricing.shipping_dt', 10)
            ->assertJsonPath('pricing.total_dt', 204)
            ->assertJsonPath('pricing.pack.percent', 3)
            ->assertJsonPath('pricing.protinas.pending_welcome_points', 0);
        $this->getJson('/api/loyalty/rules')->assertOk()
            ->assertJsonPath('points_per_dt', 20)
            ->assertJsonPath('pack.tiers.1.percent', 5)
            ->assertJsonPath('welcome.unlock', 'first_delivered_order');
    }

    public function test_till_60_dt_and_45_dt_examples(): void
    {
        $service = app(LoyaltyService::class);
        $this->assertSame(120, $service->maxRedeemablePoints(60, 0, 450));
        $this->assertSame(6.0, $service->pointsToDiscount(120));
        $this->assertSame(54, $service->calculateEarnablePoints(60, 6));
        $this->assertSame(384, 450 - 120 + 54);
        $this->assertSame(834, 900 - 120 + 54);
        $this->assertSame(0, $service->maxRedeemablePoints(45, 0, 450));
        $this->assertSame(0, $service->maxRedeemablePoints(60, 3, 450));
    }

    public function test_till_conversion_doubles_points_once_without_changing_dinar_value(): void
    {
        Schema::create('clients', function (Blueprint $t): void {
            $t->id(); $t->integer('loyalty_points_balance')->default(0);
        });
        Schema::create('loyalty_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('client_id'); $t->string('type'); $t->integer('points');
            $t->integer('balance_after'); $t->string('description')->nullable(); $t->timestamps();
        });
        DB::table('clients')->insert(['id' => 1, 'loyalty_points_balance' => 319]);
        DB::table('loyalty_point_transactions')->insert(['client_id' => 1, 'type' => 'earn',
            'points' => 319, 'balance_after' => 319, 'created_at' => now(), 'updated_at' => now()]);
        $migration = require base_path('database/migrations/2026_09_29_000300_till_points_to_20_per_dt.php');
        $migration->up();
        $migration->up();
        $this->assertSame(638, (int) DB::table('clients')->where('id', 1)->value('loyalty_points_balance'));
        $this->assertSame(1, DB::table('loyalty_point_transactions')
            ->where('description', 'Conversion barème 20 pts = 1 DT (valeur inchangée)')->count());
        $this->assertSame(31.9, 638 / 20);
    }

    public function test_till_conversion_writes_only_the_columns_the_legacy_ledger_has(): void
    {
        Schema::create('clients', function (Blueprint $t): void {
            $t->id(); $t->integer('loyalty_points_balance')->default(0);
        });
        // The production ledger predates balance_after / processed_by; monetary_value is legacy.
        Schema::create('loyalty_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('client_id'); $t->string('type'); $t->integer('points');
            $t->string('description')->nullable(); $t->decimal('monetary_value', 10, 3)->nullable(); $t->timestamps();
        });
        DB::table('clients')->insert([['id' => 1, 'loyalty_points_balance' => 319], ['id' => 2, 'loyalty_points_balance' => 40]]);
        DB::table('loyalty_point_transactions')->insert([
            ['client_id' => 1, 'type' => 'earn', 'points' => 319, 'created_at' => now()->subDay(), 'updated_at' => now()->subDay()],
            ['client_id' => 2, 'type' => 'earn', 'points' => 319, 'created_at' => now()->subDay(), 'updated_at' => now()->subDay()],
        ]);
        $this->assertSame([1, 2], TillPointsConversion::unconvertedClientIds());
        $migration = require base_path('database/migrations/2026_09_29_000300_till_points_to_20_per_dt.php');
        $migration->up();
        $migration->up();
        $this->assertSame(638, (int) DB::table('clients')->where('id', 1)->value('loyalty_points_balance'));
        $this->assertSame(80, (int) DB::table('clients')->where('id', 2)->value('loyalty_points_balance')); // stored balance wins
        $markers = DB::table('loyalty_point_transactions')->where('description', TillPointsConversion::MARKER)
            ->orderBy('client_id')->get();
        $this->assertCount(2, $markers);
        $this->assertSame(319, (int) $markers[0]->points);
        $this->assertEquals(15.95, (float) $markers[0]->monetary_value);
        $this->assertSame(-239, (int) $markers[1]->points);
        $this->assertSame(638, (int) DB::table('loyalty_point_transactions')->where('client_id', 1)->sum('points'));
        $this->assertSame([], TillPointsConversion::unconvertedClientIds());
    }

    public function test_till_conversion_never_throws_and_the_audit_lists_cards_it_could_not_convert(): void
    {
        Schema::create('clients', function (Blueprint $t): void {
            $t->id(); $t->integer('loyalty_points_balance')->default(0);
        });
        // A NOT NULL column without default that the conversion cannot fill: every insert fails.
        Schema::create('loyalty_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('client_id'); $t->string('type'); $t->integer('points');
            $t->string('description')->nullable(); $t->unsignedBigInteger('created_by'); $t->timestamps();
        });
        DB::table('clients')->insert(['id' => 1, 'loyalty_points_balance' => 319]);
        $migration = require base_path('database/migrations/2026_09_29_000300_till_points_to_20_per_dt.php');
        $migration->up();
        $this->assertSame(319, (int) DB::table('clients')->where('id', 1)->value('loyalty_points_balance'));
        $this->assertSame(1, app(TillPointsConversion::class)->run(true)['converted']);
        $this->assertSame([1], TillPointsConversion::unconvertedClientIds());
    }

    public function test_order_backfill_labels_pack_only_on_storefront_orders(): void
    {
        Schema::create('commandes', function (Blueprint $t): void {
            $t->id(); $t->decimal('remise', 10, 3)->default(0); $t->unsignedBigInteger('quotation_id')->nullable();
            $t->unsignedBigInteger('affilie_id')->nullable(); $t->string('checkout_payload_hash')->nullable();
            $t->timestamp('created_at')->nullable();
        });
        Schema::create('user_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('commande_id')->nullable();
            $t->string('type'); $t->integer('points');
        });
        $september = '2026-09-20 10:00:00';
        DB::table('commandes')->insert([
            ['id' => 1, 'remise' => 45.32, 'quotation_id' => null, 'affilie_id' => null, 'checkout_payload_hash' => null, 'created_at' => $september],
            ['id' => 2, 'remise' => 25, 'quotation_id' => 7, 'affilie_id' => null, 'checkout_payload_hash' => null, 'created_at' => $september],
            ['id' => 3, 'remise' => 10, 'quotation_id' => null, 'affilie_id' => 3, 'checkout_payload_hash' => null, 'created_at' => $september],
            ['id' => 4, 'remise' => 12, 'quotation_id' => null, 'affilie_id' => 3, 'checkout_payload_hash' => 'abc', 'created_at' => $september],
            ['id' => 5, 'remise' => 20, 'quotation_id' => null, 'affilie_id' => null, 'checkout_payload_hash' => null, 'created_at' => '2026-05-01 10:00:00'],
        ]);
        DB::table('user_point_transactions')->insert(['commande_id' => 1, 'type' => 'redeem', 'points' => -300]);
        (require base_path('database/migrations/2026_09_29_000100_add_checkout_discount_breakdown.php'))->up();
        $pack = DB::table('commandes')->orderBy('id')->pluck('pack_discount_ht', 'id')->map(fn ($v) => (float) $v)->all();
        $this->assertSame([1 => 30.32, 2 => 0.0, 3 => 0.0, 4 => 12.0, 5 => 0.0], $pack);
        $this->assertSame(300, (int) DB::table('commandes')->where('id', 1)->value('points_redeemed'));
    }

    public function test_order_backfill_separates_0453_pack_and_grandfathered_points(): void
    {
        Schema::create('commandes', function (Blueprint $t): void {
            $t->id(); $t->decimal('remise', 10, 3)->default(0);
        });
        Schema::create('user_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('commande_id')->nullable();
            $t->string('type'); $t->integer('points');
        });
        DB::table('commandes')->insert(['id' => 453, 'remise' => 45.32]);
        DB::table('user_point_transactions')->insert(['commande_id' => 453, 'type' => 'redeem', 'points' => -300]);
        $migration = require base_path('database/migrations/2026_09_29_000100_add_checkout_discount_breakdown.php');
        $migration->up();
        $order = DB::table('commandes')->where('id', 453)->first();
        $this->assertSame(300, (int) $order->points_redeemed);
        $this->assertSame(15.0, (float) $order->points_discount_ht);
        $this->assertSame(30.32, (float) $order->pack_discount_ht);
    }
}
