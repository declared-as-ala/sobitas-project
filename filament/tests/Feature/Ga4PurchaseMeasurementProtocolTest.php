<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\CommandeController;
use App\Jobs\SendGa4PurchaseJob;
use App\Models\Commande;
use App\Services\Analytics\Ga4MeasurementProtocol;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * GA4 server-side `purchase` (Measurement Protocol) for storefront orders, end to end on in-memory
 * SQLite: when POST /api/add_commande queues it, what the payload carries (and never carries), the
 * once-only ledger, and that nothing about analytics can cost a cash-on-delivery order.
 *
 * Same in-memory setup as CheckoutOrderCreationCommerceTest. The ga4 config is set explicitly with
 * dummy values and every HTTP call is faked, so no request ever reaches Google.
 */
class Ga4PurchaseMeasurementProtocolTest extends TestCase
{
    private const KEY = 'storefront-ga4-test-0001';

    private const SECRET = 'unit-test-secret-value';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'cache.default' => 'array', 'queue.default' => 'sync', 'mail.admin_emails' => [],
            'services.whatsapp.autosend' => false,
            'services.ga4' => ['measurement_id' => 'G-TEST000000', 'api_secret' => self::SECRET, 'mode' => 'fallback', 'debug' => false],
            'loyalty.rules_version' => 2,
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
        // NumberSequence::getNextFor() speaks MySQL (INSERT IGNORE … NOW()).
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
        // Bus is faked per test (see fakeJobs) because one test lets the GA4 job run for real.
        Mail::fake();
        Notification::fake();
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
            $t->id(); $t->string('designation_fr')->nullable(); $t->string('slug')->nullable(); $t->string('cover')->nullable();
            $t->decimal('prix', 12, 3); $t->decimal('promo', 12, 3)->nullable(); $t->date('promo_expiration_date')->nullable();
            $t->integer('qte')->default(0); $t->boolean('rupture')->default(false);
            $t->unsignedBigInteger('brand_id')->nullable(); $t->unsignedBigInteger('sous_categorie_id')->nullable();
            $t->timestamps();
        });
        Schema::create('brands', function (Blueprint $t): void {
            $t->id(); $t->string('designation_fr')->nullable();
        });
        Schema::create('categs', function (Blueprint $t): void {
            $t->id(); $t->string('designation_fr')->nullable();
        });
        Schema::create('sous_categories', function (Blueprint $t): void {
            $t->id(); $t->string('designation_fr')->nullable(); $t->string('slug')->nullable();
            $t->unsignedBigInteger('categorie_id')->nullable();
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
        // Same shape as 2026_08_26_000001 (status is an enum there).
        Schema::create('notification_deliveries', function (Blueprint $t): void {
            $t->id(); $t->string('event_key', 190)->unique(); $t->string('channel', 16)->index();
            $t->string('recipient_hash', 64); $t->string('status')->default('sending');
            $t->unsignedTinyInteger('attempts')->default(1); $t->string('provider_reference', 190)->nullable();
            $t->text('last_error')->nullable(); $t->timestamp('sent_at')->nullable(); $t->timestamps();
        });

        DB::table('categs')->insert(['id' => 3, 'designation_fr' => 'Protéines']);
        DB::table('sous_categories')->insert(['id' => 7, 'designation_fr' => 'Whey protéine', 'slug' => 'whey-proteine', 'categorie_id' => 3]);
        DB::table('brands')->insert(['id' => 5, 'designation_fr' => 'Optimum Nutrition']);
        DB::table('products')->insert(['id' => 1, 'designation_fr' => '  Gold Standard   100% Whey 2,27 kg ',
            'slug' => 'gold-standard-100-whey-2-27-kg', 'prix' => 100, 'qte' => 50, 'brand_id' => 5, 'sous_categorie_id' => 7,
            'created_at' => now(), 'updated_at' => now()]);
    }

    /** Order confirmation jobs (SMS, e-mail) never leave the test; the GA4 job runs for real only when asked. */
    private function fakeJobs(bool $runGa4Job = false): void
    {
        $fake = Bus::fake();
        if ($runGa4Job) {
            $fake->except([SendGa4PurchaseJob::class]);
        }
    }

    /** 2 × 100 DT + 10 DT delivery = 210 DT, paid on delivery. */
    private function order(array $extra = []): array
    {
        return array_merge([
            'commande' => [
                'livraison_nom' => 'Client Test', 'livraison_phone' => '20123456', 'livraison_email' => 'client@example.test',
                'livraison_region' => 'Tunis', 'livraison_ville' => 'Tunis', 'livraison_adresse1' => '12 rue Test',
                'livraison' => 1,
            ],
            'panier' => [['produit_id' => 1, 'quantite' => 2, 'arome' => 'Double Rich Chocolate']],
            'expected_total' => 210,
        ], $extra);
    }

    private function placeOrder(array $extra = [], ?string $key = self::KEY): TestResponse
    {
        return $this->postJson('/api/add_commande', $this->order($extra), $key === null ? [] : ['Idempotency-Key' => $key]);
    }

    private function ga4(): Ga4MeasurementProtocol
    {
        return app(Ga4MeasurementProtocol::class);
    }

    public function test_without_measurement_id_and_secret_nothing_is_queued(): void
    {
        $this->fakeJobs();
        config(['services.ga4.measurement_id' => '', 'services.ga4.api_secret' => '']);
        $this->assertFalse($this->ga4()->enabled());
        $this->placeOrder(['ga' => ['client_id' => null, 'session_id' => null]])->assertCreated();

        // Mode off, or a mode nobody wrote on purpose, is just as inert.
        foreach (['off', 'fallbak'] as $i => $mode) {
            config(['services.ga4.measurement_id' => 'G-TEST000000', 'services.ga4.api_secret' => self::SECRET, 'services.ga4.mode' => $mode]);
            $this->assertFalse($this->ga4()->enabled());
            $this->placeOrder(['ga' => ['client_id' => null]], 'storefront-ga4-mode-'.$i.'-key')->assertCreated();
        }

        Bus::assertNotDispatched(SendGa4PurchaseJob::class);
        $this->assertSame(3, DB::table('commandes')->count());
    }

    public function test_fallback_queues_only_when_the_browser_reported_no_client_id(): void
    {
        $this->fakeJobs();

        // gtag.js blocked: client_id is null → the server sends, under a gtag-shaped placeholder id.
        $id = $this->placeOrder(['ga' => ['client_id' => null, 'session_id' => '1728000000']])->assertCreated()->json('id');
        Bus::assertDispatchedTimes(SendGa4PurchaseJob::class, 1);
        Bus::assertDispatched(SendGa4PurchaseJob::class, fn (SendGa4PurchaseJob $job): bool => $job->commandeId === (int) $id
            && preg_match('/^\d{10}\.\d{10}$/', $job->clientId) === 1
            && $job->sessionId === '1728000000');

        // gtag.js ran: the browser reported the purchase itself.
        $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'session_id' => '1728000000']], 'storefront-ga4-test-0002')
            ->assertCreated();
        // An old cached frontend sends no `ga` key at all, and still reports from the browser.
        $this->placeOrder([], 'storefront-ga4-test-0003')->assertCreated();
        // Not a storefront order (no Idempotency-Key): never sent.
        $this->placeOrder(['ga' => ['client_id' => null]], null)->assertCreated();

        Bus::assertDispatchedTimes(SendGa4PurchaseJob::class, 1);
        $this->assertSame(4, DB::table('commandes')->count());
    }

    public function test_fallback_follows_the_browser_gtag_loaded_flag_over_the_ga_cookie(): void
    {
        $this->fakeJobs();

        // An ad blocker installed after an earlier visit: the `_ga` cookie survives, gtag.js never
        // boots and the browser does not send. The server sends, under the real client id.
        $lost = $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'session_id' => '1728000000', 'gtag_loaded' => false]])
            ->assertCreated()
            // The response tells the storefront not to send its own purchase.
            ->assertJsonPath('ga4_server_purchase', true)
            ->json('id');
        Bus::assertDispatched(SendGa4PurchaseJob::class, fn (SendGa4PurchaseJob $job): bool => $job->commandeId === (int) $lost
            && $job->clientId === '1234567890.1728000000' && $job->sessionId === '1728000000');

        // gtag.js ran with first-party cookies refused: no `_ga`, but the browser sends the purchase.
        $this->placeOrder(['ga' => ['client_id' => null, 'session_id' => null, 'gtag_loaded' => true]], 'storefront-ga4-test-0002')
            ->assertCreated()
            ->assertJsonMissingPath('ga4_server_purchase');

        // A non-boolean flag is ignored and the cookie rule decides (here: client id known → quiet).
        $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'gtag_loaded' => 'no']], 'storefront-ga4-test-0003')
            ->assertCreated();

        Bus::assertDispatchedTimes(SendGa4PurchaseJob::class, 1);
    }

    public function test_always_mode_sends_every_storefront_order_with_the_browser_client_id_when_known(): void
    {
        $this->fakeJobs();
        config(['services.ga4.mode' => 'always']);

        $withId = $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'session_id' => '1728000001']])->json('id');
        $withoutGa = $this->placeOrder([], 'storefront-ga4-test-0002')->json('id');
        $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000']], null)->assertCreated();

        Bus::assertDispatchedTimes(SendGa4PurchaseJob::class, 2);
        Bus::assertDispatched(SendGa4PurchaseJob::class, fn (SendGa4PurchaseJob $job): bool => $job->commandeId === (int) $withId
            && $job->clientId === '1234567890.1728000000' && $job->sessionId === '1728000001');
        Bus::assertDispatched(SendGa4PurchaseJob::class, fn (SendGa4PurchaseJob $job): bool => $job->commandeId === (int) $withoutGa
            && preg_match('/^\d{10}\.\d{10}$/', $job->clientId) === 1 && $job->sessionId === null);
    }

    public function test_malformed_ga_still_creates_the_order_and_queues_nothing(): void
    {
        $this->fakeJobs();
        $malformed = [
            ['client_id' => 'abc'],
            ['client_id' => '1.2.3', 'session_id' => 'not-a-number'],
            ['client_id' => ['nested'], 'session_id' => ['x']],
            ['client_id' => 12.5],
            'garbage',
            42,
        ];
        foreach ($malformed as $i => $ga) {
            $this->placeOrder(['ga' => $ga], 'storefront-ga4-malformed-'.$i)
                ->assertCreated()
                ->assertJsonPath('replayed', false);
        }

        Bus::assertNotDispatched(SendGa4PurchaseJob::class);
        $this->assertSame(count($malformed), DB::table('commandes')->count());
    }

    public function test_purchase_payload_carries_real_items_and_no_personal_data(): void
    {
        $this->fakeJobs();
        $id = $this->placeOrder(['ga' => ['client_id' => null]])->assertCreated()->json('id');
        $order = Commande::findOrFail($id);

        $payload = $this->ga4()->purchasePayload($order, '1234567890.1728000000', '1728000000');

        $this->assertSame('1234567890.1728000000', $payload['client_id']);
        $this->assertSame($order->created_at->getTimestamp() * 1000000, $payload['timestamp_micros']);
        $this->assertCount(1, $payload['events']);
        $this->assertSame('purchase', $payload['events'][0]['name']);

        $params = $payload['events'][0]['params'];
        $this->assertSame($order->numero, $params['transaction_id']);
        $this->assertSame(date('Y').'/0001', $params['transaction_id']);
        $this->assertSame('TND', $params['currency']);
        $this->assertEquals((float) $order->prix_ttc - (float) $order->frais_livraison, $params['value']);
        $this->assertEquals(200, $params['value']);
        $this->assertEquals(10, $params['shipping']);
        $this->assertSame(0, $params['tax']);
        $this->assertSame('1728000000', $params['session_id']);
        $this->assertSame(1, $params['engagement_time_msec']);
        $this->assertArrayNotHasKey('coupon', $params);

        $this->assertCount(1, $params['items']);
        $item = $params['items'][0];
        $this->assertSame('1', $item['item_id']);
        $this->assertSame('Gold Standard 100% Whey 2,27 kg', $item['item_name']);
        $this->assertStringNotContainsString('Produit', $item['item_name']);
        $this->assertSame('Optimum Nutrition', $item['item_brand']);
        $this->assertSame('Protéines', $item['item_category']);
        $this->assertSame('Whey protéine', $item['item_category2']);
        $this->assertSame('Double Rich Chocolate', $item['item_variant']);
        $this->assertEquals(100, $item['price']);
        $this->assertSame(2, $item['quantity']);

        // Nothing that identifies the customer reaches Google.
        $json = (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        foreach (['20123456', 'Client Test', 'client@example.test', '12 rue Test', 'user_id', 'order_token'] as $personal) {
            $this->assertStringNotContainsString($personal, $json);
        }

        // Without a session id there is no session_id / engagement_time_msec; an item without a
        // designation falls back to its slug, never "Produit N".
        DB::table('products')->where('id', 1)->update(['designation_fr' => null]);
        $params = $this->ga4()->purchasePayload($order, '1.2', null)['events'][0]['params'];
        $this->assertArrayNotHasKey('session_id', $params);
        $this->assertArrayNotHasKey('engagement_time_msec', $params);
        $this->assertSame('gold-standard-100-whey-2-27-kg', $params['items'][0]['item_name']);

        // GA4 refuses events back-dated beyond 72 hours: an older order is sent without a timestamp.
        DB::table('commandes')->where('id', $id)->update(['created_at' => now()->subHours(73)]);
        $this->assertArrayNotHasKey('timestamp_micros', $this->ga4()->purchasePayload(Commande::findOrFail($id), '1.2', null));
    }

    public function test_running_the_job_twice_sends_one_request(): void
    {
        $this->fakeJobs();
        $id = (int) $this->placeOrder(['ga' => ['client_id' => null]])->assertCreated()->json('id');
        $numero = Commande::findOrFail($id)->numero;

        Http::preventStrayRequests();
        Http::fake(['www.google-analytics.com/*' => Http::response('', 204)]);

        $job = new SendGa4PurchaseJob($id, '1234567890.1728000000', null);
        $job->handle($this->ga4());
        $job->handle($this->ga4());

        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $request): bool => str_starts_with($request->url(), Ga4MeasurementProtocol::COLLECT_URL.'?')
            && str_contains($request->url(), 'measurement_id=G-TEST000000')
            && $request['client_id'] === '1234567890.1728000000'
            && $request['events'][0]['params']['transaction_id'] === $numero);

        $row = DB::table('notification_deliveries')->where('event_key', 'ga4:purchase:'.$id)->first();
        $this->assertNotNull($row);
        $this->assertSame('sent', $row->status);
        $this->assertSame('ga4', $row->channel);
        $this->assertSame(hash('sha256', '1234567890.1728000000'), $row->recipient_hash);
        $this->assertNotNull($row->sent_at);
        $this->assertSame(1, DB::table('notification_deliveries')->count());
    }

    public function test_debug_mode_posts_to_the_validation_endpoint(): void
    {
        $this->fakeJobs();
        config(['services.ga4.debug' => true]);
        $id = (int) $this->placeOrder(['ga' => ['client_id' => null]])->assertCreated()->json('id');

        Http::preventStrayRequests();
        Http::fake(['www.google-analytics.com/*' => Http::response(['validationMessages' => []], 200)]);

        (new SendGa4PurchaseJob($id, '1234567890.1728000000', null))->handle($this->ga4());

        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $request): bool => str_starts_with($request->url(), Ga4MeasurementProtocol::DEBUG_COLLECT_URL.'?'));
    }

    public function test_debug_mode_validates_without_silencing_the_browser_purchase(): void
    {
        $this->fakeJobs();
        config(['services.ga4.debug' => true, 'services.ga4.mode' => 'always']);

        // The validation endpoint records nothing, so the browser must still send its purchase.
        $id = (int) $this->placeOrder(['ga' => ['client_id' => null, 'gtag_loaded' => false]])
            ->assertCreated()
            ->assertJsonMissingPath('ga4_server_purchase')
            ->json('id');
        Bus::assertDispatched(SendGa4PurchaseJob::class, fn (SendGa4PurchaseJob $job): bool => $job->commandeId === $id
            && $job->debug === true);

        // A replay of a debug-validated order does not claim the purchase either.
        $this->placeOrder(['ga' => ['client_id' => null, 'gtag_loaded' => false]])
            ->assertOk()
            ->assertJsonPath('replayed', true)
            ->assertJsonMissingPath('ga4_server_purchase');

        // The debug flag is pinned at dispatch, and the run claims its own ledger key: switching debug
        // off before the worker runs neither turns the validation into a real send nor blocks one.
        config(['services.ga4.debug' => false]);
        Http::preventStrayRequests();
        Http::fake(['www.google-analytics.com/*' => Http::response(['validationMessages' => []], 200)]);
        (new SendGa4PurchaseJob($id, '1234567890.1728000000', null, true))->handle($this->ga4());

        Http::assertSentCount(1);
        Http::assertSent(fn (HttpRequest $request): bool => str_starts_with($request->url(), Ga4MeasurementProtocol::DEBUG_COLLECT_URL.'?'));
        $this->assertTrue(DB::table('notification_deliveries')->where('event_key', 'ga4:purchase-debug:'.$id)->exists());
        $this->assertFalse(DB::table('notification_deliveries')->where('event_key', 'ga4:purchase:'.$id)->exists());
        $this->assertFalse($this->ga4()->serverReported(Commande::findOrFail($id)));
    }

    public function test_an_http_failure_inside_the_job_never_affects_add_commande(): void
    {
        // The GA4 job runs synchronously inside the request here (queue.default = sync).
        $this->fakeJobs(runGa4Job: true);
        Http::preventStrayRequests();
        Http::fake(function (): void {
            throw new ConnectionException('cURL error 28: Connection timed out after 3001 milliseconds for '
                .'https://www.google-analytics.com/mp/collect?measurement_id=G-TEST000000&api_secret='.self::SECRET);
        });

        $this->placeOrder(['ga' => ['client_id' => null]])
            ->assertCreated()
            ->assertJsonPath('replayed', false);

        $this->assertSame(1, DB::table('commandes')->count());
        $this->assertEquals(210, DB::table('commandes')->value('prix_ttc'));
        $this->assertSame(48, (int) DB::table('products')->where('id', 1)->value('qte'));

        // The send was attempted and recorded as failed, and the secret is in neither the ledger nor the error.
        $row = DB::table('notification_deliveries')->first();
        $this->assertNotNull($row);
        $this->assertSame('failed', $row->status);
        $this->assertStringNotContainsString(self::SECRET, (string) $row->last_error);
        $this->assertStringContainsString('api_secret=[redacted]', (string) $row->last_error);
    }

    public function test_a_non_2xx_answer_is_recorded_as_failed_and_retried_then_sent_once(): void
    {
        $this->fakeJobs();
        $id = (int) $this->placeOrder(['ga' => ['client_id' => null]])->assertCreated()->json('id');

        Http::preventStrayRequests();
        Http::fakeSequence('www.google-analytics.com/*')
            ->push('', 500)
            ->push('', 204);

        $job = new SendGa4PurchaseJob($id, '1234567890.1728000000', null);
        try {
            $job->handle($this->ga4());
            $this->fail('A non-2xx answer must throw so the queue retries.');
        } catch (\RuntimeException $e) {
            $this->assertStringNotContainsString(self::SECRET, $e->getMessage());
            $this->assertNull($e->getPrevious());
        }
        $row = DB::table('notification_deliveries')->where('event_key', 'ga4:purchase:'.$id)->first();
        $this->assertSame('failed', $row->status);
        $this->assertStringContainsString('HTTP 500', (string) $row->last_error);

        // The queue's retry re-claims the failed row and sends; a later run sends nothing more.
        $job->handle($this->ga4());
        $job->handle($this->ga4());

        Http::assertSentCount(2);
        $row = DB::table('notification_deliveries')->where('event_key', 'ga4:purchase:'.$id)->first();
        $this->assertSame('sent', $row->status);
        $this->assertSame(2, (int) $row->attempts);
    }

    public function test_a_replay_with_a_different_ga_returns_the_same_order(): void
    {
        $this->fakeJobs();
        $first = $this->placeOrder(['ga' => ['client_id' => null]])->assertCreated()->json('id');

        $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'session_id' => '1728000000']])
            ->assertOk()
            ->assertJsonPath('replayed', true)
            ->assertJsonPath('id', $first)
            // The first response may have been lost: the replay repeats that the server reports it.
            ->assertJsonPath('ga4_server_purchase', true);

        $this->assertSame(1, DB::table('commandes')->count());
        // The replay returns before the hook: one order, one send.
        Bus::assertDispatchedTimes(SendGa4PurchaseJob::class, 1);
    }

    public function test_a_replay_repeats_ga4_server_purchase_only_for_orders_the_server_reports(): void
    {
        $this->fakeJobs();

        // Fallback queued at the first tap (gtag.js still booting); the retry says gtag_loaded=true.
        $queued = (int) $this->placeOrder(['ga' => ['client_id' => null, 'gtag_loaded' => false]])
            ->assertCreated()->assertJsonPath('ga4_server_purchase', true)->json('id');
        $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'gtag_loaded' => true]])
            ->assertOk()->assertJsonPath('id', $queued)->assertJsonPath('ga4_server_purchase', true);

        // Once the job has claimed the ledger, the ledger alone answers (cache flushed, e.g. a deploy).
        DB::table('notification_deliveries')->insert(['event_key' => 'ga4:purchase:'.$queued, 'channel' => 'ga4',
            'recipient_hash' => hash('sha256', 'x'), 'status' => 'sent', 'attempts' => 1, 'created_at' => now(), 'updated_at' => now()]);
        Cache::flush();
        $this->placeOrder(['ga' => ['client_id' => null, 'gtag_loaded' => false]])
            ->assertOk()->assertJsonPath('ga4_server_purchase', true);

        // The browser reported this one itself: its replay must not tell the browser to stay quiet.
        $browser = (int) $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'gtag_loaded' => true]], 'storefront-ga4-test-0002')
            ->assertCreated()->assertJsonMissingPath('ga4_server_purchase')->json('id');
        $this->placeOrder(['ga' => ['client_id' => '1234567890.1728000000', 'gtag_loaded' => true]], 'storefront-ga4-test-0002')
            ->assertOk()->assertJsonPath('id', $browser)->assertJsonMissingPath('ga4_server_purchase');

        Bus::assertDispatchedTimes(SendGa4PurchaseJob::class, 1);
    }

    public function test_order_details_api_returns_real_product_brand_category_and_flavour(): void
    {
        $this->fakeJobs();
        $response = $this->placeOrder(['ga' => ['client_id' => null]])->assertCreated();
        $id = (int) $response->json('id');

        $details = (new CommandeController())->details(
            Request::create('/api/commande/'.$id, 'GET', ['token' => $response->json('order_token')]), $id
        );

        $this->assertSame(200, $details->getStatusCode());
        $line = $details->getData(true)['details_facture'][0];
        $this->assertSame('Double Rich Chocolate', $line['arome']);
        $this->assertSame('gold-standard-100-whey-2-27-kg', $line['product']['slug']);
        $this->assertSame('Optimum Nutrition', $line['product']['brand']['designation_fr']);
        $this->assertSame('Whey protéine', $line['product']['sous_categorie']['designation_fr']);
        $this->assertSame('Protéines', $line['product']['sous_categorie']['categorie']['designation_fr']);
    }
}
