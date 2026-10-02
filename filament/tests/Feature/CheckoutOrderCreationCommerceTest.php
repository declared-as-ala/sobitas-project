<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * POST /api/add_commande and /api/checkout/quote end to end on in-memory SQLite: what an order
 * stores, what rolls back, and what a crafted or legacy body can no longer obtain.
 */
class CheckoutOrderCreationCommerceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'cache.default' => 'array', 'queue.default' => 'sync', 'mail.admin_emails' => [],
            'services.whatsapp.autosend' => false,
            'loyalty.checkout.max_total_discount_percent' => 10,
            'loyalty.checkout.delivery_fee_dt' => 10,
            'loyalty.checkout.free_delivery_from_dt' => 300,
            'loyalty.checkout.total_mismatch_tolerance_dt' => 0.01,
            'loyalty.checkout.quote_throttle_per_minute' => 60,
            'loyalty.pack.tiers' => [['from_dt' => 200, 'percent' => 3], ['from_dt' => 350, 'percent' => 5], ['from_dt' => 500, 'percent' => 7]],
            'loyalty.pack.exclude_promo_lines' => true,
            'loyalty.points.points_per_dt' => 20, 'loyalty.points.earn_per_dt' => 1,
        ]);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        // NumberSequence::getNextFor() speaks MySQL (INSERT IGNORE … NOW()). Translate exactly those
        // two tokens so the real order-numbering code runs inside the real order transaction.
        $pdo = new class('sqlite::memory:', null, null, [
            \PDO::ATTR_CASE => \PDO::CASE_NATURAL,
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_ORACLE_NULLS => \PDO::NULL_NATURAL,
            \PDO::ATTR_STRINGIFY_FETCHES => false,
        ]) extends \PDO {
            public function prepare(string $query, array $options = []): \PDOStatement|false
            {
                return parent::prepare(str_replace(
                    ['INSERT IGNORE INTO', 'NOW()'], ['INSERT OR IGNORE INTO', 'CURRENT_TIMESTAMP'], $query
                ), $options);
            }
        };
        DB::connection('sqlite')->setPdo($pdo)->setReadPdo($pdo);
        // Order confirmation jobs (SMS, e-mail) and admin notifications must never leave the test.
        Bus::fake();
        Mail::fake();
        Notification::fake();
        // vps-run's commerce-flow-tests runs inside the production container, where the rate
        // limiter was bound to Redis at boot (setting cache.default above does not rebind it). Start
        // every test from an empty coupon bucket, and keep the route throttles (api write bucket,
        // checkout-quote) out of it: they would count this class's requests across tests.
        RateLimiter::clear('coupon-apply:127.0.0.1');
        $this->withoutMiddleware(ThrottleRequests::class);

        Schema::create('users', function (Blueprint $t): void {
            $t->id(); $t->string('name'); $t->string('email')->unique(); $t->string('phone')->nullable();
            $t->string('password')->nullable(); $t->unsignedInteger('role_id')->default(2);
            $t->integer('points_balance')->default(0);
            $t->timestamp('email_verified_at')->nullable(); $t->timestamp('phone_verified_at')->nullable();
            $t->boolean('welcome_bonus_eligible')->default(true); $t->timestamp('welcome_bonus_awarded_at')->nullable();
            $t->rememberToken(); $t->timestamps();
        });
        Schema::create('personal_access_tokens', function (Blueprint $t): void {
            $t->id(); $t->morphs('tokenable'); $t->string('name'); $t->string('token', 64)->unique();
            $t->text('abilities')->nullable(); $t->timestamp('last_used_at')->nullable();
            $t->timestamp('expires_at')->nullable(); $t->timestamps();
        });
        Schema::create('clients', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id')->nullable(); $t->string('name')->nullable();
            $t->string('email')->nullable(); $t->string('phone_1')->nullable(); $t->string('phone_2')->nullable();
            $t->string('adresse')->nullable(); $t->string('region')->nullable(); $t->string('ville')->nullable();
            $t->string('code_postale')->nullable(); $t->string('source')->nullable(); $t->boolean('sms')->default(false);
            $t->timestamps();
        });
        Schema::create('products', function (Blueprint $t): void {
            $t->id(); $t->string('designation_fr')->nullable(); $t->decimal('prix', 12, 3);
            $t->decimal('promo', 12, 3)->nullable(); $t->date('promo_expiration_date')->nullable();
            $t->integer('qte')->default(0); $t->boolean('rupture')->default(false); $t->timestamps();
        });
        Schema::create('commandes', function (Blueprint $t): void {
            $t->id();
            foreach (['numero', 'order_token', 'nom', 'prenom', 'email', 'phone', 'pays', 'region', 'ville', 'code_postale',
                'adresse1', 'adresse2', 'note', 'etat', 'livraison_nom', 'livraison_prenom', 'livraison_email',
                'livraison_phone', 'livraison_region', 'livraison_ville', 'livraison_code_postale', 'livraison_adresse1',
                'livraison_adresse2', 'checkout_idempotency_key', 'checkout_payload_hash', 'coupon_code_snapshot',
                'coupon_type_snapshot'] as $column) {
                $t->string($column)->nullable();
            }
            $t->unsignedTinyInteger('livraison')->nullable();
            foreach (['prix_ht', 'prix_ttc', 'frais_livraison', 'remise', 'discount_ht', 'discount_ttc', 'discount_amount',
                'pack_discount_ht', 'points_discount_ht', 'coupon_value_snapshot'] as $column) {
                $t->decimal($column, 12, 3)->nullable();
            }
            $t->unsignedInteger('points_redeemed')->default(0);
            foreach (['user_id', 'client_id', 'authenticated_user_id', 'coupon_id', 'affilie_id'] as $column) {
                $t->unsignedBigInteger($column)->nullable();
            }
            $t->timestamps();
        });
        Schema::create('commande_details', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('commande_id'); $t->unsignedBigInteger('produit_id');
            $t->integer('qte'); $t->string('arome')->nullable();
            foreach (['prix_unitaire', 'prix_ht', 'prix_ttc'] as $column) $t->decimal($column, 12, 3);
        });
        Schema::create('number_sequences', function (Blueprint $t): void {
            $t->id(); $t->string('name'); $t->integer('year'); $t->unsignedInteger('last_number')->default(0);
            $t->timestamps(); $t->unique(['name', 'year']);
        });
        Schema::create('coupons', function (Blueprint $t): void {
            $t->id(); $t->string('code'); $t->string('type'); $t->decimal('value', 12, 3)->default(0);
            $t->timestamp('starts_at')->nullable(); $t->timestamp('ends_at')->nullable();
            $t->boolean('is_active')->default(true); $t->boolean('is_affilie_code')->default(false);
            $t->string('applies_channel')->nullable(); $t->unsignedBigInteger('affilie_id')->nullable();
            $t->decimal('min_order_amount', 12, 3)->nullable(); $t->decimal('max_discount_amount', 12, 3)->nullable();
            $t->unsignedInteger('usage_limit_total')->nullable(); $t->unsignedInteger('usage_limit_per_client')->nullable();
            $t->timestamps();
        });
        Schema::create('coupon_redemptions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('coupon_id'); $t->unsignedBigInteger('order_id')->nullable();
            $t->unsignedBigInteger('ticket_id')->nullable(); $t->unsignedBigInteger('client_id')->nullable();
            $t->string('phone_snapshot')->nullable(); $t->string('email_snapshot')->nullable();
            $t->decimal('discount_amount_ht', 12, 3)->nullable(); $t->decimal('discount_amount_ttc', 12, 3)->nullable();
            $t->timestamps();
        });
        Schema::create('coordinates', function (Blueprint $t): void {
            $t->id(); $t->decimal('tva', 5, 2)->nullable(); $t->timestamps();
        });
        Schema::create('messages', function (Blueprint $t): void {
            $t->id(); $t->text('msg_passez_commande')->nullable(); $t->text('msg_etat_commande')->nullable(); $t->timestamps();
        });
        Schema::create('user_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id'); $t->unsignedBigInteger('commande_id')->nullable();
            $t->string('type'); $t->integer('points'); $t->integer('balance_after');
            $t->string('description')->nullable(); $t->string('idempotency_key')->nullable()->unique();
            $t->timestamps();
        });
        Schema::create('welcome_bonus_claims', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id')->unique(); $t->unsignedInteger('points');
            $t->timestamp('credited_at')->nullable(); $t->timestamp('created_at')->nullable();
        });
    }

    private function product(float $price, int $stock = 5): void
    {
        DB::table('products')->insert(['id' => 1, 'designation_fr' => 'Whey test', 'prix' => $price, 'qte' => $stock,
            'created_at' => now(), 'updated_at' => now()]);
    }

    private function coupon(string $code, string $type, float $value): void
    {
        DB::table('coupons')->insert(['code' => $code, 'type' => $type, 'value' => $value, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now()]);
    }

    /** A phone-verified account holding $balance Protinas; returns its bearer token. */
    private function customer(int $balance): string
    {
        DB::table('users')->insert(['id' => 1, 'name' => 'Client', 'email' => 'client@example.test',
            'points_balance' => $balance, 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        return User::findOrFail(1)->createToken('test')->plainTextToken;
    }

    private function order(array $extra = [], array $commande = []): array
    {
        return array_merge([
            'commande' => array_merge([
                'livraison_nom' => 'Client Test', 'livraison_phone' => '20123456',
                'livraison_region' => 'Tunis', 'livraison_ville' => 'Tunis', 'livraison_adresse1' => '12 rue Test',
                'livraison' => 1, 'frais_livraison' => 10,
            ], $commande),
            'panier' => [['produit_id' => 1, 'quantite' => 1]],
        ], $extra);
    }

    private function assertNothingWritten(int $stock): void
    {
        $this->assertSame($stock, (int) DB::table('products')->where('id', 1)->value('qte'));
        $this->assertSame(0, DB::table('commandes')->count());
        $this->assertSame(0, DB::table('commande_details')->count());
        $this->assertSame(0, DB::table('coupon_redemptions')->count());
        $this->assertSame(0, DB::table('user_point_transactions')->count());
    }

    public function test_pack_better_stores_pack_only_and_leaves_the_coupon_unconsumed(): void
    {
        $this->product(200);
        $this->coupon('TIE3', 'percent', 3);
        $this->postJson('/api/add_commande', $this->order(['coupon_code' => 'TIE3', 'pack_discount' => true, 'expected_total' => 204]))
            ->assertCreated()
            ->assertJsonPath('pricing.coupon.applied', false)
            ->assertJsonPath('pricing.coupon.reason', 'pack_better');
        $order = DB::table('commandes')->first();
        $this->assertNull($order->coupon_id);
        $this->assertNull($order->coupon_code_snapshot);
        $this->assertEquals(0, $order->discount_ht);
        $this->assertEquals(6, $order->pack_discount_ht);
        $this->assertEquals(6, $order->remise);
        $this->assertEquals(10, $order->frais_livraison);
        $this->assertEquals(204, $order->prix_ttc);
        $this->assertSame(0, DB::table('coupon_redemptions')->count());
        $this->assertSame(4, (int) DB::table('products')->where('id', 1)->value('qte'));
    }

    public function test_900_points_on_90_dt_debits_only_the_180_the_ceiling_allows(): void
    {
        $this->product(90);
        $token = $this->customer(900);
        $this->withToken($token)
            ->postJson('/api/add_commande', $this->order(['points_to_redeem' => 900, 'expected_total' => 91]))
            ->assertCreated()
            ->assertJsonPath('pricing.protinas.used_points', 180)
            ->assertJsonPath('pricing.total_dt', 91);
        $order = DB::table('commandes')->first();
        $this->assertSame(180, (int) $order->points_redeemed);
        $this->assertEquals(9, $order->points_discount_ht);
        $this->assertEquals(91, $order->prix_ttc);
        $this->assertSame(1, (int) $order->authenticated_user_id);
        $ledger = DB::table('user_point_transactions')->get();
        $this->assertCount(1, $ledger);
        $this->assertSame('redeem', $ledger[0]->type);
        $this->assertSame(-180, (int) $ledger[0]->points);
        $this->assertSame('order:'.$order->id.':redeem', $ledger[0]->idempotency_key);
        $this->assertSame(720, (int) DB::table('users')->where('id', 1)->value('points_balance'));
    }

    public function test_expected_total_mismatch_returns_409_and_rolls_back_stock_numbering_and_rows(): void
    {
        $this->product(100);
        $this->postJson('/api/add_commande', $this->order(['expected_total' => 50]))
            ->assertStatus(409)
            ->assertJsonPath('pricing.total_dt', 110)
            ->assertJsonPath('message', 'Le total de votre commande a changé : 110.00 DT à payer à la livraison.');
        $this->assertNothingWritten(5);
        $this->assertSame(0, DB::table('clients')->count());
        $this->assertSame(0, DB::table('number_sequences')->count());
    }

    public function test_client_shipping_is_ignored_and_a_guest_order_is_marked_unauthenticated(): void
    {
        $this->product(120);
        $this->postJson('/api/add_commande', $this->order(['expected_total' => 130], ['frais_livraison' => 0]))
            ->assertCreated()
            ->assertJsonPath('pricing.shipping_dt', 10);
        $order = DB::table('commandes')->first();
        $this->assertEquals(10, $order->frais_livraison);
        $this->assertEquals(130, $order->prix_ttc);
        $this->assertSame(1, (int) $order->livraison);
        $this->assertSame(0, (int) $order->authenticated_user_id);
        $this->assertSame((int) DB::table('clients')->value('id'), (int) $order->user_id);
        $this->assertSame(date('Y').'/0001', $order->numero);
    }

    public function test_crafted_livraison_flag_is_rejected_instead_of_zeroing_shipping(): void
    {
        $this->product(120);
        foreach ([0, '0', [1]] as $livraison) {
            $this->postJson('/api/add_commande', $this->order(['expected_total' => 120], ['livraison' => $livraison]))
                ->assertStatus(422)->assertJsonValidationErrors('commande.livraison');
            $this->postJson('/api/checkout/quote', $this->order([], ['livraison' => $livraison]))
                ->assertStatus(422)->assertJsonValidationErrors('commande.livraison');
        }
        $this->assertNothingWritten(5);
        $this->postJson('/api/checkout/quote', $this->order())->assertOk()->assertJsonPath('pricing.shipping_dt', 10);
    }

    public function test_legacy_client_without_expected_total_cannot_overspend_points(): void
    {
        $this->product(90);
        $token = $this->customer(900);
        $this->withToken($token)->postJson('/api/add_commande', $this->order(['points_to_redeem' => 900]))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Vos Protinas sont limitées à 180 pts (9.00 DT) sur cette commande (10 % des articles). Réduisez-les pour continuer.');
        $this->assertNothingWritten(5);
        $this->assertSame(900, (int) DB::table('users')->where('id', 1)->value('points_balance'));

        // Within the maximum the same old client still orders, at the total it showed.
        $this->withToken($token)->postJson('/api/add_commande', $this->order(['points_to_redeem' => 180]))
            ->assertCreated()->assertJsonPath('pricing.total_dt', 91);
    }

    public function test_legacy_client_cannot_stack_a_goods_coupon_with_the_pack(): void
    {
        $this->product(200);
        $this->coupon('PROMO10', 'percent', 10);
        $this->postJson('/api/add_commande', $this->order(['coupon_code' => 'PROMO10', 'pack_discount' => true]))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Code promo et remise pack ne se cumulent pas : retirez le code ou la remise pack pour continuer.');
        $this->assertNothingWritten(5);

        // A free-shipping coupon is not a goods discount: it still combines with the pack.
        $this->coupon('SHIP', 'free_shipping', 0);
        $this->postJson('/api/add_commande', $this->order(['coupon_code' => 'SHIP', 'pack_discount' => true]))
            ->assertCreated()
            ->assertJsonPath('pricing.free_shipping_reason', 'coupon')
            ->assertJsonPath('pricing.total_dt', 194);
        $this->assertSame(1, DB::table('coupon_redemptions')->count());
    }

    public function test_quote_works_before_the_delivery_form_is_filled(): void
    {
        $this->product(200);
        $panier = [['produit_id' => 1, 'quantite' => 1]];
        $this->postJson('/api/checkout/quote', ['panier' => $panier, 'pack_discount' => true])
            ->assertOk()->assertJsonPath('pricing.total_dt', 204)->assertJsonPath('pricing.shipping_dt', 10);
        $this->postJson('/api/checkout/quote', ['commande' => ['livraison_nom' => null, 'livraison_phone' => '', 'livraison' => 1],
            'panier' => $panier])->assertOk()->assertJsonPath('pricing.total_dt', 210);

        // A coupon is validated even with no identity at all.
        $this->coupon('PROMO10', 'percent', 10);
        $this->postJson('/api/checkout/quote', ['panier' => $panier, 'coupon_code' => 'PROMO10'])
            ->assertOk()->assertJsonPath('pricing.coupon.applied', true)->assertJsonPath('pricing.coupon.amount_dt', 20);

        // Once typed, a phone must still be a Tunisian number.
        $this->postJson('/api/checkout/quote', ['commande' => ['livraison_phone' => '123'], 'panier' => $panier])
            ->assertStatus(422)->assertJsonValidationErrors('commande.livraison_phone');
        $this->assertSame(0, DB::table('commandes')->count());
        $this->assertSame(0, DB::table('clients')->count());
    }

    public function test_coupon_guessing_shares_the_coupon_apply_limit_across_quote_and_order(): void
    {
        $this->product(200);
        $this->coupon('PROMO10', 'percent', 10);
        $panier = [['produit_id' => 1, 'quantite' => 1]];
        // Re-quoting a real code on every cart change costs nothing.
        for ($i = 0; $i < 12; $i++) {
            $this->postJson('/api/checkout/quote', ['panier' => $panier, 'coupon_code' => 'PROMO10'])
                ->assertOk()->assertJsonPath('pricing.coupon.applied', true);
        }
        // Unknown codes do, in the same bucket as /coupons/apply.
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/checkout/quote', ['panier' => $panier, 'coupon_code' => 'GUESS'.$i])
                ->assertOk()->assertJsonPath('pricing.coupon.applied', false);
        }
        $this->assertTrue(RateLimiter::tooManyAttempts('coupon-apply:127.0.0.1', 10));
        $this->postJson('/api/checkout/quote', ['panier' => $panier, 'coupon_code' => 'PROMO10'])
            ->assertOk()
            ->assertJsonPath('pricing.coupon.applied', false)
            ->assertJsonPath('pricing.coupon.reason', 'too_many_attempts')
            ->assertJsonPath('pricing.total_dt', 210);

        // The order endpoint refuses a coupon while the bucket is spent, and writes nothing…
        $this->postJson('/api/add_commande', $this->order(['coupon_code' => 'PROMO10', 'expected_total' => 190]))
            ->assertStatus(422);
        $this->assertNothingWritten(5);
        // …but an order without a code is unaffected.
        $this->postJson('/api/add_commande', $this->order(['expected_total' => 210]))->assertCreated();
    }

    public function test_an_unknown_code_on_the_order_endpoint_costs_one_attempt_even_when_rolled_back(): void
    {
        $this->product(200);
        $this->postJson('/api/add_commande', $this->order(['coupon_code' => 'NOPE', 'expected_total' => 210]))
            ->assertCreated()->assertJsonPath('pricing.coupon.applied', false);
        $this->assertSame(1, RateLimiter::attempts('coupon-apply:127.0.0.1'));
        $this->postJson('/api/add_commande', $this->order(['coupon_code' => 'NOPE', 'expected_total' => 1]))
            ->assertStatus(409);
        $this->assertSame(2, RateLimiter::attempts('coupon-apply:127.0.0.1'));
    }
}
