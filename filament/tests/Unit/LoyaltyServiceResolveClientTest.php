<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Commande;
use App\Models\User;
use App\Services\LoyaltyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoyaltyServiceResolveClientTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
    }

    public function test_resolve_uses_client_id_column(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('clients') || ! \Illuminate\Support\Facades\Schema::hasTable('commandes')) {
            $this->markTestSkipped('Schema tables missing in this environment.');
        }

        $client = Client::query()->create([
            'name'    => 'Test CRM',
            'email'   => 'crm-' . uniqid('', true) . '@example.com',
            'phone_1' => '12345678',
            'source'  => 'online',
            'sms'     => false,
        ]);

        $cmd = new Commande([
            'client_id' => $client->id,
            'user_id'   => 999999,
            'numero'    => '2099/9999',
            'etat'      => Commande::STATUS_NEW,
            'prix_ht'   => 10,
            'prix_ttc'  => 10,
        ]);
        $cmd->save();

        $svc = app(LoyaltyService::class);
        $this->assertSame((int) $client->id, $svc->resolveClientIdForCommande($cmd->fresh()));
    }

    public function test_resolve_follows_user_client_link(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('clients') || ! \Illuminate\Support\Facades\Schema::hasColumn('clients', 'user_id')) {
            $this->markTestSkipped('clients.user_id not migrated.');
        }

        $user = User::factory()->create();
        $client = Client::query()->create([
            'name'    => 'Linked',
            'email'   => 'linked-' . uniqid('', true) . '@example.com',
            'phone_1' => '87654321',
            'source'  => 'online',
            'sms'     => false,
            'user_id' => $user->id,
        ]);

        $cmd = new Commande([
            'client_id' => null,
            'user_id'   => $user->id,
            'numero'    => '2099/9998',
            'etat'      => Commande::STATUS_NEW,
            'prix_ht'   => 5,
            'prix_ttc'  => 5,
        ]);
        $cmd->save();

        $svc = app(LoyaltyService::class);
        $this->assertSame((int) $client->id, $svc->resolveClientIdForCommande($cmd->fresh()));
    }
}
