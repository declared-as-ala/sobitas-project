<?php

namespace Tests\Feature;

use App\Mail\OrderStatusCustomerMail;
use App\Models\Commande;
use App\Models\Facture;
use App\Services\CustomerOrderStatusMailer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CustomerOrderStatusMailerTest extends TestCase
{
    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('customer_notifications.email_order_statuses', [
            'en_cours_de_livraison', 'expidee', 'livree',
        ]);
        $app['config']->set('aramex.status_sms_max_age_days', 3);
    }

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('customer_notifications.email_order_statuses', [
            'en_cours_de_livraison', 'expidee', 'livree',
        ]);
        config()->set('aramex.status_sms_max_age_days', 3);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        Schema::create('commandes', function (Blueprint $table): void {
            $table->id();
            $table->string('numero')->nullable();
            $table->string('email')->nullable();
            $table->string('livraison_email')->nullable();
            $table->string('etat')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
        Schema::create('factures', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('commande_id')->nullable();
            $table->string('aramex_hawb')->nullable();
            $table->string('aramex_status')->nullable();
            $table->timestamp('aramex_pushed_at')->nullable();
            $table->timestamp('aramex_delivered_at')->nullable();
            $table->timestamps();
        });
        Schema::create('notification_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('event_key', 190)->unique();
            $table->string('channel', 16);
            $table->string('recipient_hash', 64);
            $table->string('status')->default('sending');
            $table->unsignedTinyInteger('attempts')->default(1);
            $table->string('provider_reference')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_status_email_is_sent_only_once_for_the_same_milestone(): void
    {
        Mail::fake();
        $order = Commande::withoutEvents(fn () => Commande::query()->create([
            'numero' => 'TEST-100',
            'email' => 'client@example.test',
            'etat' => 'en_cours_de_livraison',
        ]));

        $mailer = app(CustomerOrderStatusMailer::class);
        $this->assertTrue($mailer->sendOnce($order));
        $this->assertFalse($mailer->sendOnce($order));

        Mail::assertSent(OrderStatusCustomerMail::class, 1);
        $this->assertDatabaseCount('notification_deliveries', 1);
        $this->assertDatabaseHas('notification_deliveries', [
            'event_key' => 'email:order:' . $order->id . ':status:en_cours_de_livraison',
            'channel' => 'email',
            'status' => 'sent',
        ]);
    }

    public function test_non_customer_milestone_does_not_send_email(): void
    {
        Mail::fake();
        $order = Commande::withoutEvents(fn () => Commande::query()->create([
            'numero' => 'TEST-101',
            'email' => 'client@example.test',
            'etat' => 'en_cours_de_preparation',
        ]));

        $this->assertFalse(app(CustomerOrderStatusMailer::class)->sendOnce($order));
        Mail::assertNothingSent();
        $this->assertDatabaseCount('notification_deliveries', 0);
    }

    public function test_latest_shipment_relation_returns_the_newest_aramex_waybill(): void
    {
        $order = Commande::withoutEvents(fn () => Commande::query()->create([
            'numero' => 'TEST-102',
            'email' => 'client@example.test',
            'etat' => 'expidee',
        ]));
        Facture::withoutEvents(function () use ($order): void {
            Facture::query()->create(['commande_id' => $order->id, 'aramex_hawb' => 'OLD-001']);
            Facture::query()->create(['commande_id' => $order->id, 'aramex_hawb' => 'NEW-002']);
        });

        $this->assertSame('NEW-002', $order->fresh()->latestShipment?->aramex_hawb);
    }
}
