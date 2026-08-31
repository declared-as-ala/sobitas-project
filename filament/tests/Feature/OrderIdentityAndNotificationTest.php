<?php

namespace Tests\Feature;

use App\Jobs\SendOrderConfirmationEmailJob;
use App\Mail\OrderConfirmedCustomerMail;
use App\Models\Client;
use App\Models\Commande;
use App\Models\User;
use App\Services\ClientService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OrderIdentityAndNotificationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // This suite extends the application's normal Laravel TestCase rather than
        // Orchestra Testbench, so defineEnvironment() is never invoked. Configure the
        // isolated connection explicitly before purging it; otherwise a cached
        // DB_DATABASE value ("protein_db" in production) leaks into SQLite.
        $this->app['config']->set('database.default', 'sqlite');
        $this->app['config']->set('database.connections.sqlite.database', ':memory:');
        $this->app['config']->set('cache.default', 'array');
        $this->app['config']->set('queue.default', 'sync');

        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->timestamps();
        });
        Schema::create('clients', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->unique();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone_1')->nullable();
            $table->string('phone_2')->nullable();
            $table->string('adresse')->nullable();
            $table->string('region')->nullable();
            $table->string('ville')->nullable();
            $table->string('code_postale')->nullable();
            $table->string('source')->nullable();
            $table->boolean('sms')->default(false);
            $table->timestamps();
        });
        Schema::create('commandes', function (Blueprint $table): void {
            $table->id();
            $table->string('numero')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->string('email')->nullable();
            $table->string('livraison_email')->nullable();
            $table->string('etat')->nullable();
            $table->decimal('prix_ttc', 12, 3)->default(0);
            $table->timestamps();
        });
        Schema::create('commande_details', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('commande_id');
            $table->unsignedBigInteger('produit_id')->nullable();
            $table->unsignedInteger('qte')->default(1);
            $table->decimal('prix_unitaire', 12, 3)->default(0);
            $table->timestamps();
        });
        Schema::create('factures', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('commande_id')->nullable();
            $table->string('aramex_hawb')->nullable();
            $table->string('aramex_status')->nullable();
            $table->timestamp('aramex_pushed_at')->nullable();
            $table->timestamp('aramex_delivered_at')->nullable();
            $table->timestamps();
        });
        Schema::create('notification_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('event_key')->unique();
            $table->string('channel');
            $table->string('recipient_hash');
            $table->string('status');
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_client_relation_uses_client_id_not_same_numbered_user_id(): void
    {
        $wrong = Client::create(['name' => 'Wrong client']);
        $right = Client::create(['name' => 'Koussay', 'email' => 'koussay@example.test']);
        $user = $this->insertUser('Koussay', 'koussay@example.test');

        $orderId = DB::table('commandes')->insertGetId([
            'numero' => '2026/TEST',
            'user_id' => $user->id,
            'client_id' => $right->id,
            'email' => $user->email,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $order = Commande::findOrFail($orderId);
        $this->assertSame($right->id, $order->client->id);
        $this->assertNotSame($wrong->id, $order->client->id);
    }

    public function test_account_history_includes_owned_and_exact_email_legacy_orders_only(): void
    {
        $user = $this->insertUser('Koussay', 'Koussay@example.test');
        $client = Client::create(['user_id' => $user->id, 'name' => 'Koussay']);
        $owned = $this->insertOrder(['user_id' => $user->id, 'client_id' => $client->id, 'email' => 'other@example.test']);
        $legacy = $this->insertOrder(['user_id' => 9999, 'livraison_email' => 'koussay@example.test']);
        $unrelated = $this->insertOrder(['user_id' => 9999, 'email' => 'someone@example.test']);
        $numericCollision = $this->insertOrder(['user_id' => $user->id, 'client_id' => null, 'email' => 'collision@example.test']);

        $visible = Commande::visibleToStorefrontUser($user)->pluck('id')->all();

        $this->assertContains($owned, $visible);
        $this->assertContains($legacy, $visible);
        $this->assertNotContains($unrelated, $visible);
        $this->assertNotContains($numericCollision, $visible);
    }

    public function test_authenticated_account_never_reuses_another_client_by_phone(): void
    {
        $wrong = Client::create([
            'name' => 'Other customer',
            'email' => 'other@example.test',
            'phone_2' => '98 158 160',
        ]);
        $user = $this->insertUser('Koussay Jebali', 'koussay@example.test');

        $client = app(ClientService::class)->findOrCreateClientFromDeliveryInfo([
            'livraison_nom' => 'Koussay',
            'livraison_prenom' => 'Jebali',
            'livraison_email' => 'different-form-value@example.test',
            'livraison_phone' => '+216 98 158 160',
        ], $user);

        $this->assertNotNull($client);
        $this->assertNotSame($wrong->id, $client->id);
        $this->assertSame($user->id, $client->user_id);
        $this->assertSame('koussay@example.test', $client->email);
        $this->assertNull($client->phone_1);
    }

    public function test_account_order_query_can_eager_load_latest_shipment_without_ambiguous_columns(): void
    {
        $orderId = $this->insertOrder(['numero' => '2026/TRACK']);
        DB::table('factures')->insert([
            'commande_id' => $orderId,
            'aramex_hawb' => 'TRACK-001',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $order = Commande::query()->with('latestShipment')->findOrFail($orderId);

        $this->assertSame('TRACK-001', $order->latestShipment?->aramex_hawb);
    }

    public function test_confirmation_email_job_is_idempotent(): void
    {
        Mail::fake();
        $orderId = $this->insertOrder([
            'numero' => '2026/MAIL',
            'email' => 'client@example.test',
            'prix_ttc' => 149,
            'etat' => Commande::STATUS_NEW,
        ]);

        $job = new SendOrderConfirmationEmailJob($orderId, 'client@example.test', 'customer');
        $job->handle();
        $job->handle();

        Mail::assertSent(OrderConfirmedCustomerMail::class, 1);
        $this->assertDatabaseHas('notification_deliveries', [
            'channel' => 'email',
            'status' => 'sent',
            'attempts' => 1,
        ]);
    }

    /** @param array<string, mixed> $overrides */
    private function insertOrder(array $overrides): int
    {
        return DB::table('commandes')->insertGetId(array_merge([
            'numero' => '2026/' . random_int(1000, 9999),
            'user_id' => null,
            'client_id' => null,
            'email' => null,
            'livraison_email' => null,
            'etat' => Commande::STATUS_NEW,
            'prix_ttc' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }

    private function insertUser(string $name, string $email): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => $name,
            'email' => $email,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }
}
