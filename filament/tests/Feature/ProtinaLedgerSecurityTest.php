<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PointsService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProtinaLedgerSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('points_balance')->default(0);
            $table->timestamps();
        });
        Schema::create('user_point_transactions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('commande_id')->nullable();
            $table->unsignedBigInteger('review_id')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->string('type');
            $table->integer('points');
            $table->integer('balance_after');
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function test_same_checkout_can_debit_protinas_only_once(): void
    {
        $user = $this->userWithBalance(600);
        $service = app(PointsService::class);

        $first = $service->record($user, 'redeem', -200, 'Checkout', 41, null, 'order:41:redeem');
        $second = $service->record($user, 'redeem', -200, 'Retry', 41, null, 'order:41:redeem');

        $this->assertSame($first->getKey(), $second->getKey());
        $this->assertSame(400, (int) $user->fresh()->points_balance);
        $this->assertSame(1, DB::table('user_point_transactions')->count());
    }

    public function test_checkout_cannot_spend_more_protinas_than_the_locked_balance(): void
    {
        $user = $this->userWithBalance(80);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Insufficient loyalty points balance.');
        app(PointsService::class)->record($user, 'redeem', -100, 'Checkout', 42, null, 'order:42:redeem');
    }

    private function userWithBalance(int $balance): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Client Protina',
            'points_balance' => $balance,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }
}
