<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\User;
use App\Services\ReviewSubmissionService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MemberReviewFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('reviews.member.max_per_month', 3);
        config()->set('reviews.points.award', 10);
        config()->set('reviews.points.verified_purchase_award', 50);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
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
            $table->string('phone')->nullable();
            $table->string('livraison_phone')->nullable();
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
            $table->unsignedTinyInteger('stars');
            $table->text('comment');
            $table->boolean('publier')->default(false);
            $table->timestamps();
        });

        Review::unsetEventDispatcher();
    }

    public function test_phone_verification_is_required(): void
    {
        $user = $this->user(false);
        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('PHONE_VERIFICATION_REQUIRED');
        app(ReviewSubmissionService::class)->create($user, 10, $this->attributes());
    }

    public function test_member_cannot_create_more_than_three_reviews_per_month(): void
    {
        $user = $this->user(true);
        $service = app(ReviewSubmissionService::class);
        foreach ([10, 11, 12] as $product) {
            $service->create($user, $product, $this->attributes());
        }

        $access = $service->access($user, 13);
        $this->assertSame(3, $access['used_this_month']);
        $this->assertSame(0, $access['remaining_this_month']);
        $this->assertFalse($access['can_review']);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('MONTHLY_LIMIT_REACHED');
        $service->create($user, 13, $this->attributes());
    }

    public function test_delivered_purchase_is_matched_by_verified_phone_and_earns_fifty_points(): void
    {
        $user = $this->user(true);
        $orderId = DB::table('commandes')->insertGetId([
            'phone' => '+216 98 158 160',
            'etat' => 'livree',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('commande_details')->insert(['commande_id' => $orderId, 'produit_id' => 22]);

        $service = app(ReviewSubmissionService::class);
        $access = $service->access($user, 22);
        $this->assertTrue($access['verified_purchase']);
        $this->assertSame(50, $access['reward_points']);

        $created = $service->create($user, 22, $this->attributes());
        $this->assertSame($orderId, (int) $created['review']->commande_id);
    }

    private function user(bool $phoneVerified): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Client',
            'email' => 'client@example.test',
            'phone' => '98158160',
            'phone_verified_at' => $phoneVerified ? now() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    /** @return array<string,mixed> */
    private function attributes(): array
    {
        return ['stars' => 5, 'comment' => 'Très bon produit, facile à utiliser.', 'publier' => 1];
    }
}
