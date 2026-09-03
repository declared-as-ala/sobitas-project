<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\CommandeController;
use App\Models\Commande;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CheckoutGuestConfirmationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        Schema::create('commandes', function (Blueprint $table): void {
            $table->id();
            foreach (['numero', 'order_token', 'nom', 'prenom', 'email', 'phone', 'region', 'ville', 'etat', 'coupon_code_snapshot',
                'livraison_email', 'livraison_phone', 'livraison_nom', 'livraison_prenom', 'livraison_adresse1', 'livraison_region', 'livraison_ville', 'livraison_code_postale'] as $column) {
                $table->string($column)->nullable();
            }
            foreach (['prix_ht', 'prix_ttc', 'frais_livraison', 'discount_ht', 'discount_ttc'] as $column) $table->decimal($column, 12, 3)->default(0);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->timestamps();
        });
        Schema::create('commande_details', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('commande_id');
            $table->unsignedBigInteger('produit_id');
            $table->integer('qte');
            foreach (['prix_unitaire', 'prix_ht', 'prix_ttc'] as $column) $table->decimal($column, 12, 3);
        });
        DB::table('commandes')->insert([
            'id' => 1, 'numero' => 'TEST-ONLY', 'order_token' => str_repeat('a', 64), 'prix_ttc' => 309,
            'livraison_nom' => 'Client Test', 'livraison_phone' => '20123456', 'livraison_adresse1' => '12 rue Test',
        ]);
    }

    public function test_creator_response_carries_guest_capability_for_new_and_replayed_orders(): void
    {
        $method = new \ReflectionMethod(CommandeController::class, 'orderCreatedResponse');
        foreach ([false, true] as $replayed) {
            $response = $method->invoke(new CommandeController(), Commande::findOrFail(1), $replayed);
            $this->assertSame(str_repeat('a', 64), $response->getData(true)['order_token']);
            $this->assertSame($replayed ? 200 : 201, $response->getStatusCode());
        }
    }

    public function test_guest_without_email_can_read_confirmation_only_with_correct_token(): void
    {
        foreach (['', str_repeat('b', 64)] as $token) {
            $response = (new CommandeController())->details(Request::create('/api/commande/1', 'GET', ['token' => $token]), 1);
            $this->assertSame(403, $response->getStatusCode());
        }
        $response = (new CommandeController())->details(Request::create('/api/commande/1', 'GET', ['token' => str_repeat('a', 64)]), 1);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('12 rue Test', $response->getData(true)['facture']['livraison_adresse1']);
        $this->assertEquals(309, $response->getData(true)['facture']['prix_ttc']);
        $this->assertArrayNotHasKey('order_token', $response->getData(true)['facture']);
    }
}
