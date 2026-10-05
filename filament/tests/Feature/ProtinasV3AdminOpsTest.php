<?php

namespace Tests\Feature;

use App\Jobs\SendSmsJob;
use App\Mail\ProtinasGiftReminderMail;
use App\Models\Commande;
use App\Models\Facture;
use App\Models\Product;
use App\Services\AramexService;
use App\Services\DocumentConversion\BlAmountMismatchException;
use App\Services\DocumentConversion\OrderToBlService;
use App\Support\OrderCashOnDelivery;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Protinas v3 — admin, delivery note, Aramex guard and the scheduled commands (spec F0, F8, F9).
 *
 * ⚠️ ARAMEX IS NEVER CALLED. Aramex has no sandbox: AramexService is replaced by a recorder in the
 * container and every outgoing HTTP request is refused (Http::preventStrayRequests), so even a bug
 * that reached the push could not create a shipment.
 */
class ProtinasV3AdminOpsTest extends TestCase
{
    use ProtinasV3Schema;

    /** @var object{calls: list<int>} */
    private object $aramex;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildProtinasV3Database();
        Http::preventStrayRequests();

        // A delivery note needs the real factures columns (the shared schema only has the dispatch marker).
        Schema::dropIfExists('factures');
        Schema::create('factures', function (Blueprint $t): void {
            $t->id();
            foreach (['commande_id', 'client_id'] as $column) {
                $t->unsignedBigInteger($column)->nullable();
            }
            foreach (['numero', 'status', 'nom', 'prenom', 'email', 'phone', 'adresse1', 'adresse2', 'ville', 'region',
                'code_postale', 'livraison_nom', 'livraison_prenom', 'livraison_email', 'livraison_phone',
                'livraison_adresse1', 'livraison_adresse2', 'livraison_ville', 'livraison_region',
                'livraison_code_postale', 'coupon_code_snapshot', 'coupon_type_snapshot', 'aramex_hawb',
                'aramex_label_url', 'aramex_status', 'aramex_error'] as $column) {
                $t->string($column)->nullable();
            }
            foreach (['prix_ht', 'remise', 'pourcentage_remise', 'prix_ht_apres_remise', 'tva', 'timbre', 'frais_livraison',
                'prix_ttc', 'net_a_payer', 'discount_ht', 'coupon_value_snapshot'] as $column) {
                $t->decimal($column, 12, 3)->nullable();
            }
            $t->timestamp('aramex_pushed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('details_factures', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('facture_id'); $t->unsignedBigInteger('produit_id');
            $t->integer('qte'); $t->decimal('prix_unitaire', 12, 3); $t->decimal('prix_ttc', 12, 3)->nullable();
        });
        Schema::create('notification_deliveries', function (Blueprint $t): void {
            $t->id(); $t->string('event_key', 190)->unique(); $t->string('channel', 16); $t->string('recipient_hash', 64);
            $t->string('status', 16)->default('sending'); $t->unsignedTinyInteger('attempts')->default(1);
            $t->string('provider_reference', 190)->nullable(); $t->text('last_error')->nullable();
            $t->timestamp('sent_at')->nullable(); $t->timestamps();
        });

        $recorder = new class extends AramexService
        {
            /** @var list<int> */
            public array $calls = [];

            public function createShipment(Facture $bl): array
            {
                $this->calls[] = (int) $bl->id;

                return ['hawb' => null, 'label_url' => null, 'error' => 'test: Aramex is never called'];
            }
        };
        $this->app->instance(AramexService::class, $recorder);
        $this->aramex = $recorder;
    }

    private function placeOrder(?string $token, array $panier, array $extra = []): TestResponse
    {
        $this->flushHeaders();
        $request = $token ? $this->withToken($token) : $this;

        return $request->postJson('/api/add_commande', $this->orderBody($panier, $extra));
    }

    /** What EditCommande does on a save: totals from the submitted lines and fee, discounts from the database. */
    private function adminSave(Commande $order, array $lines, float $fraisInForm, string $etat): Commande
    {
        $totals = OrderCashOnDelivery::adminTotals($order, $lines, $fraisInForm);
        $this->assertNotNull($totals);
        // The browser used to send prix_ttc = lines + frais; mutateFormDataBeforeSave() replaces it.
        Commande::withoutEvents(fn () => $order->update(array_merge(['etat' => $etat, 'prix_ttc' => 999.0], $totals)));

        return $order->refresh();
    }

    public function test_status_save_keeps_total(): void
    {
        $this->product(1, 330);
        $token = $this->customer(7, 100);
        $response = $this->placeOrder($token, [[1, 1]], ['pack_discount' => true, 'points_to_redeem' => 100, 'expected_total' => 315.1]);
        $response->assertCreated();
        $order = Commande::findOrFail($response->json('id'));
        $this->assertEqualsWithDelta(14.9, (float) $order->remise, 0.0005);
        $this->assertEqualsWithDelta(0.0, (float) $order->frais_livraison, 0.0005);
        $this->assertEqualsWithDelta(315.1, (float) $order->prix_ttc, 0.0005);

        $order = $this->adminSave($order, [['produit_id' => 1, 'qte' => 1, 'prix_unitaire' => 330]], 0, 'en_cours_de_preparation');
        $this->assertEqualsWithDelta(315.1, (float) $order->prix_ttc, 0.0005, 'an admin save keeps the discounts');

        $service = app(OrderToBlService::class);
        $bl = $service->createBlFromOrder($order);
        $this->assertEqualsWithDelta(315.1, (float) $bl->net_a_payer, 0.0005, 'the courier collects what the customer was told');
        $this->assertEqualsWithDelta(0.0, (float) $bl->frais_livraison, 0.0005, 'no fee is derived from the discounts');
        $this->assertNull($service->aramexHoldReason);
        $this->assertSame([(int) $bl->id], $this->aramex->calls, 'a normal order is still pushed automatically (to the recorder)');
        $this->assertNull(OrderCashOnDelivery::aramexBlockReason(Facture::findOrFail($bl->id), true));
    }

    public function test_zero_cash_order_stays_zero(): void
    {
        $this->product(4, 30);
        $token = $this->customer(8, 800);
        $response = $this->placeOrder($token, [[4, 1]], ['points_to_redeem' => 800, 'expected_total' => 0]);
        $response->assertCreated();
        $order = Commande::findOrFail($response->json('id'));
        $this->assertTrue($order->awaitsPhoneConfirmation());

        // The admin form shows the NET delivery (0: it was paid with Protinas).
        $order = $this->adminSave($order, [['produit_id' => 4, 'qte' => 1, 'prix_unitaire' => 30]], 0, 'en_cours_de_preparation');
        $this->assertEqualsWithDelta(0.0, (float) $order->prix_ttc, 0.0005);

        $service = app(OrderToBlService::class);
        $bl = $service->createBlFromOrder($order);
        $this->assertEqualsWithDelta(0.0, (float) $bl->net_a_payer, 0.0005);
        $this->assertSame(OrderCashOnDelivery::CONFIRM_FIRST, $service->aramexHoldReason);
        $this->assertSame([], $this->aramex->calls, 'nothing is pushed before the phone confirmation');
        $this->assertNull(Facture::findOrFail($bl->id)->aramex_error, 'a held push is not an Aramex failure');
        $this->assertSame(OrderCashOnDelivery::CONFIRM_FIRST, OrderCashOnDelivery::aramexBlockReason(Facture::findOrFail($bl->id), true));

        $order->markPhoneConfirmed(1);
        $this->assertNull(OrderCashOnDelivery::aramexBlockReason(Facture::findOrFail($bl->id), true),
            '« Envoyer vers Aramex » is enabled once staff called the verified phone');
        $this->assertSame([], $this->aramex->calls);
    }

    public function test_a_total_damaged_by_the_old_admin_save_is_refused_until_the_order_is_saved_again(): void
    {
        $this->product(1, 330);
        $token = $this->customer(9, 100);
        $id = $this->placeOrder($token, [[1, 1]], ['pack_discount' => true, 'points_to_redeem' => 100, 'expected_total' => 315.1])
            ->assertCreated()->json('id');
        DB::table('commandes')->where('id', $id)->update(['prix_ttc' => 330]); // what the pre-F0 admin save wrote

        try {
            app(OrderToBlService::class)->createBlFromOrder(Commande::findOrFail($id));
            $this->fail('the delivery note must be refused');
        } catch (BlAmountMismatchException $e) {
            $this->assertStringContainsString('315,100', $e->getMessage());
        }
        $this->assertSame(0, DB::table('factures')->count());
        $this->assertSame([], $this->aramex->calls);

        $order = $this->adminSave(Commande::findOrFail($id), [['produit_id' => 1, 'qte' => 1, 'prix_unitaire' => 330]], 0, 'prete');
        $bl = app(OrderToBlService::class)->createBlFromOrder($order);
        $this->assertEqualsWithDelta(315.1, (float) $bl->net_a_payer, 0.0005);
    }

    public function test_lines_of_a_discounted_order_cannot_shrink_in_the_admin(): void
    {
        $this->product(1, 300);
        $this->product(2, 220);
        $this->product(3, 50);
        // A + B with the 7 % pack and 88 gift Protinas: remise 40.800, nothing for the courier on top.
        $id = DB::table('commandes')->insertGetId(['numero' => '2026/9101', 'etat' => 'nouvelle_commande', 'prix_ht' => 520,
            'prix_ttc' => 479.2, 'frais_livraison' => 0, 'remise' => 40.8, 'discount_ht' => 0, 'pack_discount_ht' => 36.4,
            'points_discount_ht' => 4.4, 'points_redeemed' => 88, 'points_redeemed_gift' => 88, 'pricing_version' => 3,
            'authenticated_user_id' => 0, 'livraison_nom' => 'Client', 'livraison_phone' => '20000000',
            'created_at' => now(), 'updated_at' => now()]);
        DB::table('commande_details')->insert([
            ['commande_id' => $id, 'produit_id' => 1, 'qte' => 1, 'prix_unitaire' => 300, 'prix_ht' => 300, 'prix_ttc' => 300],
            ['commande_id' => $id, 'produit_id' => 2, 'qte' => 1, 'prix_unitaire' => 220, 'prix_ht' => 220, 'prix_ttc' => 220],
        ]);
        $order = Commande::findOrFail($id);
        $line = fn (int $product, $qte, $price, ?string $arome = null) => ['produit_id' => (string) $product, 'qte' => $qte,
            'prix_unitaire' => $price, 'arome' => $arome];

        $this->assertNull(OrderCashOnDelivery::lineChangeBlockReason($order, [$line(2, 1, 220), $line(1, 1, '300.000')]),
            'a status save resubmits the same lines');
        $this->assertNull(OrderCashOnDelivery::lineChangeBlockReason($order, [$line(1, 1, 300, 'Vanille'), $line(2, 2, 220), $line(3, 1, 50)]),
            'adding goods or changing a flavour stays possible');
        $this->assertNull(OrderCashOnDelivery::lineChangeBlockReason($order, [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0]]),
            'no valid line: the stored lines are kept anyway');

        $this->assertNotNull(OrderCashOnDelivery::lineChangeBlockReason($order, [$line(2, 1, 220)]), 'removing A keeps 40.800 off a 220 DT basket');
        $this->assertNotNull(OrderCashOnDelivery::lineChangeBlockReason($order, [$line(1, 1, 250), $line(2, 1, 220)]), 'a lower unit price');
        $this->assertNotNull(OrderCashOnDelivery::lineChangeBlockReason($order, [$line(3, 1, 50), $line(2, 1, 220)]), 'a swapped product');
        $this->assertStringContainsString('Annulez la commande', (string) OrderCashOnDelivery::lineChangeBlockReason($order, [$line(2, 1, 220)]));

        // An order with no discount at all is edited freely, as before.
        DB::table('commandes')->where('id', $id)->update(['remise' => 0, 'pack_discount_ht' => 0, 'points_discount_ht' => 0,
            'points_redeemed' => 0, 'points_redeemed_gift' => 0, 'prix_ttc' => 520]);
        $this->assertNull(OrderCashOnDelivery::lineChangeBlockReason(Commande::findOrFail($id), [$line(2, 1, 220)]));
    }

    public function test_print_views_count_only_the_protinas_that_paid_the_goods(): void
    {
        // Welcome 300 on a 180 DT basket: 200 paid the delivery, 100 (5.000) the goods.
        $welcome = new Commande();
        $welcome->setRawAttributes(['points_redeemed' => 300, 'points_shipping_dt' => 10, 'points_discount_ht' => 5, 'pricing_version' => 3]);
        $this->assertSame(100, OrderCashOnDelivery::goodsProtinasPoints($welcome));
        $legacy = new Commande();
        $legacy->setRawAttributes(['points_redeemed' => 200, 'points_discount_ht' => 10, 'pricing_version' => null]);
        $this->assertSame(200, OrderCashOnDelivery::goodsProtinasPoints($legacy));
        $this->assertSame(0, OrderCashOnDelivery::goodsProtinasPoints(null));
    }

    public function test_a_legacy_order_without_discounts_still_derives_its_missing_fee(): void
    {
        $this->product(2, 100);
        $id = DB::table('commandes')->insertGetId(['numero' => '2026/9001', 'etat' => 'nouvelle_commande', 'prix_ht' => 100,
            'prix_ttc' => 107, 'frais_livraison' => 0, 'remise' => 0, 'authenticated_user_id' => 0, 'livraison_nom' => 'Ancien',
            'livraison_phone' => '20000000', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('commande_details')->insert(['commande_id' => $id, 'produit_id' => 2, 'qte' => 1, 'prix_unitaire' => 100,
            'prix_ht' => 100, 'prix_ttc' => 100]);

        $bl = app(OrderToBlService::class)->createBlFromOrder(Commande::findOrFail($id));
        $this->assertEqualsWithDelta(7.0, (float) $bl->frais_livraison, 0.0005);
        $this->assertEqualsWithDelta(107.0, (float) $bl->net_a_payer, 0.0005);
    }

    public function test_aramex_push_is_blocked_when_the_note_collects_another_amount_than_the_order(): void
    {
        $this->product(1, 330);
        $token = $this->customer(10, 100);
        $id = $this->placeOrder($token, [[1, 1]], ['pack_discount' => true, 'points_to_redeem' => 100, 'expected_total' => 315.1])
            ->assertCreated()->json('id');
        $bl = app(OrderToBlService::class)->createBlFromOrder(Commande::findOrFail($id));
        DB::table('factures')->where('id', $bl->id)->update(['net_a_payer' => 330]); // a BL edited by hand

        $reason = OrderCashOnDelivery::aramexBlockReason(Facture::findOrFail($bl->id), true);
        $this->assertNotNull($reason);
        $this->assertStringContainsString('330,000', $reason);
        $this->assertStringContainsString('315,100', $reason);
    }

    public function test_prix_achat_never_leaves_the_admin(): void
    {
        $this->product(3, 59);
        DB::table('products')->where('id', 3)->update(['prix_achat' => 41.5]);
        $product = Product::findOrFail(3);
        $this->assertArrayNotHasKey('prix_achat', $product->toArray());
        $this->assertStringNotContainsString('prix_achat', $product->toJson());
        $this->assertEqualsWithDelta(41.5, (float) $product->getAttribute('prix_achat'), 0.0005);
    }

    public function test_expire_and_gift_reminders_are_idempotent_when_run_twice(): void
    {
        $this->customer(11, 40, 300, 7);   // gift expires in 7 days → J-7 reminder
        $this->customer(12, 0, 300, 1);    // gift expires tomorrow → J-1 reminder
        $this->customer(13, 25, 300, -1);  // gift expired yesterday → expiry

        $this->artisan('protinas:gift-reminders')->assertExitCode(0);
        $this->artisan('protinas:gift-reminders')->assertExitCode(0);
        Mail::assertSent(ProtinasGiftReminderMail::class, 2);
        Mail::assertSent(ProtinasGiftReminderMail::class, fn (ProtinasGiftReminderMail $mail) => $mail->user->id === 11
            && $mail->daysLeft === 7 && $mail->points === 300 && $mail->fullFromDt === 180);
        Mail::assertSent(ProtinasGiftReminderMail::class, fn (ProtinasGiftReminderMail $mail) => $mail->user->id === 12 && $mail->daysLeft === 1);
        Mail::assertNotSent(ProtinasGiftReminderMail::class, fn (ProtinasGiftReminderMail $mail) => $mail->user->id === 13);
        Bus::assertNotDispatched(SendSmsJob::class); // PROTINAS_SMS_REMINDERS defaults to false
        $this->assertSame(2, DB::table('notification_deliveries')->where('event_key', 'like', 'email:gift-reminder:%')->count());

        config(['loyalty.gift.sms_reminders' => true]);
        $this->artisan('protinas:gift-reminders')->assertExitCode(0);
        Mail::assertSent(ProtinasGiftReminderMail::class, 2); // still two e-mails
        Bus::assertDispatched(SendSmsJob::class, fn (SendSmsJob $job) => str_starts_with((string) $job->eventKey, 'sms:gift-reminder:')
            && str_contains($job->message, 'dernier jour'));

        $this->artisan('protinas:expire', ['--dry-run' => true])->assertExitCode(0);
        $this->assertSame(325, (int) $this->userRow(13)->points_balance, 'a dry run writes nothing');
        $this->artisan('protinas:expire')->assertExitCode(0);
        $this->artisan('protinas:expire')->assertExitCode(0);
        $this->assertSame(1, DB::table('user_point_transactions')->where('user_id', 13)->where('type', 'expiry')->count());
        $this->assertSame(25, (int) $this->userRow(13)->points_balance, 'earned Protinas never expire');
        $this->assertSame(0, (int) $this->userRow(13)->gift_points_balance);
        $this->assertSame(340, (int) $this->userRow(11)->points_balance, 'a gift before its date is untouched');
    }

    public function test_check_rules_prints_the_spec_thresholds_and_fails_below_the_needed_margin(): void
    {
        $this->artisan('protinas:check-rules')
            ->expectsOutputToContain('180 DT')
            ->expectsOutputToContain('130 DT')
            ->expectsOutputToContain('173 DT')
            ->assertExitCode(0);

        config(['loyalty.budget.margin_floor_percent' => 13]); // the 500 DT / 7 % tier needs 14.25 %
        $this->artisan('protinas:check-rules')->assertExitCode(1);
    }

    public function test_check_rules_lists_implausible_purchase_prices_by_id_only(): void
    {
        foreach ([21, 22, 23] as $id) {
            $this->product($id, 100);
        }
        DB::table('products')->where('id', 21)->update(['prix_achat' => 70]); // 83.300 TTC: 16.7 %, plausible
        DB::table('products')->where('id', 22)->update(['prix_achat' => 40]); // 47.600 TTC: 52.4 %, suspicious
        DB::table('products')->where('id', 23)->update(['prix_achat' => 90]); // 107.100 TTC: above the price

        $this->artisan('protinas:check-rules')
            ->expectsOutputToContain('1 : #22')
            ->expectsOutputToContain('1 : #23')
            ->doesntExpectOutputToContain('#21')
            ->doesntExpectOutputToContain('47,6')
            ->assertExitCode(0);
    }

    public function test_coupons_review_flags_only_codes_that_accept_a_loss(): void
    {
        DB::table('coupons')->insert([
            ['code' => 'SAFE5', 'type' => 'percent', 'value' => 5, 'min_order_amount' => 60, 'is_active' => true,
                'allow_over_budget' => false, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'LOSS10', 'type' => 'percent', 'value' => 10, 'min_order_amount' => null, 'is_active' => true,
                'allow_over_budget' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $lossId = (int) DB::table('coupons')->where('code', 'LOSS10')->value('id');
        $this->artisan('protinas:coupons-review', ['--to' => 400])
            // One table row carries both '#id' and '← PERTE'; a single output line can satisfy only one
            // expectsOutputToContain, so the row is asserted once and the loss through the count line.
            ->expectsOutputToContain('#'.$lossId)
            ->expectsOutputToContain('Codes pouvant perdre de l’argent : 1')
            ->doesntExpectOutputToContain('LOSS10')
            ->doesntExpectOutputToContain('SAFE5')
            ->assertExitCode(0);
    }
}
