<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Services\ReviewSubmissionService;
use App\Services\Reviews\ReviewModerator;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The tokenised /avis flow (GET /api/reviews/order/{token}, POST /api/reviews/by-order), hardened
 * 05/10/2026:
 *   - 410 `not_delivered` until the order is delivered — the same token is in the order-
 *     confirmation URL, so a refused cash-on-delivery parcel must not yield an "Achat vérifié";
 *   - 410 `expired` once the delivery is older than reviews.link_max_age_days (120);
 *   - stars without a comment are accepted, published and linked to the order;
 *   - attribution reads `authenticated_user_id`, never `commandes.user_id` (a Client id that can
 *     collide with an unrelated User id);
 *   - the author is stored as "Prénom N." in `author_name`;
 *   - ReviewModerator publishes an empty text only when an order is attached (`rating_only`), and
 *     never calls the LLM for it.
 */
class ReviewTokenFlowHardeningTest extends TestCase
{
    private const PRODUCT_ID = 31;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('cache.default', 'array');
        config()->set('reviews.link_max_age_days', 120);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->unsignedBigInteger('role_id')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamps();
        });
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->nullable();
            $table->string('designation_fr')->nullable();
            $table->string('cover')->nullable();
            $table->integer('qte')->nullable();
            $table->boolean('publier')->default(true);
        });
        Schema::create('commandes', function (Blueprint $table): void {
            $table->id();
            foreach (['numero', 'order_token', 'review_code', 'nom', 'prenom', 'livraison_nom', 'livraison_prenom', 'email', 'livraison_email', 'phone', 'livraison_phone', 'etat'] as $column) {
                $table->string($column)->nullable();
            }
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->unsignedBigInteger('authenticated_user_id')->nullable();
            $table->unsignedBigInteger('affilie_id')->nullable();
            $table->string('checkout_idempotency_key')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
        Schema::create('commande_details', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('commande_id');
            $table->unsignedBigInteger('produit_id');
        });
        Schema::create('reviews', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('commande_id')->nullable();
            $table->unsignedTinyInteger('stars');
            // NOT NULL, like the strictest shape the legacy table could have: a stars-only review
            // must still insert.
            $table->text('comment');
            $table->boolean('verified')->default(false);
            $table->boolean('publier')->default(false);
            $table->string('author_name', 60)->nullable();
            $table->timestamps();
        });

        DB::table('products')->insert([
            'id' => self::PRODUCT_ID, 'slug' => 'whey-test', 'designation_fr' => 'Whey test 2 kg', 'cover' => 'whey.png', 'qte' => 4,
        ]);

        // The observer notifies the panel and moderates after the response; neither is under test
        // here and both need tables this test does not create.
        Review::unsetEventDispatcher();
    }

    public function test_an_order_that_is_not_delivered_answers_410_not_delivered(): void
    {
        $token = $this->order(['etat' => 'nouvelle_commande', 'delivered_at' => null]);

        $this->getJson('/api/reviews/order/' . $token)
            ->assertStatus(410)
            ->assertJsonPath('reason', 'not_delivered')
            ->assertJsonPath('message', 'Ce lien sera actif dès que votre commande aura été livrée.');

        $this->postJson('/api/reviews/by-order', $this->payload($token))
            ->assertStatus(410)
            ->assertJsonPath('reason', 'not_delivered');

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_a_refused_order_with_a_delivery_stamp_is_still_not_delivered(): void
    {
        // Delivered once, then switched to a refusal/return: the status is what counts.
        $token = $this->order(['etat' => 'annuler', 'delivered_at' => now()->subDays(4)]);

        $this->postJson('/api/reviews/by-order', $this->payload($token))
            ->assertStatus(410)
            ->assertJsonPath('reason', 'not_delivered');

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_a_delivery_older_than_120_days_answers_410_expired(): void
    {
        $token = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(121)]);

        $this->getJson('/api/reviews/order/' . $token)
            ->assertStatus(410)
            ->assertJsonPath('reason', 'expired')
            ->assertJsonPath('message', 'Ce lien a expiré.');

        $this->postJson('/api/reviews/by-order', $this->payload($token))
            ->assertStatus(410)
            ->assertJsonPath('reason', 'expired');

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_a_legacy_delivered_order_without_delivered_at_uses_updated_at(): void
    {
        $token = $this->order(['etat' => 'livree', 'delivered_at' => null, 'updated_at' => now()->subDays(10)]);
        $this->getJson('/api/reviews/order/' . $token)->assertOk()->assertJsonPath('products.0.product_id', self::PRODUCT_ID);

        $old = $this->order(['etat' => 'livree', 'delivered_at' => null, 'updated_at' => now()->subDays(200)]);
        $this->getJson('/api/reviews/order/' . $old)->assertStatus(410)->assertJsonPath('reason', 'expired');
    }

    public function test_the_short_review_code_is_gated_the_same_way(): void
    {
        $this->order(['etat' => 'expidee', 'delivered_at' => null, 'review_code' => 'abcdefghjk']);

        $this->getJson('/api/reviews/order/abcdefghjk')
            ->assertStatus(410)
            ->assertJsonPath('reason', 'not_delivered');
    }

    public function test_delivered_order_accepts_stars_without_a_comment(): void
    {
        $token = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(5)]);
        $orderId = (int) DB::table('commandes')->where('order_token', $token)->value('id');

        $response = $this->postJson('/api/reviews/by-order', [
            'order_token' => $token,
            'product_id'  => self::PRODUCT_ID,
            'stars'       => 4,
        ])->assertCreated()->assertJsonPath('published', true);

        $review = Review::findOrFail($response->json('id'));
        $this->assertSame(1, (int) $review->publier);
        $this->assertSame($orderId, (int) $review->commande_id);
        $this->assertSame(1, (int) $review->verified);
        $this->assertSame(4, (int) $review->stars);
        $this->assertSame('', trim((string) $review->comment));

        // An explicitly empty comment is the same thing (ConvertEmptyStringsToNull turns it into null).
        $second = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(5)]);
        $this->postJson('/api/reviews/by-order', $this->payload($second, ['comment' => '']))->assertCreated();

        // And the order now shows the product as reviewed; a second review is refused.
        $this->getJson('/api/reviews/order/' . $token)->assertOk()->assertJsonPath('products.0.reviewed', true);
        $this->postJson('/api/reviews/by-order', $this->payload($token))->assertStatus(409);
    }

    public function test_a_guest_order_never_attributes_the_review_to_an_unrelated_user(): void
    {
        // commandes.user_id historically holds a CLIENT id; here it collides with a real User's id.
        $stranger = DB::table('users')->insertGetId(['name' => 'Unrelated Account', 'email' => 'stranger@example.test', 'role_id' => 2]);
        $token = $this->order([
            'etat' => 'livree', 'delivered_at' => now()->subDays(6),
            'user_id' => $stranger, 'authenticated_user_id' => 0,
        ]);

        $response = $this->postJson('/api/reviews/by-order', $this->payload($token, ['comment' => 'Très bon goût, se mélange bien.']))
            ->assertCreated();

        $this->assertNull(Review::findOrFail($response->json('id'))->user_id);
    }

    public function test_an_account_order_is_attributed_to_the_account_that_placed_it(): void
    {
        $owner = DB::table('users')->insertGetId(['name' => 'Owner Account', 'email' => 'owner@example.test', 'role_id' => 2]);
        $token = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(6), 'user_id' => 9999, 'authenticated_user_id' => $owner]);

        $response = $this->postJson('/api/reviews/by-order', $this->payload($token))->assertCreated();

        $this->assertSame($owner, (int) Review::findOrFail($response->json('id'))->user_id);
    }

    public function test_one_account_rates_a_product_once_across_its_repeat_orders(): void
    {
        // A repeat buyer: the same whey in two delivered orders placed by the same account.
        $owner = DB::table('users')->insertGetId(['name' => 'Repeat Buyer', 'email' => 'repeat@example.test', 'role_id' => 2]);
        $first = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(30), 'authenticated_user_id' => $owner]);
        $second = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(4), 'authenticated_user_id' => $owner]);

        $this->getJson('/api/reviews/order/' . $second)->assertOk()->assertJsonPath('products.0.reviewed', false);
        $this->postJson('/api/reviews/by-order', $this->payload($first))->assertCreated();

        // The second order's link now shows the product as done and refuses a second rating.
        $this->getJson('/api/reviews/order/' . $second)->assertOk()->assertJsonPath('products.0.reviewed', true);
        $this->postJson('/api/reviews/by-order', $this->payload($second, ['comment' => 'Autre texte, même produit.']))
            ->assertStatus(409)
            ->assertJsonPath('message', 'Vous avez déjà donné votre avis sur ce produit.');
        $this->assertSame(1, Review::where('user_id', $owner)->where('product_id', self::PRODUCT_ID)->count());

        // A product-page review by the account closes /avis the same way.
        $member = DB::table('users')->insertGetId(['name' => 'Member', 'email' => 'member@example.test', 'role_id' => 2]);
        DB::table('reviews')->insert(['user_id' => $member, 'product_id' => self::PRODUCT_ID, 'stars' => 5, 'comment' => 'Très bon.', 'publier' => 1]);
        $memberOrder = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(4), 'authenticated_user_id' => $member]);
        $this->postJson('/api/reviews/by-order', $this->payload($memberOrder))->assertStatus(409);

        // Guest orders are untouched: no account, nothing to match.
        $this->postJson('/api/reviews/by-order', $this->payload($this->order(['authenticated_user_id' => 0])))->assertCreated();
    }

    public function test_an_affiliate_desk_order_never_opens_the_review_link(): void
    {
        // Typed by the affiliate at the desk: affilie_id and no storefront checkout key.
        $desk = $this->order(['affilie_id' => 3, 'checkout_idempotency_key' => null]);
        $this->getJson('/api/reviews/order/' . $desk)
            ->assertStatus(410)
            ->assertJsonPath('reason', 'not_eligible');
        $this->postJson('/api/reviews/by-order', $this->payload($desk))
            ->assertStatus(410)
            ->assertJsonPath('reason', 'not_eligible');
        $this->assertDatabaseCount('reviews', 0);

        // A storefront order attributed to an affiliate subdomain: the customer typed it, so it stays open.
        $referred = $this->order(['affilie_id' => 3, 'checkout_idempotency_key' => 'storefront-key-0000001']);
        $this->getJson('/api/reviews/order/' . $referred)->assertOk();
        $this->postJson('/api/reviews/by-order', $this->payload($referred))->assertCreated();

        // The query form of the rule keeps exactly the same orders.
        $kept = \App\Models\Commande::query()->excludingAffiliateDesk()->pluck('order_token')->all();
        $this->assertNotContains($desk, $kept);
        $this->assertContains($referred, $kept);
    }

    public function test_a_bookkeeping_stamp_never_moves_the_legacy_delivery_clock(): void
    {
        // Delivered 100 days ago with no delivered_at: updated_at is its only delivery clock.
        $token = $this->order(['delivered_at' => null, 'review_code' => null, 'updated_at' => now()->subDays(100)]);
        $commande = \App\Models\Commande::where('order_token', $token)->firstOrFail();
        $before = (string) DB::table('commandes')->where('order_token', $token)->value('updated_at');

        $commande->stampQuietly(['review_code' => 'abcdefghjk']);

        $row = DB::table('commandes')->where('order_token', $token)->first();
        $this->assertSame('abcdefghjk', $row->review_code);
        $this->assertSame($before, (string) $row->updated_at);
        // Still 100 days old for the /avis gate: the stamp did not hand the link another 120 days.
        $this->assertSame(\App\Http\Controllers\Api\ReviewController::LINK_OPEN, \App\Http\Controllers\Api\ReviewController::reviewLinkState($commande->fresh()));
        $this->assertTrue(\Illuminate\Support\Carbon::parse($row->updated_at)->lt(now()->subDays(99)));
    }

    public function test_author_name_is_first_name_and_last_initial(): void
    {
        $token = $this->order([
            'etat' => 'livree', 'delivered_at' => now()->subDays(6),
            'livraison_prenom' => 'amira', 'livraison_nom' => 'ben salah',
            'prenom' => 'Ignored', 'nom' => 'Ignored',
        ]);
        $id = $this->postJson('/api/reviews/by-order', $this->payload($token))->assertCreated()->json('id');
        $this->assertSame('Amira B.', Review::findOrFail($id)->author_name);

        // Billing names when the delivery names are blank; first name only without a last name.
        $billing = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(6), 'livraison_prenom' => '', 'prenom' => 'Sami', 'nom' => 'ferchichi']);
        $id = $this->postJson('/api/reviews/by-order', $this->payload($billing))->assertCreated()->json('id');
        $this->assertSame('Sami F.', Review::findOrFail($id)->author_name);

        $firstOnly = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(6), 'livraison_prenom' => 'Ines', 'livraison_nom' => null, 'nom' => null]);
        $id = $this->postJson('/api/reviews/by-order', $this->payload($firstOnly))->assertCreated()->json('id');
        $this->assertSame('Ines', Review::findOrFail($id)->author_name);
    }

    public function test_a_full_name_checkout_order_still_gets_first_name_and_last_initial(): void
    {
        // The main checkout stores ONE full name in livraison_nom / nom and no first name at all.
        $token = $this->order([
            'etat' => 'livree', 'delivered_at' => now()->subDays(6),
            'livraison_prenom' => null, 'prenom' => null,
            'livraison_nom' => 'amira ben salah', 'nom' => 'amira ben salah',
        ]);
        // The greeting is case-normalised exactly like the stored author name: « Merci Amira ! ».
        $this->getJson('/api/reviews/order/' . $token)->assertOk()->assertJsonPath('prenom', 'Amira');
        $id = $this->postJson('/api/reviews/by-order', $this->payload($token))->assertCreated()->json('id');
        $this->assertSame('Amira B.', Review::findOrFail($id)->author_name);

        $single = $this->order(['etat' => 'livree', 'delivered_at' => now()->subDays(6), 'livraison_prenom' => null, 'prenom' => null, 'livraison_nom' => 'SAMI', 'nom' => null]);
        $this->getJson('/api/reviews/order/' . $single)->assertOk()->assertJsonPath('prenom', 'Sami');
        $id = $this->postJson('/api/reviews/by-order', $this->payload($single))->assertCreated()->json('id');
        $this->assertSame('Sami', Review::findOrFail($id)->author_name);
    }

    public function test_the_protinas_line_is_offered_only_to_an_order_that_can_be_paid(): void
    {
        // ReviewObserver::settlePoints pays only the account that placed the order, and only once
        // its phone is verified; the /avis page shows the incentive line only when that holds.
        config()->set('reviews.points.min_length', 20);
        $verified = DB::table('users')->insertGetId(['name' => 'Verified', 'email' => 'verified@example.test', 'role_id' => 2, 'phone_verified_at' => now()]);
        $unverified = DB::table('users')->insertGetId(['name' => 'Unverified', 'email' => 'unverified@example.test', 'role_id' => 2]);

        $this->getJson('/api/reviews/order/' . $this->order(['authenticated_user_id' => $verified]))
            ->assertOk()
            ->assertJsonPath('reward_eligible', true)
            ->assertJsonPath('reward_min_length', 20);
        $this->getJson('/api/reviews/order/' . $this->order(['authenticated_user_id' => $unverified]))
            ->assertOk()
            ->assertJsonPath('reward_eligible', false);
        $this->getJson('/api/reviews/order/' . $this->order(['authenticated_user_id' => 0]))
            ->assertOk()
            ->assertJsonPath('reward_eligible', false);
    }

    public function test_only_a_duplicate_key_counts_as_an_already_rated_order(): void
    {
        // The guarantee behind the order-row lock: reviews(commande_id, product_id) is unique.
        Schema::table('reviews', fn (Blueprint $table) => $table->unique(['commande_id', 'product_id'], 'reviews_commande_product_unique'));
        $row = ['product_id' => self::PRODUCT_ID, 'commande_id' => 5, 'stars' => 5, 'comment' => '', 'publier' => 1];
        DB::table('reviews')->insert($row);

        try {
            DB::table('reviews')->insert($row);
            $this->fail('a second rating for one order and product must be refused');
        } catch (QueryException $e) {
            $this->assertTrue(ReviewSubmissionService::isUniqueViolation($e));
        }

        // Guest rows carry no order: any number of them.
        DB::table('reviews')->insert([...$row, 'commande_id' => null]);
        DB::table('reviews')->insert([...$row, 'commande_id' => null]);

        // A NOT NULL violation is SQLSTATE 23000 too, and must not read as "already reviewed".
        try {
            DB::table('reviews')->insert([...$row, 'commande_id' => 6, 'comment' => null]);
            $this->fail('comment is NOT NULL');
        } catch (QueryException $e) {
            $this->assertFalse(ReviewSubmissionService::isUniqueViolation($e));
        }
    }

    public function test_moderator_publishes_a_stars_only_order_review_without_calling_the_llm(): void
    {
        Http::fake();
        config()->set('reviews.moderation.enabled', true);
        config()->set('services.ai.groq_key', 'test-key-not-a-secret');

        $orderReview = new Review(['product_id' => self::PRODUCT_ID, 'stars' => 5, 'comment' => '', 'publier' => 1, 'commande_id' => 77]);
        $verdict = app(ReviewModerator::class)->moderate($orderReview);

        $this->assertSame('publish', $verdict['decision']);
        $this->assertSame(['rating_only'], $verdict['flags']);
        Http::assertNothingSent();
    }

    public function test_moderator_still_holds_an_empty_review_without_an_order(): void
    {
        config()->set('reviews.moderation.enabled', false);

        $loose = new Review(['product_id' => self::PRODUCT_ID, 'stars' => 5, 'comment' => '   ', 'publier' => 1]);
        $verdict = app(ReviewModerator::class)->moderate($loose);

        $this->assertSame('hold', $verdict['decision']);
        $this->assertContains('empty', $verdict['flags']);
    }

    /** @param  array<string,mixed>  $attributes */
    private function order(array $attributes): string
    {
        static $sequence = 0;
        $sequence++;
        $token = str_pad('t' . $sequence, 64, 'x');

        $id = DB::table('commandes')->insertGetId(array_merge([
            'numero' => 'TEST-' . $sequence,
            'order_token' => $token,
            'prenom' => 'Client',
            'nom' => 'Test',
            'etat' => 'livree',
            'authenticated_user_id' => 0,
            'delivered_at' => now()->subDays(5),
            'created_at' => now()->subDays(12),
            'updated_at' => now()->subDays(5),
        ], $attributes));

        DB::table('commande_details')->insert(['commande_id' => $id, 'produit_id' => self::PRODUCT_ID]);

        return $token;
    }

    /**
     * @param  array<string,mixed>  $overrides
     * @return array<string,mixed>
     */
    private function payload(string $token, array $overrides = []): array
    {
        return array_merge([
            'order_token' => $token,
            'product_id'  => self::PRODUCT_ID,
            'stars'       => 5,
        ], $overrides);
    }
}
