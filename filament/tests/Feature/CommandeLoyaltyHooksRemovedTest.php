<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Commande;
use App\Models\LoyaltyPointTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CommandeLoyaltyHooksRemovedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
    }

    public function test_expidee_status_change_does_not_create_loyalty_transactions(): void
    {
        if (! Schema::hasTable('commandes') || ! Schema::hasTable('loyalty_point_transactions')) {
            $this->markTestSkipped('Schema tables missing.');
        }

        $client = Client::query()->create([
            'name'    => 'Web Client',
            'email'   => 'web-' . uniqid('', true) . '@example.com',
            'phone_1' => '99887766',
            'source'  => 'online',
            'sms'     => false,
        ]);

        $commande = new Commande([
            'client_id' => $client->id,
            'user_id'   => 999999,
            'numero'    => 'TEST/' . uniqid(),
            'etat'      => Commande::STATUS_NEW,
            'prix_ht'   => 100,
            'prix_ttc'  => 100,
        ]);
        $commande->save();

        $before = LoyaltyPointTransaction::query()->where('order_id', $commande->id)->count();

        $commande->update(['etat' => 'expidee']);

        $after = LoyaltyPointTransaction::query()->where('order_id', $commande->id)->count();

        $this->assertSame($before, $after);
    }
}
