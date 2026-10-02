<?php

namespace Tests\Feature;

use App\Models\Commande;
use App\Models\User;
use App\Services\PhoneVerificationService;
use App\Services\PointsService;
use App\Services\WelcomeBonusService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class WelcomeBonusCommerceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'welcome_bonus.unique_delivery_phone' => true, 'welcome_bonus.unlock_on_first_delivery' => true,
            'welcome_bonus.enabled' => true, 'welcome_bonus.include_existing_customers' => true,
            'loyalty.points.earn_per_dt' => 1, 'loyalty.points.points_per_dt' => 20]);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        Schema::create('users', function (Blueprint $t): void {
            $t->id(); $t->string('name'); $t->string('email'); $t->string('phone')->nullable();
            $t->unsignedInteger('role_id')->default(2); $t->boolean('welcome_bonus_eligible')->default(true);
            $t->timestamp('phone_verified_at')->nullable();
            $t->unsignedInteger('points_balance')->default(0); $t->timestamp('welcome_bonus_awarded_at')->nullable();
            $t->timestamps();
        });
        Schema::create('commandes', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id')->nullable();
            $t->unsignedBigInteger('authenticated_user_id')->nullable(); $t->string('numero')->nullable();
            $t->string('etat'); $t->string('livraison_phone')->nullable(); $t->string('phone')->nullable();
            $t->decimal('prix_ht', 12, 3); $t->decimal('prix_ttc', 12, 3);
            $t->decimal('frais_livraison', 12, 3)->default(0); $t->timestamps();
        });
        Schema::create('welcome_bonus_claims', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id')->unique(); $t->string('phone_hash', 64)->unique();
            $t->string('email_hash', 64)->unique(); $t->unsignedInteger('points');
            $t->timestamp('credited_at')->nullable(); $t->unsignedBigInteger('unlocked_by_commande_id')->nullable();
            $t->char('unlock_phone_hash', 64)->nullable(); $t->timestamp('created_at');
        });
        Schema::create('user_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id'); $t->unsignedBigInteger('commande_id')->nullable();
            $t->string('type'); $t->integer('points'); $t->unsignedInteger('balance_after');
            $t->string('description')->nullable(); $t->string('idempotency_key')->nullable()->unique();
            $t->timestamps();
        });
    }

    public function test_repeated_delivered_save_unlocks_only_once_and_return_resets_pending(): void
    {
        $userId = DB::table('users')->insertGetId(['name' => 'Client', 'email' => 'test@example.test',
            'phone' => '+21620123456', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('welcome_bonus_claims')->insert(['user_id' => $userId,
            'phone_hash' => PhoneVerificationService::fingerprint('+21620123456'),
            'email_hash' => PhoneVerificationService::fingerprint('test@example.test'),
            'points' => 300, 'created_at' => now()]);
        $orderId = DB::table('commandes')->insertGetId(['user_id' => $userId, 'authenticated_user_id' => $userId, 'numero' => 'TEST/1',
            'etat' => 'livree', 'livraison_phone' => '20123456', 'prix_ht' => 200,
            'prix_ttc' => 190, 'frais_livraison' => 10, 'created_at' => now(), 'updated_at' => now()]);
        $service = app(PointsService::class);
        $order = Commande::findOrFail($orderId);
        $service->syncOnStatusChange($order);
        $service->syncOnStatusChange($order);
        $this->assertSame(480, (int) User::findOrFail($userId)->points_balance); // 180 paid goods + 300 welcome
        $this->assertSame(1, DB::table('user_point_transactions')->where('idempotency_key',
            'welcome:'.$userId.':unlock:'.$orderId)->count());
        $this->assertSame('awarded', app(PhoneVerificationService::class)->bonusStatus(User::findOrFail($userId)));

        $order->etat = 'retour';
        $service->syncOnStatusChange($order);
        $this->assertSame('pending', app(PhoneVerificationService::class)->bonusStatus(User::findOrFail($userId)));
        $this->assertNull(DB::table('welcome_bonus_claims')->where('user_id', $userId)->value('credited_at'));
        $this->assertSame(0, (int) User::findOrFail($userId)->points_balance);
    }

    public function test_legacy_welcome_claim_is_backfilled_as_credited_while_new_reservation_stays_pending(): void
    {
        DB::table('welcome_bonus_claims')->insert(['user_id' => 1,
            'phone_hash' => str_repeat('a', 64), 'email_hash' => str_repeat('b', 64),
            'points' => 300, 'created_at' => now()->subDay()]);
        DB::table('user_point_transactions')->insert(['user_id' => 1, 'type' => 'earn', 'points' => 300,
            'balance_after' => 300, 'description' => 'Cadeau de bienvenue — 15 DT en points',
            'created_at' => now()->subDay(), 'updated_at' => now()->subDay()]);
        // Simulate the old schema by removing newly added columns in this isolated database.
        Schema::table('welcome_bonus_claims', function (Blueprint $t): void {
            $t->dropColumn(['credited_at', 'unlocked_by_commande_id', 'unlock_phone_hash']);
        });
        $migration = require base_path('database/migrations/2026_09_29_000200_add_welcome_unlock_fields.php');
        $migration->up();
        DB::table('welcome_bonus_claims')->insert(['user_id' => 2, 'phone_hash' => str_repeat('c', 64),
            'email_hash' => str_repeat('d', 64), 'points' => 300, 'created_at' => now()]);
        $migration->up();
        $this->assertNotNull(DB::table('welcome_bonus_claims')->where('user_id', 1)->value('credited_at'));
        $this->assertNull(DB::table('welcome_bonus_claims')->where('user_id', 2)->value('credited_at'));
    }

    public function test_delivery_phone_cannot_unlock_two_accounts(): void
    {
        foreach ([1 => '+21620123456', 2 => '+21622123456'] as $id => $phone) {
            DB::table('users')->insert(['id' => $id, 'name' => 'Client '.$id, 'email' => 'client'.$id.'@example.test',
                'phone' => $phone, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('welcome_bonus_claims')->insert(['user_id' => $id,
                'phone_hash' => PhoneVerificationService::fingerprint($phone),
                'email_hash' => PhoneVerificationService::fingerprint('client'.$id.'@example.test'),
                'points' => 300, 'created_at' => now()]);
            DB::table('commandes')->insert(['id' => $id, 'user_id' => $id, 'authenticated_user_id' => $id, 'numero' => 'TEST/'.$id,
                'etat' => 'livree', 'livraison_phone' => '20123456', 'prix_ht' => 100, 'prix_ttc' => 100,
                'created_at' => now(), 'updated_at' => now()]);
        }
        $svc = app(WelcomeBonusService::class);
        $svc->unlockOnDelivery(User::findOrFail(1), Commande::findOrFail(1));
        $svc->unlockOnDelivery(User::findOrFail(2), Commande::findOrFail(2));
        $this->assertSame(300, (int) User::findOrFail(1)->points_balance);
        $this->assertSame(0, (int) User::findOrFail(2)->points_balance);
        $this->assertSame('pending', app(PhoneVerificationService::class)->bonusStatus(User::findOrFail(2)));
    }

    public function test_guest_client_id_collision_neither_earns_nor_unlocks_account_points(): void
    {
        DB::table('users')->insert(['id' => 1, 'name' => 'Account', 'email' => 'account@example.test',
            'phone' => '+21620123456', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('welcome_bonus_claims')->insert(['user_id' => 1,
            'phone_hash' => PhoneVerificationService::fingerprint('+21620123456'),
            'email_hash' => PhoneVerificationService::fingerprint('account@example.test'),
            'points' => 300, 'created_at' => now()]);
        DB::table('commandes')->insert(['id' => 1, 'user_id' => 1, 'authenticated_user_id' => 0,
            'etat' => 'livree', 'livraison_phone' => '20123456', 'prix_ht' => 200, 'prix_ttc' => 200,
            'created_at' => now(), 'updated_at' => now()]);
        app(PointsService::class)->syncOnStatusChange(Commande::findOrFail(1));
        $this->assertSame(0, (int) User::findOrFail(1)->points_balance);
        $this->assertDatabaseCount('user_point_transactions', 0);
        $this->assertSame('pending', app(PhoneVerificationService::class)->bonusStatus(User::findOrFail(1)));
    }

    private function accountWithPendingClaim(int $id = 1, string $phone = '+21620123456'): void
    {
        DB::table('users')->insert(['id' => $id, 'name' => 'Account '.$id, 'email' => 'account'.$id.'@example.test',
            'phone' => $phone, 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('welcome_bonus_claims')->insert(['user_id' => $id,
            'phone_hash' => PhoneVerificationService::fingerprint($phone),
            'email_hash' => PhoneVerificationService::fingerprint('account'.$id.'@example.test'),
            'points' => 300, 'created_at' => now()]);
    }

    private function deliveredOrder(int $id, int $userId, float $goods = 0): Commande
    {
        DB::table('commandes')->insert(['id' => $id, 'user_id' => $userId, 'authenticated_user_id' => $userId,
            'numero' => 'TEST/'.$id, 'etat' => 'livree', 'livraison_phone' => '20123456',
            'prix_ht' => $goods, 'prix_ttc' => $goods, 'frais_livraison' => 0,
            'created_at' => now(), 'updated_at' => now()]);

        return Commande::findOrFail($id);
    }

    private function welcomeNet(int $userId): int
    {
        return (int) DB::table('user_point_transactions')->where('user_id', $userId)
            ->where('idempotency_key', 'like', 'welcome:'.$userId.':%')->sum('points');
    }

    public function test_turning_the_delivery_switch_off_releases_a_claim_reserved_while_it_was_on(): void
    {
        $this->accountWithPendingClaim();
        $phone = app(PhoneVerificationService::class);
        $this->assertSame('pending', $phone->bonusStatus(User::findOrFail(1)));

        config(['welcome_bonus.unlock_on_first_delivery' => false]);
        $this->assertSame('claimable', $phone->bonusStatus(User::findOrFail(1)));
        $result = $phone->claimWelcomeBonus(User::findOrFail(1));
        $this->assertTrue($result['bonus_awarded']);
        $this->assertSame('awarded', $result['bonus_status']);
        $this->assertSame(300, $result['points_balance']);
        $this->assertSame(300, (int) User::findOrFail(1)->points_balance);
        $this->assertSame(1, DB::table('user_point_transactions')->where('idempotency_key', 'welcome:1:unlock:0')->count());
        $this->assertNotNull(DB::table('welcome_bonus_claims')->where('user_id', 1)->value('credited_at'));

        $again = $phone->claimWelcomeBonus(User::findOrFail(1));
        $this->assertFalse($again['bonus_awarded']);
        $this->assertSame(300, (int) User::findOrFail(1)->points_balance);
    }

    public function test_release_command_credits_every_pending_claim_only_once_the_switch_is_off(): void
    {
        $this->accountWithPendingClaim(1, '+21620123456');
        $this->accountWithPendingClaim(2, '+21622123456');
        $this->artisan('protinas:welcome-release-pending', ['--apply' => true])->assertExitCode(1);
        $this->assertSame(0, (int) User::findOrFail(1)->points_balance);

        config(['welcome_bonus.unlock_on_first_delivery' => false]);
        $this->artisan('protinas:welcome-release-pending')->assertExitCode(0);
        $this->assertSame(0, (int) User::findOrFail(2)->points_balance);
        $this->artisan('protinas:welcome-release-pending', ['--apply' => true])->assertExitCode(0);
        $this->artisan('protinas:welcome-release-pending', ['--apply' => true])->assertExitCode(0);
        $this->assertSame(300, (int) User::findOrFail(1)->points_balance);
        $this->assertSame(300, (int) User::findOrFail(2)->points_balance);
        $this->assertSame(0, DB::table('welcome_bonus_claims')->whereNull('credited_at')->count());
    }

    public function test_phone_proof_credit_from_a_delivered_order_goes_back_to_pending_when_that_order_is_returned(): void
    {
        DB::table('users')->insert(['id' => 1, 'name' => 'Account', 'email' => 'account@example.test',
            'phone' => '+21620123456', 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $order = $this->deliveredOrder(1, 1);
        $this->assertTrue(app(PhoneVerificationService::class)->claimWelcomeBonus(User::findOrFail(1))['bonus_awarded']);
        $this->assertSame(1, (int) DB::table('welcome_bonus_claims')->where('user_id', 1)->value('unlocked_by_commande_id'));

        $order->etat = 'retour';
        app(PointsService::class)->syncOnStatusChange($order);
        $this->assertSame(0, (int) User::findOrFail(1)->points_balance);
        $this->assertSame(-300, (int) DB::table('user_point_transactions')
            ->where('idempotency_key', 'welcome:1:unlock-reversal:1')->value('points'));
        $this->assertSame('pending', app(PhoneVerificationService::class)->bonusStatus(User::findOrFail(1)));
    }

    public function test_returned_then_redelivered_order_unlocks_again_and_a_second_return_reverses_it(): void
    {
        $this->accountWithPendingClaim();
        $order = $this->deliveredOrder(1, 1, 100);
        $points = app(PointsService::class);
        $status = fn () => app(PhoneVerificationService::class)->bonusStatus(User::findOrFail(1));

        $points->syncOnStatusChange($order);                  // livree: +100 earned, +300 welcome
        $this->assertSame(400, (int) User::findOrFail(1)->points_balance);
        $order->etat = 'retour';
        $points->syncOnStatusChange($order);                  // both taken back
        $this->assertSame('pending', $status());
        $order->etat = 'livree';
        $points->syncOnStatusChange($order);                  // welcome unlocks again (new key)
        $this->assertSame('awarded', $status());
        $this->assertSame(1, DB::table('user_point_transactions')->where('idempotency_key', 'welcome:1:unlock:1:1')->count());
        $order->etat = 'retour';
        $points->syncOnStatusChange($order);                  // and is reversed again
        $this->assertSame('pending', $status());
        $this->assertSame(1, DB::table('user_point_transactions')->where('idempotency_key', 'welcome:1:unlock-reversal:1:1')->count());
        $this->assertSame(0, (int) User::findOrFail(1)->points_balance);
        $this->assertSame(0, (int) DB::table('user_point_transactions')->where('user_id', 1)->sum('points'));
    }

    public function test_a_spent_welcome_bonus_is_never_credited_twice_when_its_order_is_returned(): void
    {
        $this->accountWithPendingClaim();
        $points = app(PointsService::class);
        $orderA = $this->deliveredOrder(1, 1);
        $points->syncOnStatusChange($orderA);
        $points->record(User::findOrFail(1), 'redeem', -300, 'Protinas utilisées', 2, null, 'order:2:redeem');
        $this->assertSame(0, (int) User::findOrFail(1)->points_balance);

        $orderA->etat = 'retour';
        $points->syncOnStatusChange($orderA);                 // nothing left to take back
        $this->assertSame('awarded', app(PhoneVerificationService::class)->bonusStatus(User::findOrFail(1)));
        $points->syncOnStatusChange($this->deliveredOrder(3, 1));
        $this->assertSame(300, $this->welcomeNet(1));
        $this->assertSame(0, (int) User::findOrFail(1)->points_balance);
    }

    public function test_a_partly_spent_welcome_bonus_returns_to_pending_for_what_was_recovered_only(): void
    {
        $this->accountWithPendingClaim();
        $points = app(PointsService::class);
        $orderA = $this->deliveredOrder(1, 1);
        $points->syncOnStatusChange($orderA);
        $points->record(User::findOrFail(1), 'redeem', -200, 'Protinas utilisées', 2, null, 'order:2:redeem');

        $orderA->etat = 'retour';
        $points->syncOnStatusChange($orderA);                 // only 100 left to take back
        $this->assertSame(0, (int) User::findOrFail(1)->points_balance);
        $this->assertSame(100, (int) DB::table('welcome_bonus_claims')->where('user_id', 1)->value('points'));
        $this->assertSame('pending', app(PhoneVerificationService::class)->bonusStatus(User::findOrFail(1)));

        $points->syncOnStatusChange($this->deliveredOrder(3, 1));
        $this->assertSame(100, (int) User::findOrFail(1)->points_balance);
        $this->assertSame(300, $this->welcomeNet(1));
    }

    public function test_verified_account_with_an_already_delivered_marked_order_unlocks_at_phone_claim(): void
    {
        DB::table('users')->insert(['id' => 1, 'name' => 'Account', 'email' => 'account@example.test',
            'phone' => '+21620123456', 'phone_verified_at' => now(),
            'created_at' => now(), 'updated_at' => now()]);
        DB::table('commandes')->insert(['id' => 1, 'user_id' => 1, 'authenticated_user_id' => 1,
            'etat' => 'livree', 'livraison_phone' => '20123456', 'prix_ht' => 200, 'prix_ttc' => 200,
            'created_at' => now(), 'updated_at' => now()]);
        $result = app(PhoneVerificationService::class)->claimWelcomeBonus(User::findOrFail(1));
        $this->assertTrue($result['bonus_awarded']);
        $this->assertSame(300, (int) User::findOrFail(1)->points_balance);
        $this->assertNotNull(DB::table('welcome_bonus_claims')->where('user_id', 1)->value('credited_at'));
    }
}
