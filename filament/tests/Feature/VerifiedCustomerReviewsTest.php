<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\VerifiedCustomerReviewService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VerifiedCustomerReviewsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('cache.default', 'array');
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
        });
        Schema::create('clients', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
        });
        Schema::create('commandes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->string('email')->nullable();
            $table->string('livraison_email')->nullable();
            $table->string('etat');
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
            $table->string('author_email')->nullable();
            $table->string('comment')->default('Très bon produit');
            $table->boolean('verified')->default(false);
            $table->boolean('publier')->default(false);
            $table->timestamps();
        });
    }

    public function test_only_delivered_matching_products_receive_purchase_evidence(): void
    {
        $user = $this->customer(true);
        $delivered = $this->order('client@example.test', 'livree', 11);
        $this->order('client@example.test', 'nouvelle_commande', 12);
        $this->order('other@example.test', 'livree', 13);
        $guest = $this->review(11, ['author_email' => ' CLIENT@example.test ']);
        $pendingOrder = $this->review(12, ['user_id' => $user->id]);
        $otherOrder = $this->review(13, ['user_id' => $user->id]);
        $otherAccount = $this->review(11, ['user_id' => 999, 'author_email' => $user->email]);
        $unrelated = $this->review(11, ['author_email' => 'other@example.test']);

        $service = app(VerifiedCustomerReviewService::class);
        $result = $service->reconcile($user);
        $this->assertSame(3, $result['reviews']);
        $this->assertSame(1, $result['verified_reviews']);
        $this->assertDatabaseHas('reviews', ['id' => $guest, 'user_id' => $user->id, 'commande_id' => $delivered, 'verified' => 0, 'publier' => 0]);
        $this->assertDatabaseHas('reviews', ['id' => $pendingOrder, 'commande_id' => null]);
        $this->assertDatabaseHas('reviews', ['id' => $otherOrder, 'commande_id' => null]);
        $this->assertDatabaseHas('reviews', ['id' => $otherAccount, 'user_id' => 999, 'commande_id' => null]);
        $this->assertDatabaseHas('reviews', ['id' => $unrelated, 'user_id' => null]);
        $this->assertSame($result, $service->reconcile($user));
    }

    public function test_unverified_email_cannot_claim_reviews_or_purchases(): void
    {
        $user = $this->customer(false);
        $this->order($user->email, 'livree', 11);
        $review = $this->review(11, ['author_email' => $user->email]);
        $result = app(VerifiedCustomerReviewService::class)->reconcile($user);
        $this->assertSame(0, $result['reviews']);
        $this->assertDatabaseHas('reviews', ['id' => $review, 'user_id' => null, 'commande_id' => null]);
    }

    public function test_post_delivery_guest_review_is_linked_by_owned_order(): void
    {
        $user = $this->customer(true);
        $order = $this->order($user->email, 'livree', 11);
        $review = $this->review(11, ['commande_id' => $order]);
        app(VerifiedCustomerReviewService::class)->reconcile($user);
        $this->assertDatabaseHas('reviews', ['id' => $review, 'user_id' => $user->id, 'commande_id' => $order]);
    }

    private function customer(bool $verified): User
    {
        $id = DB::table('users')->insertGetId(['name' => 'Client', 'email' => 'client@example.test', 'email_verified_at' => $verified ? now() : null]);
        return User::findOrFail($id);
    }

    private function order(string $email, string $status, int $product): int
    {
        $id = DB::table('commandes')->insertGetId(['email' => $email, 'etat' => $status]);
        DB::table('commande_details')->insert(['commande_id' => $id, 'produit_id' => $product]);
        return $id;
    }

    private function review(int $product, array $attributes): int
    {
        return DB::table('reviews')->insertGetId(array_merge(['product_id' => $product], $attributes));
    }
}
