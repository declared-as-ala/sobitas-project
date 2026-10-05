<?php

namespace Tests\Feature;

use App\Mail\OrderConfirmedCustomerMail;
use App\Models\Commande;
use App\Models\Coupon;
use App\Models\User;
use App\Services\PhoneVerificationService;
use App\Services\PointsService;
use App\Services\ProtinaWalletService;
use App\Support\OrderCashOnDelivery;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Protinas v3 end to end on in-memory SQLite (spec F12 « ProtinasV3LifecycleTest »): what a v3 order
 * stores, and what delivery, cancellation, refusal, waiver, debt, expiry and the wallet split do to
 * the two wallets. Status changes call PointsService::syncOnStatusChange() exactly as
 * CommandeObserver does, without the observer's mail/SMS side effects.
 */
class ProtinasV3LifecycleTest extends TestCase
{
    use ProtinasV3Schema;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildProtinasV3Database();
    }

    private function placeOrder(?string $token, array $panier, array $extra = [], array $commande = []): TestResponse
    {
        $this->flushHeaders();
        $request = $token ? $this->withToken($token) : $this;

        return $request->postJson('/api/add_commande', $this->orderBody($panier, $extra, $commande));
    }

    private function quote(string $token, array $panier, array $extra = [], array $commande = []): TestResponse
    {
        $this->flushHeaders();

        return $this->withToken($token)->postJson('/api/checkout/quote', $this->orderBody($panier, $extra, $commande));
    }

    private function setStatus(int $commandeId, string $etat, bool $dispatched = false): Commande
    {
        if ($dispatched) {
            DB::table('factures')->insert(['commande_id' => $commandeId, 'aramex_hawb' => 'HAWB'.$commandeId,
                'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('commandes')->where('id', $commandeId)->update(['etat' => $etat, 'updated_at' => now()]);
        $order = Commande::findOrFail($commandeId);
        app(PointsService::class)->syncOnStatusChange($order);

        return $order->refresh();
    }

    private function ledger(int $commandeId, string $key): ?object
    {
        return DB::table('user_point_transactions')->where('commande_id', $commandeId)->where('idempotency_key', $key)->first();
    }

    private function assertIdentity(object $order): void
    {
        $this->assertEqualsWithDelta(
            (float) $order->prix_ht - (float) $order->discount_ht - (float) $order->remise + (float) $order->frais_livraison,
            (float) $order->prix_ttc, 0.0005, 'prix_ttc = prix_ht − discount_ht − remise + frais_livraison');
    }

    public function test_six_baskets_store_the_v3_columns_and_keep_the_cash_on_delivery_identity(): void
    {
        foreach ([1 => 120, 2 => 200, 3 => 90, 4 => 30, 5 => 180, 6 => 300] as $id => $price) {
            $this->product($id, $price);
        }
        DB::table('coupons')->insert(['code' => 'NEW10', 'type' => 'percent', 'value' => 10, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now()]);
        $cases = [
            // [token, product, extra, expected total, remise, frais net, points shipping, used, gift]
            'guest' => [null, 1, [], 130.0, 0.0, 10.0, 0.0, 0, 0],
            'pack + 660 earned' => [$this->customer(2, 660), 2, ['pack_discount' => true, 'points_to_redeem' => 660], 171.0, 29.0, 0.0, 10.0, 660, 0],
            '90 + 900 earned' => [$this->customer(3, 900), 3, ['points_to_redeem' => 900], 55.0, 35.0, 0.0, 10.0, 900, 0],
            'gloves all earned' => [$this->customer(4, 1000), 4, ['points_to_redeem' => 800], 0.0, 30.0, 0.0, 10.0, 800, 0],
            'welcome at 180' => [$this->customer(5, 0, 300), 5, [], 175.0, 5.0, 0.0, 10.0, 300, 300],
            'guarded 10 % code' => [$this->customer(6), 6, ['coupon_code' => 'NEW10'], 282.106, 0.0, 0.0, 0.0, 0, 0],
        ];
        foreach ($cases as $label => [$token, $productId, $extra, $total, $remise, $frais, $pointsShipping, $used, $gift]) {
            $response = $this->placeOrder($token, [[$productId, 1]], $extra + ['expected_total' => $total]);
            $response->assertCreated();
            $order = DB::table('commandes')->where('id', $response->json('id'))->first();
            $this->assertIdentity($order);
            $this->assertEqualsWithDelta($total, (float) $order->prix_ttc, 0.0005, $label);
            $this->assertEqualsWithDelta($remise, (float) $order->remise, 0.0005, $label.' remise');
            $this->assertEqualsWithDelta($frais, (float) $order->frais_livraison, 0.0005, $label.' frais');
            $this->assertEqualsWithDelta($pointsShipping, (float) $order->points_shipping_dt, 0.0005, $label.' points_shipping_dt');
            $this->assertSame($used, (int) $order->points_redeemed, $label);
            $this->assertSame($gift, (int) $order->points_redeemed_gift, $label);
            $this->assertSame(3, (int) $order->pricing_version, $label);
            $this->assertNotNull($order->budget_dt, $label);
            $this->assertArrayNotHasKey('budget_dt', $response->json('pricing'));
        }

        $gloves = DB::table('commandes')->where('authenticated_user_id', 4)->first();
        $this->assertSame(1, (int) $gloves->requires_phone_confirmation);
        $this->assertSame('Protinas utilisées sur commande '.$gloves->numero.' (dont 200 pour la livraison)',
            $this->ledger((int) $gloves->id, 'order:'.$gloves->id.':redeem')->description);
        $this->assertSame(200, (int) $this->userRow(4)->points_balance);

        $welcome = DB::table('commandes')->where('authenticated_user_id', 5)->first();
        $giftRow = $this->ledger((int) $welcome->id, 'order:'.$welcome->id.':redeem-gift');
        $this->assertSame('gift', $giftRow->bucket);
        $this->assertSame(-300, (int) $giftRow->points);
        $this->assertNotNull($giftRow->expires_at);
        $this->assertSame(0, (int) $this->userRow(5)->gift_points_balance);
        $this->assertSame(0, (int) DB::table('user_point_transactions')->where('idempotency_key', 'welcome:5:unlock:0')->value('remaining'));
        $this->assertSame((int) $welcome->id, (int) DB::table('welcome_bonus_claims')->where('user_id', 5)->value('used_by_commande_id'));

        $coded = DB::table('commandes')->where('authenticated_user_id', 6)->first();
        $this->assertEqualsWithDelta(17.894, (float) $coded->discount_ht, 0.0005);
        $this->assertSame(1, DB::table('coupon_redemptions')->where('order_id', $coded->id)->count());
    }

    public function test_expected_total_mismatch_still_returns_409_and_writes_nothing(): void
    {
        $this->product(1, 180);
        $token = $this->customer(1, 0, 300);
        $this->placeOrder($token, [[1, 1]], ['expected_total' => 190])
            ->assertStatus(409)->assertJsonPath('pricing.total_dt', 175);
        $this->assertSame(0, DB::table('commandes')->count());
        $this->assertSame(300, (int) $this->userRow(1)->gift_points_balance);
    }

    public function test_earnings_are_held_fourteen_days(): void
    {
        $this->product(1, 180);
        $id = $this->placeOrder($this->customer(1, 0, 300), [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->setStatus($id, 'livree');

        $earn = $this->ledger($id, 'order:'.$id.':earn');
        $this->assertSame(175, (int) $earn->points);
        $this->assertNotNull($earn->available_at);
        $wallet = $this->wallet(1);
        $this->assertSame(175, $wallet->earnedPending);
        $this->assertSame(0, $wallet->earnedSpendable);

        $this->travel(14)->days();
        $this->travel(1)->minutes();
        $wallet = $this->wallet(1);
        $this->assertSame(0, $wallet->earnedPending);
        $this->assertSame(175, $wallet->earnedSpendable);
    }

    public function test_cancel_before_dispatch_gives_everything_back_with_the_gift_expiry(): void
    {
        $this->product(1, 300);
        $id = $this->placeOrder($this->customer(1, 500, 300), [[1, 1]], ['points_to_redeem' => 500, 'expected_total' => 260])
            ->assertCreated()->json('id');
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);
        $lotExpiry = DB::table('user_point_transactions')->where('idempotency_key', 'welcome:1:unlock:0')->value('expires_at');

        $this->setStatus($id, 'annuler');
        $this->assertSame(800, (int) $this->userRow(1)->points_balance);
        $this->assertSame(300, (int) $this->userRow(1)->gift_points_balance);
        $this->assertSame(500, (int) $this->ledger($id, 'order:'.$id.':redeem-refund')->points);
        $giftRefund = $this->ledger($id, 'order:'.$id.':redeem-refund-gift');
        $this->assertSame(300, (int) $giftRefund->points);
        $this->assertSame(300, (int) $giftRefund->remaining);
        $this->assertSame(Carbon::parse($lotExpiry)->toDateTimeString(), Carbon::parse($giftRefund->expires_at)->toDateTimeString());
        $this->assertSame(0, (int) Commande::findOrFail($id)->protinas_forfeited);

        // Idempotent: the same status saved again writes nothing.
        $this->setStatus($id, 'annuler');
        $this->assertSame(800, (int) $this->userRow(1)->points_balance);
    }

    public function test_a_gift_refunded_after_its_expiry_gets_seven_more_days(): void
    {
        $this->product(1, 180);
        $id = $this->placeOrder($this->customer(1, 0, 300, 3), [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->travel(10)->days();
        $this->setStatus($id, 'annuler');
        $refund = $this->ledger($id, 'order:'.$id.':redeem-refund-gift');
        $this->assertSame(300, (int) $refund->points);
        $this->assertEqualsWithDelta(now()->addDays(7)->getTimestamp(), Carbon::parse($refund->expires_at)->getTimestamp(), 5);
        $this->assertSame(300, $this->wallet(1)->gift);
    }

    public function test_refusal_after_dispatch_keeps_the_400_protinas_deposit_earned_first(): void
    {
        $this->product(1, 30);
        $this->product(2, 180);
        $this->product(3, 100);

        // 800 earned used (gloves, 0 DT to collect) → keep 400, refund 400.
        $a = $this->placeOrder($this->customer(1, 1000), [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');
        $this->setStatus($a, 'annuler', true);
        $this->assertSame(400, (int) $this->ledger($a, 'order:'.$a.':redeem-refund')->points);
        $this->assertSame(600, (int) $this->userRow(1)->points_balance);
        $this->assertSame(400, (int) Commande::findOrFail($a)->protinas_forfeited);

        // 300 gift + 300 earned → keep 300 earned + 100 gift, refund 200 gift.
        $b = $this->placeOrder($this->customer(2, 300, 300), [[2, 1]], ['points_to_redeem' => 300, 'expected_total' => 160])->assertCreated()->json('id');
        $this->setStatus($b, 'annuler', true);
        $this->assertNull($this->ledger($b, 'order:'.$b.':redeem-refund'));
        $this->assertSame(200, (int) $this->ledger($b, 'order:'.$b.':redeem-refund-gift')->points);
        $this->assertSame(200, (int) $this->userRow(2)->points_balance);
        $this->assertSame(200, (int) $this->userRow(2)->gift_points_balance);
        $this->assertSame(400, (int) Commande::findOrFail($b)->protinas_forfeited);

        // 100 earned → keep 100.
        $c = $this->placeOrder($this->customer(3, 100), [[3, 1]], ['points_to_redeem' => 100, 'expected_total' => 105])->assertCreated()->json('id');
        $this->setStatus($c, 'annuler', true);
        $this->assertSame(0, (int) $this->userRow(3)->points_balance);
        $this->assertSame(100, (int) Commande::findOrFail($c)->protinas_forfeited);

        // Waiver: exactly once.
        $order = Commande::findOrFail($a);
        $this->assertSame(400, app(PointsService::class)->waiveForfeit($order));
        $this->assertSame(0, app(PointsService::class)->waiveForfeit(Commande::findOrFail($a)));
        $this->assertSame(1000, (int) $this->userRow(1)->points_balance);
        $this->assertTrue(Commande::findOrFail($a)->protinas_forfeit_waived);
        $this->assertSame(400, (int) $this->ledger($a, 'order:'.$a.':forfeit-refund')->points);
    }

    public function test_two_refusals_in_ninety_days_freeze_the_gift_but_not_earned_protinas(): void
    {
        $this->product(1, 50);
        $this->product(2, 180);
        $token = $this->customer(1, 2000, 300);
        foreach ([1, 2] as $n) {
            $id = $this->placeOrder($token, [[1, 1]], ['use_gift' => false, 'expected_total' => 60])->assertCreated()->json('id');
            $this->setStatus($id, 'annuler', true);
            $frozen = $this->userRow(1)->gift_frozen_until;
            $n === 1 ? $this->assertNull($frozen) : $this->assertNotNull($frozen);
        }
        $this->assertEqualsWithDelta(now()->addDays(90)->getTimestamp(), Carbon::parse($this->userRow(1)->gift_frozen_until)->getTimestamp(), 5);
        $wallet = $this->wallet(1);
        $this->assertSame('gift_frozen', $wallet->blockedReason);
        $this->assertSame(0, $wallet->usableGift());
        $this->assertSame(2000, $wallet->usableEarned());

        $this->quote($token, [[2, 1]], ['points_to_redeem' => 100])->assertOk()
            ->assertJsonPath('pricing.protinas.used_gift_points', 0)
            ->assertJsonPath('pricing.protinas.used_earned_points', 100)
            ->assertJsonPath('pricing.protinas.blocked_reason', 'gift_frozen')
            ->assertJsonPath('pricing.requires_phone_confirmation', true);
    }

    public function test_an_order_delivered_after_its_refund_is_debited_again_and_a_shortfall_becomes_debt(): void
    {
        $this->product(1, 30);
        $id = $this->placeOrder($this->customer(1, 1000), [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');
        $this->setStatus($id, 'annuler');
        $this->assertSame(1000, (int) $this->userRow(1)->points_balance);

        // The refunded Protinas are spent elsewhere…
        app(PointsService::class)->record(User::findOrFail(1), 'redeem', -900, 'Autre commande', 9999, null, 'order:9999:redeem');
        $this->assertSame(100, (int) $this->userRow(1)->points_balance);

        // …then the courier delivers the "cancelled" parcel after all.
        $this->setStatus($id, 'livree');
        $this->assertSame(-800, (int) $this->ledger($id, 'order:'.$id.':redeem:v1')->points);
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);
        $this->assertSame(700, (int) $this->userRow(1)->points_debt);
        $this->assertSame('debt', $this->wallet(1)->blockedReason);

        $this->setStatus($id, 'livree'); // idempotent
        $this->assertSame(700, (int) $this->userRow(1)->points_debt);
    }

    public function test_return_after_spending_the_earnings_creates_a_debt_that_the_next_earnings_repay(): void
    {
        $this->product(1, 180);
        $this->product(2, 100);
        $this->product(3, 200);
        $token = $this->customer(1, 0, 300);
        $a = $this->placeOrder($token, [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->setStatus($a, 'livree');
        $this->travel(15)->days();

        $this->placeOrder($token, [[2, 1]], ['points_to_redeem' => 175, 'expected_total' => 101.25])->assertCreated();
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);

        $this->setStatus($a, 'retour');
        $this->assertSame(175, (int) $this->userRow(1)->points_debt);
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);
        $this->assertSame(300, (int) Commande::findOrFail($a)->protinas_forfeited); // the gift spent on it is kept
        $this->quote($token, [[3, 1]])->assertOk()
            ->assertJsonPath('pricing.protinas.max_usable_points', 0)
            ->assertJsonPath('pricing.protinas.debt_points', 175)
            ->assertJsonPath('pricing.protinas.blocked_reason', 'debt');
        $this->placeOrder($token, [[3, 1]], ['points_to_redeem' => 10, 'expected_total' => 210])->assertStatus(422);

        $c = $this->placeOrder($token, [[3, 1]], ['expected_total' => 210])->assertCreated()->json('id');
        $this->setStatus($c, 'livree');
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
        $this->assertSame(25, (int) $this->userRow(1)->points_balance);
    }

    public function test_legacy_orders_keep_the_old_terms(): void
    {
        DB::table('users')->insert(['id' => 1, 'name' => 'Ancien', 'email' => 'ancien@example.test', 'phone' => '+21620000001',
            'points_balance' => 200, 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('commandes')->insert(['id' => 40, 'numero' => '2026/0040', 'etat' => 'expidee', 'user_id' => 1,
            'authenticated_user_id' => 1, 'prix_ht' => 200, 'prix_ttc' => 185, 'frais_livraison' => 10,
            'remise' => 15, 'points_discount_ht' => 15, 'points_redeemed' => 300, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('user_point_transactions')->insert(['user_id' => 1, 'commande_id' => 40, 'type' => 'redeem', 'points' => -300,
            'balance_after' => 200, 'bucket' => 'earned', 'idempotency_key' => 'order:40:redeem',
            'created_at' => now(), 'updated_at' => now()]);

        $this->setStatus(40, 'livree');
        $earn = $this->ledger(40, 'order:40:earn');
        $this->assertSame(175, (int) $earn->points);      // legacy formula: min(prix_ht, prix_ttc − frais)
        $this->assertNull($earn->available_at);           // no hold on pre-v3 orders
        $this->assertSame(375, $this->wallet(1)->earnedSpendable);

        $this->setStatus(40, 'annuler', true);            // refused after dispatch, old terms: full refund
        $this->assertSame(300, (int) $this->ledger(40, 'order:40:redeem-refund')->points);
        $this->assertSame(-175, (int) $this->ledger(40, 'order:40:earn-reversal')->points);
        $this->assertSame(500, (int) $this->userRow(1)->points_balance);
        $this->assertSame(0, (int) Commande::findOrFail(40)->protinas_forfeited);
    }

    public function test_phone_verification_credits_a_300_gift_valid_sixty_days(): void
    {
        DB::table('users')->insert(['id' => 1, 'name' => 'Nouveau', 'email' => 'nouveau@example.test', 'phone' => '+21622000017',
            'role_id' => 2, 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $result = app(PhoneVerificationService::class)->claimWelcomeBonus(User::findOrFail(1));
        $this->assertTrue($result['bonus_awarded']);
        $this->assertSame(180, $result['gift_full_from_dt']);
        $this->assertStringContainsString('en entier dès 180 DT', $result['message']);
        $row = DB::table('user_point_transactions')->where('idempotency_key', 'welcome:1:unlock:0')->first();
        $this->assertSame(300, (int) $row->points);
        $this->assertSame('gift', $row->bucket);
        $this->assertSame(300, (int) $row->remaining);
        $this->assertEqualsWithDelta(now()->addDays(60)->getTimestamp(), Carbon::parse($row->expires_at)->getTimestamp(), 5);
        $this->assertSame(300, (int) $this->userRow(1)->gift_points_balance);
        $this->assertNotNull($result['bonus_expires_at']);

        // v2 rollback: the gift is still credited, but no v3 « en entier dès 180 DT » is promised.
        config(['loyalty.rules_version' => 2]);
        DB::table('users')->insert(['id' => 2, 'name' => 'Nouveau 2', 'email' => 'nouveau2@example.test', 'phone' => '+21622000018',
            'role_id' => 2, 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $v2 = app(PhoneVerificationService::class)->claimWelcomeBonus(User::findOrFail(2));
        $this->assertTrue($v2['bonus_awarded']);
        $this->assertNull($v2['gift_full_from_dt']);
        $this->assertStringNotContainsString('en entier', $v2['message']);
    }

    public function test_gift_expiry_is_idempotent_and_never_touches_earned_protinas(): void
    {
        $this->customer(1, 100, 300, 1);
        $this->travel(2)->days();
        $this->assertSame(0, $this->wallet(1)->gift); // expired lots stop counting before the job runs
        $service = app(ProtinaWalletService::class);
        $this->assertSame(['expired_lots' => 1, 'points' => 300, 'failed' => 0], $service->expireDue());
        $this->assertSame(['expired_lots' => 0, 'points' => 0, 'failed' => 0], $service->expireDue());
        $this->assertSame(100, (int) $this->userRow(1)->points_balance);
        $this->assertSame(0, (int) $this->userRow(1)->gift_points_balance);
        $this->assertSame(1, DB::table('user_point_transactions')->where('type', 'expiry')->count());
        $this->assertSame(100, $this->wallet(1)->earnedSpendable);
    }

    public function test_unique_delivery_phone_switch_only_removes_the_gift(): void
    {
        $this->product(1, 180);
        $token = $this->customer(1, 100, 300);
        $this->customer(2, 0, 300, 60, '+21620123456'); // another account's welcome claim on the delivery phone
        $body = ['points_to_redeem' => 100];
        $this->quote($token, [[1, 1]], $body, ['livraison_phone' => '20123456'])->assertOk()
            ->assertJsonPath('pricing.protinas.used_gift_points', 300)
            ->assertJsonPath('pricing.protinas.used_earned_points', 100)
            ->assertJsonPath('pricing.total_dt', 170);

        config(['welcome_bonus.unique_delivery_phone' => true]);
        $this->quote($token, [[1, 1]], $body, ['livraison_phone' => '20123456'])->assertOk()
            ->assertJsonPath('pricing.protinas.used_gift_points', 0)
            ->assertJsonPath('pricing.protinas.used_earned_points', 100)
            ->assertJsonPath('pricing.protinas.blocked_reason', 'welcome_phone_used')
            ->assertJsonPath('pricing.total_dt', 185);
    }

    public function test_review_rewards_are_gift_protinas(): void
    {
        DB::table('users')->insert(['id' => 1, 'name' => 'Avis', 'email' => 'avis@example.test', 'phone' => '+21620000001',
            'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $points = app(PointsService::class);
        $this->assertTrue($points->awardForReview(User::findOrFail(1), 55, 'Whey', 50));
        $row = DB::table('user_point_transactions')->where('idempotency_key', 'review:55:award')->first();
        $this->assertSame('gift', $row->bucket);
        $this->assertSame(50, (int) $row->remaining);
        $this->assertNotNull($row->expires_at);
        $this->assertSame(50, (int) $this->userRow(1)->gift_points_balance);

        $this->assertTrue($points->reverseForReview(User::findOrFail(1), 55));
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);
        $this->assertSame(0, (int) $this->userRow(1)->gift_points_balance);
    }

    public function test_split_wallets_classifies_the_legacy_ledger_and_keeps_every_balance(): void
    {
        foreach ([21 => 320, 22 => 300, 23 => 0] as $id => $balance) {
            DB::table('users')->insert(['id' => $id, 'name' => 'Client '.$id, 'email' => 'c'.$id.'@example.test',
                'points_balance' => $balance, 'created_at' => now(), 'updated_at' => now()]);
        }
        $row = fn (int $user, string $type, int $points, ?int $commande, ?string $key, string $description = 'Protinas')
            => DB::table('user_point_transactions')->insertGetId(['user_id' => $user, 'commande_id' => $commande,
                'type' => $type, 'points' => $points, 'balance_after' => 0, 'description' => $description,
                'idempotency_key' => $key, 'bucket' => null, 'created_at' => now()->subMonth(), 'updated_at' => now()->subMonth()]);
        $welcome21 = $row(21, 'earn', 300, null, null, 'Cadeau de bienvenue — 15 DT en points');
        $row(21, 'earn', 120, 501, 'order:501:earn');
        $row(21, 'redeem', -100, 502, 'order:502:redeem');
        $welcome22 = $row(22, 'earn', 300, null, 'welcome:22:unlock:0', 'Cadeau de bienvenue — 15 DT en Protinas');
        $row(23, 'earn', 100, 503, 'order:503:earn');
        $row(23, 'redeem', -100, 504, 'order:504:redeem');
        $row(23, 'adjustment', -100, 503, 'order:503:earn-reversal'); // forgiven by the old 0-floor

        // Before the split, a balance counts as gift (budget-bounded), never as free earned money.
        $before = $this->wallet(21);
        $this->assertTrue($before->unsplit);
        $this->assertSame(320, $before->gift);
        $this->assertSame(0, $before->earnedSpendable);

        $this->artisan('protinas:split-wallets')->assertExitCode(0);
        $this->assertSame(7, DB::table('user_point_transactions')->whereNull('bucket')->count()); // dry run

        $this->artisan('protinas:split-wallets', ['--apply' => true])->assertExitCode(0);
        $this->assertSame(0, DB::table('user_point_transactions')->whereNull('bucket')->count());
        $wallet = $this->wallet(21);
        $this->assertFalse($wallet->unsplit);
        $this->assertSame(200, $wallet->gift);
        $this->assertSame(120, $wallet->earnedSpendable);
        $lot = DB::table('user_point_transactions')->where('id', $welcome21)->first();
        $this->assertSame('gift', $lot->bucket);
        $this->assertSame(200, (int) $lot->remaining);
        $this->assertNull($lot->expires_at);

        $this->assertSame(300, $this->wallet(22)->gift);
        $this->assertNull(DB::table('user_point_transactions')->where('id', $welcome22)->value('expires_at'));

        $marker = DB::table('user_point_transactions')->where('idempotency_key', 'migration:wallets:23')->first();
        $this->assertSame(100, (int) $marker->points);
        $this->assertSame(0, (int) DB::table('user_point_transactions')->where('user_id', 23)->sum('points'));
        $this->assertSame(0, (int) $this->userRow(23)->points_debt);
        foreach ([21 => 320, 22 => 300, 23 => 0] as $id => $balance) {
            $this->assertSame($balance, (int) $this->userRow($id)->points_balance);
        }

        // Idempotent, and the hidden reconciliation row never reaches the customer.
        $this->artisan('protinas:split-wallets', ['--apply' => true])->assertExitCode(0);
        $this->assertSame(200, (int) $this->userRow(21)->gift_points_balance);
        $this->flushHeaders();
        $history = $this->withToken(User::findOrFail(23)->createToken('t')->plainTextToken)->getJson('/api/points/history')->assertOk();
        $this->assertCount(3, $history->json('transactions'));
        $this->assertSame(0, $history->json('wallet.total'));
    }

    public function test_an_affiliate_order_reserves_the_commission_before_the_gift(): void
    {
        Schema::table('products', fn (Blueprint $t) => $t->decimal('prix_affilie', 12, 3)->nullable());
        Schema::create('affilies', function (Blueprint $t): void {
            $t->id(); $t->string('name')->nullable(); $t->string('status')->default('active');
            $t->string('subdomain')->nullable(); $t->decimal('commission_rate', 6, 2)->nullable(); $t->timestamps();
        });
        $affilieId = DB::table('affilies')->insertGetId(['name' => 'Ali', 'status' => 'active', 'subdomain' => 'ali',
            'commission_rate' => 10, 'created_at' => now(), 'updated_at' => now()]);
        $this->product(1, 180);
        DB::table('products')->where('id', 1)->update(['prix_affilie' => 162]); // spread 18 DT > the 15 DT budget
        $token = $this->customer(1, 0, 300);

        $this->quote($token, [[1, 1]])->assertOk()
            ->assertJsonPath('pricing.protinas.used_gift_points', 300)->assertJsonPath('pricing.total_dt', 175);
        $this->quote($token, [[1, 1]], ['affiliate_subdomain' => 'ali'])->assertOk()
            ->assertJsonPath('pricing.protinas.used_gift_points', 0)->assertJsonPath('pricing.total_dt', 190);

        $id = $this->placeOrder($token, [[1, 1]], ['affiliate_subdomain' => 'ali', 'expected_total' => 190])->assertCreated()->json('id');
        $order = DB::table('commandes')->where('id', $id)->first();
        $this->assertSame($affilieId, (int) $order->affilie_id);
        $this->assertSame(0, (int) $order->points_redeemed_gift);
        $this->assertSame(300, (int) $this->userRow(1)->gift_points_balance);
    }

    public function test_a_tab_without_a_quote_is_refused_when_v3_would_charge_more_than_it_showed(): void
    {
        $this->product(1, 300);
        $this->product(2, 1200, 'cardio-fitness');
        $this->product(3, 100);
        foreach (['NEW10' => [Coupon::TYPE_PERCENT, 10], 'LIVRAISON' => [Coupon::TYPE_FREE_SHIPPING, 0]] as $code => [$type, $value]) {
            DB::table('coupons')->insert(['code' => $code, 'type' => $type, 'value' => $value, 'is_active' => true,
                'created_at' => now(), 'updated_at' => now()]);
        }
        // No expected_total: the quote had failed and the tab showed /coupons/apply or cart + flat delivery.
        $this->placeOrder(null, [[1, 1]], ['coupon_code' => 'NEW10'])->assertStatus(409)
            ->assertJsonPath('pricing.total_dt', 282.106);              // the tab showed 270.00
        $this->placeOrder(null, [[2, 1]])->assertStatus(409)
            ->assertJsonPath('pricing.total_dt', 1210);                 // machines never reach free delivery
        $this->placeOrder(null, [[3, 1]], ['coupon_code' => 'LIVRAISON'])->assertStatus(409)
            ->assertJsonPath('pricing.coupon.reason', 'free_shipping_minimum')->assertJsonPath('pricing.total_dt', 110);
        $this->assertSame(0, DB::table('commandes')->count());
        $this->assertSame(50, (int) DB::table('products')->where('id', 1)->value('qte'));

        $this->placeOrder(null, [[3, 1]])->assertCreated();              // an ordinary basket still goes through

        // The tab (or quick-order drawer) that was shown the 409 confirms that total: created at exactly it.
        $id = $this->placeOrder(null, [[2, 1]], ['expected_total' => 1210])->assertCreated()->json('id');
        $this->assertEqualsWithDelta(1210.0, (float) DB::table('commandes')->where('id', $id)->value('prix_ttc'), 0.0005);
    }

    public function test_a_pre_v3_tab_asking_for_its_welcome_points_gets_the_new_total_not_a_refusal(): void
    {
        $this->product(1, 150);
        $token = $this->customer(1, 0, 300);
        // The old tab: points_to_redeem meant every Protina and it sends no use_gift.
        $this->quote($token, [[1, 1]], ['points_to_redeem' => 300])->assertOk()
            ->assertJsonPath('pricing.protinas.used_gift_points', 240)
            ->assertJsonPath('pricing.protinas.used_earned_points', 0);
        $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 300, 'expected_total' => 145])
            ->assertStatus(409)->assertJsonPath('pricing.total_dt', 148);
        $this->assertSame(0, DB::table('commandes')->count());
        $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 300, 'expected_total' => 148])->assertCreated();
    }

    public function test_marking_a_partially_loaded_order_delivered_earns_on_the_frozen_base(): void
    {
        $this->product(1, 5200, 'cardio-fitness');
        $this->product(2, 200);
        $id = $this->placeOrder($this->customer(1), [[1, 1], [2, 1]], ['pack_discount' => true, 'expected_total' => 5404])
            ->assertCreated()->json('id');
        $this->assertEqualsWithDelta(194.0, (float) DB::table('commandes')->where('id', $id)->value('earn_base_dt'), 0.0005);

        // What CommandeResource's table hands « Marquer comme livrée »: a model from a narrow select().
        $partial = Commande::query()->select(['id', 'numero', 'etat', 'prix_ttc', 'prix_ht', 'frais_livraison',
            'authenticated_user_id', 'user_id'])->findOrFail($id);
        DB::table('commandes')->where('id', $id)->update(['etat' => 'livree']);
        $partial->etat = 'livree';
        app(PointsService::class)->syncOnStatusChange($partial);

        $earn = $this->ledger($id, 'order:'.$id.':earn');
        $this->assertSame(194, (int) $earn->points);   // the whey's cash only, never the 5,200 DT treadmill
        $this->assertNotNull($earn->available_at);     // and held like any v3 earning
    }

    public function test_an_admin_line_edit_caps_the_frozen_earn_base(): void
    {
        $this->product(1, 250);
        $this->product(2, 59);
        $id = $this->placeOrder($this->customer(1), [[1, 1], [2, 1]], ['expected_total' => 309])->assertCreated()->json('id');
        $this->assertEqualsWithDelta(309.0, (float) DB::table('commandes')->where('id', $id)->value('earn_base_dt'), 0.0005);

        // The whey is out of stock: staff remove the line, EditCommande rewrites prix_ht / prix_ttc.
        DB::table('commandes')->where('id', $id)->update(['prix_ht' => 59, 'prix_ttc' => 59, 'frais_livraison' => 0]);
        $this->assertSame(59, app(ProtinaWalletService::class)->inTransit(User::findOrFail(1))[0]['points']);

        $this->setStatus($id, 'livree');
        $this->assertSame(59, (int) $this->ledger($id, 'order:'.$id.':earn')->points);
    }

    public function test_a_cancelled_order_put_back_in_progress_is_debited_again_and_keeps_its_deposit_when_refused(): void
    {
        $this->product(1, 30);
        $id = $this->placeOrder($this->customer(1, 1000), [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])
            ->assertCreated()->json('id');
        $this->setStatus($id, 'annuler');                       // before dispatch: everything comes back
        $this->assertSame(1000, (int) $this->userRow(1)->points_balance);

        // Staff put it back in progress: the observer's model still holds « annuler » as its original.
        $order = Commande::findOrFail($id);
        DB::table('commandes')->where('id', $id)->update(['etat' => 'expidee']);
        $order->etat = 'expidee';
        app(PointsService::class)->syncOnStatusChange($order);
        $this->assertSame(-800, (int) $this->ledger($id, 'order:'.$id.':redeem:v1')->points);
        $this->assertSame(200, (int) $this->userRow(1)->points_balance);

        $this->setStatus($id, 'annuler', true);                 // shipped again, refused at the door
        $this->assertSame(400, (int) Commande::findOrFail($id)->protinas_forfeited);
        $this->assertSame(600, (int) $this->userRow(1)->points_balance);
    }

    public function test_a_waived_deposit_does_not_survive_a_redelivery(): void
    {
        $this->product(1, 30);
        $id = $this->placeOrder($this->customer(1, 1000), [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])
            ->assertCreated()->json('id');
        $this->setStatus($id, 'annuler', true);                 // refused: 400 kept
        $this->assertSame(400, app(PointsService::class)->waiveForfeit(Commande::findOrFail($id)));
        $this->assertSame(1000, (int) $this->userRow(1)->points_balance);

        $this->setStatus($id, 'livree');                        // sent again and delivered: spent again
        $this->assertSame(200, (int) $this->userRow(1)->points_balance);
        $order = Commande::findOrFail($id);
        $this->assertFalse($order->protinas_forfeit_waived);
        $this->assertSame(0, $order->protinas_forfeited);

        $this->setStatus($id, 'retour');                        // returned: a fresh deposit is kept
        $this->assertSame(400, (int) Commande::findOrFail($id)->protinas_forfeited);
        $this->assertSame(600, (int) $this->userRow(1)->points_balance);

        // …and may be waived again, under a new key.
        $this->assertSame(400, app(PointsService::class)->waiveForfeit(Commande::findOrFail($id)));
        $this->assertSame(400, (int) $this->ledger($id, 'order:'.$id.':forfeit-refund:v1')->points);
        $this->assertSame(1000, (int) $this->userRow(1)->points_balance);
    }

    public function test_a_split_rerun_keeps_an_existing_debt_and_reconciles_only_the_old_drift(): void
    {
        DB::table('users')->insert(['id' => 30, 'name' => 'Dette', 'email' => 'dette@example.test', 'points_balance' => 0,
            'points_debt' => 175, 'email_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $row = fn (string $type, int $points, int $commande, string $key, ?string $bucket) => DB::table('user_point_transactions')->insert([
            'user_id' => 30, 'commande_id' => $commande, 'type' => $type, 'points' => $points, 'balance_after' => 0,
            'description' => 'Protinas', 'idempotency_key' => $key, 'bucket' => $bucket,
            'created_at' => now()->subMonth(), 'updated_at' => now()->subMonth()]);
        $row('earn', 200, 601, 'order:601:earn', null);
        $row('redeem', -175, 602, 'order:602:redeem', null);
        $row('adjustment', -50, 603, 'order:603:earn-reversal', null);     // forgiven by the old 0-floor
        $row('adjustment', -200, 601, 'order:601:earn-reversal', 'earned'); // v3 clawback after a failed split: 175 of debt

        $this->artisan('protinas:split-wallets', ['--apply' => true])->assertExitCode(0);
        $this->assertSame(175, (int) $this->userRow(30)->points_debt);      // never forgiven (rule 16)
        $this->assertSame(50, (int) DB::table('user_point_transactions')->where('idempotency_key', 'migration:wallets:30')->value('points'));
        $this->assertSame(-175, (int) DB::table('user_point_transactions')->where('user_id', 30)->sum('points')); // balance − debt
        $this->assertSame('debt', $this->wallet(30)->blockedReason);
    }

    public function test_rows_written_by_old_code_after_the_split_are_added_to_the_wallet_as_it_stands(): void
    {
        $this->customer(33, 500, 300);
        // v3 spends 200 earned Protinas…
        DB::table('user_point_transactions')->insert(['user_id' => 33, 'commande_id' => 701, 'type' => 'redeem', 'points' => -200,
            'balance_after' => 600, 'description' => 'Protinas utilisées', 'idempotency_key' => 'order:701:redeem', 'bucket' => 'earned',
            'created_at' => now(), 'updated_at' => now()]);
        // …then the old queue worker, still running during the deploy, credits a delivery without a bucket.
        DB::table('user_point_transactions')->insert(['user_id' => 33, 'commande_id' => 700, 'type' => 'earn', 'points' => 100,
            'balance_after' => 700, 'description' => 'Protinas gagnées (commande 2026/0700 livrée)', 'idempotency_key' => 'order:700:earn',
            'bucket' => null, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('users')->where('id', 33)->update(['points_balance' => 700]);
        $this->assertTrue($this->wallet(33)->unsplit);

        $this->artisan('protinas:split-wallets', ['--apply' => true])->assertExitCode(0);
        $wallet = $this->wallet(33);
        $this->assertFalse($wallet->unsplit);
        $this->assertSame(300, $wallet->gift);                 // the v3 earned spend is not charged to the gift
        $this->assertSame(400, $wallet->earnedSpendable);
        $this->assertSame(300, (int) DB::table('user_point_transactions')->where('idempotency_key', 'welcome:33:unlock:0')->value('remaining'));
        $this->assertSame(0, DB::table('user_point_transactions')->where('idempotency_key', 'like', 'migration:%')->count());
    }

    public function test_a_legacy_order_paid_with_the_welcome_gift_refunds_gift_not_earned_protinas(): void
    {
        foreach ([31 => 0, 32 => 20] as $id => $balance) {
            DB::table('users')->insert(['id' => $id, 'name' => 'Ancien '.$id, 'email' => 'ancien'.$id.'@example.test',
                'phone' => '+216200000'.$id, 'points_balance' => $balance, 'phone_verified_at' => now()->subYear(),
                'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('commandes')->insert(['id' => 450, 'numero' => '2026/0450', 'etat' => 'expidee', 'user_id' => 31,
            'authenticated_user_id' => 31, 'prix_ht' => 200, 'prix_ttc' => 195, 'frais_livraison' => 10, 'remise' => 15,
            'points_discount_ht' => 15, 'points_redeemed' => 300, 'created_at' => now(), 'updated_at' => now()]);
        $row = fn (int $user, string $type, int $points, ?int $commande, ?string $key, string $description)
            => DB::table('user_point_transactions')->insertGetId(['user_id' => $user, 'commande_id' => $commande,
                'type' => $type, 'points' => $points, 'balance_after' => 0, 'description' => $description,
                'idempotency_key' => $key, 'bucket' => null, 'created_at' => now()->subMonth(), 'updated_at' => now()->subMonth()]);
        $row(31, 'earn', 300, null, null, 'Cadeau de bienvenue — 15 DT en points');
        $redeem = $row(31, 'redeem', -300, 450, 'order:450:redeem', 'Protinas utilisées sur commande 2026/0450');
        // An order that spent more than the gift left crosses the limit: it is split, 300 gift + 100 earned.
        DB::table('commandes')->insert(['id' => 452, 'numero' => '2026/0452', 'etat' => 'expidee', 'user_id' => 32,
            'authenticated_user_id' => 32, 'prix_ht' => 400, 'prix_ttc' => 390, 'frais_livraison' => 10, 'remise' => 20,
            'points_discount_ht' => 20, 'points_redeemed' => 400, 'created_at' => now(), 'updated_at' => now()]);
        $row(32, 'earn', 300, null, null, 'Cadeau de bienvenue — 15 DT en points');
        $row(32, 'earn', 120, 501, 'order:501:earn', 'Protinas gagnées');
        $crossing = $row(32, 'redeem', -400, 452, 'order:452:redeem', 'Protinas utilisées');

        $this->artisan('protinas:split-wallets', ['--apply' => true])->assertExitCode(0);
        $this->assertSame('gift', DB::table('user_point_transactions')->where('id', $redeem)->value('bucket'));
        $this->assertSame(0, $this->wallet(31)->gift);
        $crossed = DB::table('user_point_transactions')->where('id', $crossing)->first();
        $this->assertSame('earned', $crossed->bucket);
        $this->assertSame(-100, (int) $crossed->points);
        $giftPart = $this->ledger(452, 'order:452:redeem-gift');
        $this->assertSame(-300, (int) $giftPart->points);
        $this->assertSame('gift', $giftPart->bucket);
        $this->assertSame(20, (int) DB::table('user_point_transactions')->where('user_id', 32)->sum('points')); // ledger sum unchanged
        $this->assertSame(0, $this->wallet(32)->gift);
        $this->assertSame(20, $this->wallet(32)->earnedSpendable);

        $this->setStatus(452, 'annuler', true);                 // cancelled after the deploy: each part back to its wallet
        $this->assertSame(100, (int) $this->ledger(452, 'order:452:redeem-refund')->points);
        $giftBack = $this->ledger(452, 'order:452:redeem-refund-gift');
        $this->assertSame(300, (int) $giftBack->points);
        $this->assertNull($giftBack->expires_at);
        $this->assertSame(300, $this->wallet(32)->gift);
        $this->assertSame(120, $this->wallet(32)->earnedSpendable);

        $this->setStatus(450, 'annuler', true);                 // refused after the deploy, old terms: full refund…
        $refund = $this->ledger(450, 'order:450:redeem-refund-gift');
        $this->assertSame(300, (int) $refund->points);          // …to the gift wallet, never-expiring like its lot
        $this->assertNull($refund->expires_at);
        $this->assertNull($this->ledger(450, 'order:450:redeem-refund'));
        $wallet = $this->wallet(31);
        $this->assertSame(300, $wallet->gift);
        $this->assertSame(0, $wallet->earnedSpendable);
    }

    public function test_rule_17_calls_the_phone_verified_at_checkout_and_a_fresh_one_cannot_unlock_a_zero_cash_order(): void
    {
        $this->product(1, 30);
        // Email-only account: its Protinas stay under the confirmation thresholds.
        $emailOnly = $this->customer(1, 1000, 0, 60, null, null);
        $this->quote($emailOnly, [[1, 1]], ['points_to_redeem' => 1000, 'use_gift' => true])->assertOk()
            ->assertJsonPath('pricing.protinas.used_earned_points', 400)
            ->assertJsonPath('pricing.total_dt', 20.001)
            ->assertJsonPath('pricing.requires_phone_confirmation', false)
            ->assertJsonPath('pricing.protinas.limited_reason', 'phone_not_trusted');
        // A phone verified yesterday (a swapped SIM): same.
        $fresh = $this->customer(2, 1000, 0, 60, null, 1);
        $this->placeOrder($fresh, [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])
            ->assertStatus(409)->assertJsonPath('pricing.total_dt', 20.001);

        // A phone verified long ago: the 0-cash order goes through and stores THAT number for the call.
        $id = $this->placeOrder($this->customer(3, 1000), [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])
            ->assertCreated()->json('id');
        $order = Commande::findOrFail($id);
        $this->assertTrue($order->awaitsPhoneConfirmation());
        $this->assertSame('+21620000003', $order->confirm_phone);
        // The thief verifies their own SIM afterwards: staff still see the number verified at checkout.
        DB::table('users')->where('id', 3)->update(['phone' => '+21698765432', 'phone_verified_at' => now()]);
        $this->assertSame('+21620000003', OrderCashOnDelivery::phoneToCall(Commande::findOrFail($id)));
        $this->assertNull(OrderCashOnDelivery::phoneConfirmationBlockReason(Commande::findOrFail($id)));

        // No verified phone at checkout on an order that spent Protinas: never the delivery phone, no confirmation.
        DB::table('commandes')->where('id', $id)->update(['confirm_phone' => null]);
        $this->assertStringNotContainsString('20123456', OrderCashOnDelivery::phoneToCall(Commande::findOrFail($id)));
        $this->assertNotNull(OrderCashOnDelivery::phoneConfirmationBlockReason(Commande::findOrFail($id)));
    }

    public function test_the_deploy_migration_releases_pending_welcome_claims_without_expiry(): void
    {
        DB::table('users')->insert(['id' => 24, 'name' => 'En attente', 'email' => 'attente@example.test',
            'phone' => '+21620000024', 'phone_verified_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('welcome_bonus_claims')->insert(['user_id' => 24, 'phone_hash' => PhoneVerificationService::fingerprint('+21620000024'),
            'email_hash' => PhoneVerificationService::fingerprint('attente@example.test'), 'points' => 300,
            'credited_at' => null, 'created_at' => now()->subDay()]);

        (require database_path('migrations/2026_10_02_000001_protinas_wallets_v3.php'))->up();

        $row = DB::table('user_point_transactions')->where('idempotency_key', 'welcome:24:unlock:0')->first();
        $this->assertSame('gift', $row->bucket);
        $this->assertNull($row->expires_at);
        $this->assertSame(300, (int) $this->userRow(24)->gift_points_balance);
        $this->assertNotNull(DB::table('welcome_bonus_claims')->where('user_id', 24)->value('credited_at'));
    }

    public function test_an_admin_edit_that_leaves_only_a_machine_earns_nothing(): void
    {
        $this->product(1, 250);
        $this->product(2, 1000, 'cardio-fitness');
        $id = $this->placeOrder($this->customer(1), [[1, 1], [2, 1]], ['expected_total' => 1260])->assertCreated()->json('id');
        $this->assertEqualsWithDelta(250.0, (float) DB::table('commandes')->where('id', $id)->value('earn_base_dt'), 0.0005);
        $this->assertSame(250, app(ProtinaWalletService::class)->inTransit(User::findOrFail(1))[0]['points']);

        // The whey is out of stock: staff remove its line, EditCommande rewrites the totals from what is left.
        DB::table('commande_details')->where('commande_id', $id)->where('produit_id', 1)->delete();
        DB::table('commandes')->where('id', $id)->update(['prix_ht' => 1000, 'frais_livraison' => 10, 'prix_ttc' => 1010]);
        $this->assertSame([], app(ProtinaWalletService::class)->inTransit(User::findOrFail(1)));
        $this->assertSame(0.0, app(PointsService::class)->earnableSpendFor(Commande::findOrFail($id)));

        $this->setStatus($id, 'livree');                        // a machine alone never earns
        $this->assertSame(0, DB::table('user_point_transactions')->where('commande_id', $id)->where('type', 'earn')->count());
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);
    }

    public function test_a_pre_v3_pack_tab_is_refused_when_the_budget_caps_the_pack(): void
    {
        $this->product(1, 500);
        // No expected_total: the old tab showed /pack/quote's uncapped −7 % (−35 DT, 465 DT to pay).
        config(['loyalty.budget.margin_floor_percent' => 13]);  // the budget caps the pack to 28.421
        $this->placeOrder(null, [[1, 1]], ['pack_discount' => true])->assertStatus(409)
            ->assertJsonPath('pricing.pack.capped', true)->assertJsonPath('pricing.total_dt', 471.579);

        // An affiliate visit whose commission leaves no budget at all: the pack goes entirely.
        config(['loyalty.budget.margin_floor_percent' => 15]);
        Schema::table('products', fn (Blueprint $t) => $t->decimal('prix_affilie', 12, 3)->nullable());
        Schema::create('affilies', function (Blueprint $t): void {
            $t->id(); $t->string('name')->nullable(); $t->string('status')->default('active');
            $t->string('subdomain')->nullable(); $t->decimal('commission_rate', 6, 2)->nullable(); $t->timestamps();
        });
        DB::table('affilies')->insert(['name' => 'Ali', 'status' => 'active', 'subdomain' => 'ali', 'commission_rate' => 10,
            'created_at' => now(), 'updated_at' => now()]);
        DB::table('products')->where('id', 1)->update(['prix_affilie' => 450]);
        $this->placeOrder(null, [[1, 1]], ['pack_discount' => true, 'affiliate_subdomain' => 'ali'])->assertStatus(409)
            ->assertJsonPath('pricing.pack.applied', false)->assertJsonPath('pricing.pack.reason', 'not_available')
            ->assertJsonPath('pricing.total_dt', 500);

        $this->assertSame(0, DB::table('commandes')->count());
        $this->assertSame(50, (int) DB::table('products')->where('id', 1)->value('qte'));
    }

    public function test_an_unsplit_wallet_holding_a_split_gift_spends_it_gift_first_instead_of_failing(): void
    {
        $this->product(1, 180);
        $token = $this->customer(40, 0, 300);                   // split by the deploy: 300 gift
        // An old worker, still running during the deploy, credits a delivery without a bucket.
        DB::table('user_point_transactions')->insert(['user_id' => 40, 'commande_id' => 700, 'type' => 'earn', 'points' => 100,
            'balance_after' => 400, 'description' => 'Protinas gagnées (commande 2026/0700 livrée)', 'idempotency_key' => 'order:700:earn',
            'bucket' => null, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('users')->where('id', 40)->update(['points_balance' => 400]);
        $this->assertTrue($this->wallet(40)->unsplit);

        // The gift applies on its own (300 at 180 DT); it used to be debited as earned and record() threw.
        $id = $this->placeOrder($token, [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $gift = $this->ledger($id, 'order:'.$id.':redeem-gift');
        $this->assertSame(-300, (int) $gift->points);
        $this->assertSame('gift', $gift->bucket);
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem'));
        $this->assertSame(100, (int) $this->userRow(40)->points_balance);
        $this->assertSame(0, (int) $this->userRow(40)->gift_points_balance);
        $this->assertSame(0, (int) DB::table('user_point_transactions')->where('idempotency_key', 'welcome:40:unlock:0')->value('remaining'));
    }

    public function test_a_deposit_that_kept_every_protina_is_cleared_when_the_parcel_is_delivered_after_all(): void
    {
        $this->product(1, 100);
        $id = $this->placeOrder($this->customer(1, 300), [[1, 1]], ['points_to_redeem' => 300, 'expected_total' => 95])
            ->assertCreated()->json('id');
        $this->setStatus($id, 'annuler', true);                 // refused after dispatch: all 300 kept, 0 refunded
        $this->assertSame(300, (int) Commande::findOrFail($id)->protinas_forfeited);
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem-refund'));

        $this->setStatus($id, 'livree');                        // delivered after all: nothing to re-debit…
        $order = Commande::findOrFail($id);
        $this->assertSame(0, $order->protinas_forfeited);       // …but the deposit is gone
        $this->assertFalse($order->protinas_forfeit_waived);
        $this->assertSame(0, app(PointsService::class)->waiveForfeit($order));
        $this->assertNull($this->ledger($id, 'order:'.$id.':forfeit-refund'));

        // Even a stale deposit on a delivered order is never given back.
        DB::table('commandes')->where('id', $id)->update(['protinas_forfeited' => 300]);
        $this->assertSame(0, app(PointsService::class)->waiveForfeit(Commande::findOrFail($id)));
        $this->assertSame(95, (int) $this->userRow(1)->points_balance); // only the (held) earnings of the delivery
    }

    public function test_unpublishing_a_review_after_its_gift_expired_takes_back_only_what_did_not_expire(): void
    {
        $points = app(PointsService::class);
        $this->customer(1, 100);
        $this->customer(2, 100);
        $this->assertTrue($points->awardForReview(User::findOrFail(1), 55, 'Whey', 50));
        $this->assertTrue($points->awardForReview(User::findOrFail(2), 56, 'Whey', 50));
        // User 2 spends 20 of the award before it expires.
        $points->record(User::findOrFail(2), 'redeem', -20, 'Autre commande', 9998, null, 'order:9998:redeem-gift', PointsService::BUCKET_GIFT);

        $this->travel(61)->days();
        $this->assertSame(['expired_lots' => 2, 'points' => 80, 'failed' => 0], app(ProtinaWalletService::class)->expireDue());

        // Fully expired: the shop already got the 50 back, nothing is taken again.
        $this->assertFalse($points->reverseForReview(User::findOrFail(1), 55));
        $this->assertSame(100, (int) $this->userRow(1)->points_balance);
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
        $this->assertNull($this->wallet(1)->blockedReason);

        // 20 spent, 30 expired: only the 20 the customer had are owed (from earned: no gift left).
        $this->assertTrue($points->reverseForReview(User::findOrFail(2), 56));
        $this->assertSame(80, (int) $this->userRow(2)->points_balance);
        $this->assertSame(0, (int) $this->userRow(2)->points_debt);
        $this->assertFalse($points->reverseForReview(User::findOrFail(2), 56)); // idempotent
    }

    public function test_a_legacy_spend_written_after_the_split_is_charged_to_the_gift_once(): void
    {
        $this->customer(34, 0, 300, null);                      // split by the deploy: welcome 300, never expires
        // The old code, still serving during the deploy, spends 100 without a bucket and leaves the gift column.
        DB::table('user_point_transactions')->insert(['user_id' => 34, 'commande_id' => 710, 'type' => 'redeem', 'points' => -100,
            'balance_after' => 200, 'description' => 'Protinas utilisées sur commande 2026/0710', 'idempotency_key' => 'order:710:redeem',
            'bucket' => null, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('users')->where('id', 34)->update(['points_balance' => 200]);

        $this->artisan('protinas:split-wallets', ['--apply' => true])->assertExitCode(0);
        $wallet = $this->wallet(34);
        $this->assertSame(200, $wallet->gift);                  // 300 − 100, charged once
        $this->assertSame(0, $wallet->earnedSpendable);         // no gift turned into earned Protinas
        $this->assertSame(200, (int) $this->userRow(34)->gift_points_balance);
        $this->assertSame(200, (int) DB::table('user_point_transactions')->where('idempotency_key', 'welcome:34:unlock:0')->value('remaining'));
        $this->assertSame('gift', DB::table('user_point_transactions')->where('idempotency_key', 'order:710:redeem')->value('bucket'));
    }

    public function test_the_order_page_counts_a_redebit_as_spending_not_as_clawed_back_earnings(): void
    {
        $this->product(1, 200);
        $id = $this->placeOrder($this->customer(1, 100), [[1, 1]], ['points_to_redeem' => 100, 'expected_total' => 205])
            ->assertCreated()->json('id');
        $this->setStatus($id, 'annuler');                       // before dispatch: the 100 come back
        $this->setStatus($id, 'livree');                        // delivered after all: debited again, then earned
        $this->assertSame(-100, (int) $this->ledger($id, 'order:'.$id.':redeem:v1')->points);
        $this->assertSame(200, (int) $this->ledger($id, 'order:'.$id.':earn')->points);

        $controller = app(\App\Http\Controllers\Api\ClientController::class);
        $relation = (new \ReflectionMethod($controller, 'pointTransactionsRelation'))->invoke(null);
        $tracked = (new \ReflectionMethod($controller, 'withCustomerTracking'))
            ->invoke($controller, Commande::query()->with($relation)->findOrFail($id));
        $protina = $tracked->protina;
        $this->assertSame(200, $protina['earned']);             // what delivery credited, not 200 − 100
        $this->assertSame(0, $protina['revoked']);
        $this->assertSame(100, $protina['spent']);              // the order is paid with 100 Protinas
        $this->assertSame(100, $protina['redeemed']);
        $this->assertSame(0, $protina['refunded']);
        $this->assertSame('credited', $protina['state']);
    }

    public function test_a_pre_v3_bundle_gets_summary_rows_that_add_up(): void
    {
        $this->product(1, 180);
        $token = $this->customer(1, 0, 300);
        // A pre-v3 bundle sends no use_gift and prints « Livraison » beside « Protinas utilisées −15 »:
        // the delivery before Protinas, so 180 − 15 + 10 = 175 (net 0 would print « Offerte » over 175).
        $this->quote($token, [[1, 1]])->assertOk()
            ->assertJsonPath('pricing.shipping_dt', 10)->assertJsonPath('pricing.protinas.used_dt', 15)
            ->assertJsonPath('pricing.total_dt', 175);
        // A v3 tab always sends use_gift and gets the net delivery (the gift paid it).
        $this->quote($token, [[1, 1]], ['use_gift' => true])->assertOk()
            ->assertJsonPath('pricing.shipping_dt', 0)->assertJsonPath('pricing.total_dt', 175);
        // The order still stores the net figure (cash-on-delivery identity).
        $id = $this->placeOrder($token, [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->assertEqualsWithDelta(0.0, (float) DB::table('commandes')->where('id', $id)->value('frais_livraison'), 0.0005);
        $this->assertIdentity(DB::table('commandes')->where('id', $id)->first());
    }

    public function test_a_code_whose_minimum_only_the_machines_reach_names_the_machines(): void
    {
        $this->product(1, 1200, 'cardio-fitness');
        $this->product(2, 20);
        DB::table('coupons')->insert(['code' => 'MIN50', 'type' => Coupon::TYPE_PERCENT, 'value' => 5, 'min_order_amount' => 50,
            'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        // Not « Montant minimum de commande : 50.00 TND » on a 1,220 DT basket: the machines are the reason.
        $this->quote($this->customer(1), [[1, 1], [2, 1]], ['coupon_code' => 'MIN50'])->assertOk()
            ->assertJsonPath('pricing.coupon.applied', false)
            ->assertJsonPath('pricing.coupon.reason', 'excluded_goods');
        // A basket that misses the minimum on its own keeps the server's own message.
        $this->quote($this->customer(2), [[2, 1]], ['coupon_code' => 'MIN50'])->assertOk()
            ->assertJsonPath('pricing.coupon.reason', fn ($reason) => is_string($reason) && $reason !== 'excluded_goods');
    }

    public function test_a_parcel_shipped_by_hand_and_refused_keeps_the_deposit_and_counts_as_a_refusal(): void
    {
        $this->product(1, 30);
        $token = $this->customer(1, 2000);
        // Aramex refused the 0 DT note, so there is no HAWB: staff ship it by hand, the customer refuses it.
        $a = $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');
        $this->setStatus($a, 'expidee');
        $this->assertNotNull(Commande::findOrFail($a)->shipped_at);
        $this->setStatus($a, 'annuler');
        $this->assertSame(400, (int) Commande::findOrFail($a)->protinas_forfeited);
        $this->assertSame(400, (int) $this->ledger($a, 'order:'.$a.':redeem-refund')->points);
        $this->assertSame(1600, (int) $this->userRow(1)->points_balance);
        $this->assertNull($this->userRow(1)->gift_frozen_until);

        // The observer's path: the status the order leaves proves the trip even without the stamp.
        $b = $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');
        DB::table('commandes')->where('id', $b)->update(['etat' => 'annuler']);
        app(PointsService::class)->syncOnStatusChange(Commande::findOrFail($b), 'en_cours_de_livraison');
        $this->assertSame(400, (int) Commande::findOrFail($b)->protinas_forfeited);
        $this->assertNotNull(Commande::findOrFail($b)->shipped_at);
        $this->assertNotNull($this->userRow(1)->gift_frozen_until); // two refusals after dispatch (rule 18)
    }

    public function test_an_aramex_shipment_cancelled_before_pickup_is_not_a_dispatch_and_a_waived_refusal_is_no_strike(): void
    {
        Schema::table('factures', fn (Blueprint $t) => $t->string('aramex_status')->nullable());
        $this->product(1, 30);
        $token = $this->customer(1, 2000);
        $order = fn () => $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');

        // BL created (and pushed: HAWB), then the shipment cancelled at Aramex before pickup.
        $a = $order();
        DB::table('factures')->insert(['commande_id' => $a, 'aramex_hawb' => 'HAWB'.$a, 'aramex_status' => 'annulé',
            'created_at' => now(), 'updated_at' => now()]);
        $this->setStatus($a, 'annuler');
        $this->assertSame(0, (int) Commande::findOrFail($a)->protinas_forfeited);   // no trip: everything comes back
        $this->assertSame(800, (int) $this->ledger($a, 'order:'.$a.':redeem-refund')->points);
        $this->assertSame(2000, (int) $this->userRow(1)->points_balance);

        // A refusal whose deposit staff gave back is not held against the customer.
        $b = $order();
        $this->setStatus($b, 'annuler', true);
        $this->assertSame(400, app(PointsService::class)->waiveForfeit(Commande::findOrFail($b)));
        $c = $order();
        $this->setStatus($c, 'annuler', true);
        $this->assertSame(400, (int) Commande::findOrFail($c)->protinas_forfeited);
        $this->assertNull($this->userRow(1)->gift_frozen_until);
        $this->assertSame(1600, (int) $this->userRow(1)->points_balance);
    }

    public function test_a_quick_order_whose_code_is_dropped_at_order_time_is_refused_not_charged_in_full(): void
    {
        $this->product(1, 50);
        DB::table('coupons')->insert(['code' => 'SOBI5', 'type' => Coupon::TYPE_PERCENT, 'value' => 5, 'is_active' => true,
            'usage_limit_per_client' => 1, 'created_at' => now(), 'updated_at' => now()]);
        // This phone already used its one SOBI5 (the drawer applied the code before the phone was typed).
        $this->placeOrder(null, [[1, 3]], ['coupon_code' => 'SOBI5', 'use_gift' => false, 'expected_total' => 152.5])
            ->assertCreated();
        $this->assertSame(1, DB::table('commandes')->count());

        // The drawer's payload: qty 3, the code, use_gift false, and no expected_total (an old bundle).
        // validateCoupon() drops the code here; nothing else diverges, so without the guard the courier
        // would collect 160.000 where the screen said 152.500.
        $this->placeOrder(null, [[1, 3]], ['coupon_code' => 'SOBI5', 'use_gift' => false])
            ->assertStatus(409)
            ->assertJsonPath('pricing.total_dt', 160)
            ->assertJsonPath('pricing.coupon.applied', false)
            ->assertJsonPath('pricing.coupon.code', 'SOBI5')
            ->assertJsonPath('pricing.coupon.reason', 'Vous avez déjà utilisé ce code le nombre maximum de fois.');
        $this->assertSame(1, DB::table('commandes')->count());
        $this->assertSame(47, (int) DB::table('products')->where('id', 1)->value('qte'));

        // The current drawer sends the total it shows: the same 409, with the reason the code went.
        $this->placeOrder(null, [[1, 3]], ['coupon_code' => 'SOBI5', 'use_gift' => false, 'expected_total' => 152.5])
            ->assertStatus(409)
            ->assertJsonPath('pricing.total_dt', 160)
            ->assertJsonPath('pricing.coupon.reason', 'Vous avez déjà utilisé ce code le nombre maximum de fois.');
        $this->assertSame(1, DB::table('commandes')->count());

        // Once the customer confirmed the new total, the order goes through without the code.
        $this->placeOrder(null, [[1, 3]], ['use_gift' => false, 'expected_total' => 160])->assertCreated();
    }

    public function test_reinstating_an_order_whose_refunded_gift_expired_takes_nothing_a_second_time(): void
    {
        $this->product(1, 180);
        $id = $this->placeOrder($this->customer(1, 500, 300, 3), [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->travel(1)->days();
        $this->setStatus($id, 'annuler');                       // before dispatch: the 300 gift comes back (+7 days)
        $this->assertSame(300, (int) $this->ledger($id, 'order:'.$id.':redeem-refund-gift')->points);

        $this->travel(8)->days();                               // …and expires unused: the shop has it back
        $this->assertSame(['expired_lots' => 1, 'points' => 300, 'failed' => 0], app(ProtinaWalletService::class)->expireDue());
        $this->assertSame(500, (int) $this->userRow(1)->points_balance);

        // Staff put the order back in progress: nothing is debited again, earned Protinas are untouched.
        $order = Commande::findOrFail($id);
        DB::table('commandes')->where('id', $id)->update(['etat' => 'en_attente']);
        $order->etat = 'en_attente';
        app(PointsService::class)->syncOnStatusChange($order);
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem-gift:v1'));
        $this->assertSame(500, (int) $this->userRow(1)->points_balance);
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
        $this->assertSame(500, $this->wallet(1)->earnedSpendable);

        // Cancelled again: the expired part is not refunded a second time…
        $this->setStatus($id, 'annuler');
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem-refund-gift:v1'));
        $this->assertSame(0, (int) $this->userRow(1)->gift_points_balance);

        // …and delivered after all: still nothing taken from the earned wallet, no debt.
        $this->setStatus($id, 'livree');
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem-gift:v1'));
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
        $this->assertSame(500, $this->wallet(1)->earnedSpendable);
    }

    public function test_reinstating_an_order_whose_refunded_gift_partly_expired_takes_back_only_what_was_spent(): void
    {
        $this->product(1, 180);
        $id = $this->placeOrder($this->customer(1, 500, 300, 3), [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->travel(1)->days();
        $this->setStatus($id, 'annuler');
        // 100 of the refunded gift paid another order, the other 200 expire.
        app(PointsService::class)->record(User::findOrFail(1), 'redeem', -100, 'Autre commande', 9999, null,
            'order:9999:redeem-gift', PointsService::BUCKET_GIFT);
        $this->travel(8)->days();
        $this->assertSame(['expired_lots' => 1, 'points' => 200, 'failed' => 0], app(ProtinaWalletService::class)->expireDue());

        $this->setStatus($id, 'livree');
        // The gift wallet is empty: the 100 are paid with earned Protinas and filed EARNED (a later cancel
        // gives them back as earned, never as a fresh gift lot).
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem-gift:v1'));
        $redebit = $this->ledger($id, 'order:'.$id.':redeem-gift-earned');
        $this->assertSame(-100, (int) $redebit->points);
        $this->assertSame('earned', $redebit->bucket);
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
        // 500 − the 100 spent elsewhere; the 200 that expired are not taken again.
        $this->assertSame(400, $this->wallet(1)->earnedSpendable);
    }

    public function test_a_gift_redebit_paid_with_debt_is_refunded_as_earned_and_repays_the_debt(): void
    {
        $this->product(1, 180);
        $this->product(2, 180);
        $token = $this->customer(1, 0, 300);
        $a = $this->placeOrder($token, [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->setStatus($a, 'annuler');                        // before dispatch: the 300 gift comes back
        $this->placeOrder($token, [[2, 1]], ['expected_total' => 175])->assertCreated(); // …and pays order B
        $this->assertSame(0, (int) $this->userRow(1)->gift_points_balance);

        // A is put back in progress: its 300 are owed again; no gift left, so they become debt, filed EARNED.
        $order = Commande::findOrFail($a);
        DB::table('commandes')->where('id', $a)->update(['etat' => 'en_attente']);
        $order->etat = 'en_attente';
        app(PointsService::class)->syncOnStatusChange($order);
        $this->assertNull($this->ledger($a, 'order:'.$a.':redeem-gift:v1'));
        $redebit = $this->ledger($a, 'order:'.$a.':redeem-gift-earned');
        $this->assertSame(-300, (int) $redebit->points);
        $this->assertSame('earned', $redebit->bucket);
        $this->assertSame(300, (int) $this->userRow(1)->points_debt);

        // Cancelled again before dispatch: given back as EARNED, which repays the debt — no gift lot next to a debt.
        $this->setStatus($a, 'annuler');
        $this->assertSame(300, (int) $this->ledger($a, 'order:'.$a.':redeem-refund')->points);
        $this->assertNull($this->ledger($a, 'order:'.$a.':redeem-refund-gift:v1'));
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
        $this->assertSame(0, (int) $this->userRow(1)->gift_points_balance);
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);
        $this->assertNull($this->wallet(1)->blockedReason);

        // Back in progress once more: owed again, once (not twice).
        $order = Commande::findOrFail($a);
        DB::table('commandes')->where('id', $a)->update(['etat' => 'en_attente']);
        $order->etat = 'en_attente';
        app(PointsService::class)->syncOnStatusChange($order);
        $this->assertSame(300, (int) $this->userRow(1)->points_debt);
        $this->setStatus($a, 'livree');                         // delivered: nothing more to re-debit…
        $this->assertNull($this->ledger($a, 'order:'.$a.':redeem-gift-earned:v2'));
        $this->assertNull($this->ledger($a, 'order:'.$a.':redeem-gift:v1'));
        $this->assertSame(125, (int) $this->userRow(1)->points_debt); // …and its 175 earned Protinas repay the debt first
    }

    public function test_an_order_paid_with_a_grandfathered_and_a_dated_gift_gets_each_back_with_its_own_validity(): void
    {
        $this->product(1, 300);
        $token = $this->customer(1, 0, 300);                    // new welcome gift, valid 60 days
        $lotExpiry = DB::table('user_point_transactions')->where('idempotency_key', 'welcome:1:unlock:0')->value('expires_at');
        // A grandfathered review lot of 10 that never expires.
        DB::table('user_point_transactions')->insert(['user_id' => 1, 'type' => 'earn', 'points' => 10, 'balance_after' => 310,
            'description' => 'Protinas d’avis', 'bucket' => 'gift', 'remaining' => 10, 'expires_at' => null,
            'idempotency_key' => 'review:77', 'created_at' => now()->subMonth(), 'updated_at' => now()->subMonth()]);
        DB::table('users')->where('id', 1)->update(['points_balance' => 310, 'gift_points_balance' => 310]);

        $id = $this->placeOrder($token, [[1, 1]], ['expected_total' => 284.5])->assertCreated()->json('id');
        $debit = $this->ledger($id, 'order:'.$id.':redeem-gift');
        $this->assertSame(-310, (int) $debit->points);
        $this->assertSame(10, (int) $debit->gift_never);
        $this->assertSame(Carbon::parse($lotExpiry)->toDateTimeString(), Carbon::parse($debit->expires_at)->toDateTimeString());

        $this->setStatus($id, 'annuler');                       // before dispatch: each part with its own validity
        $dated = $this->ledger($id, 'order:'.$id.':redeem-refund-gift');
        $this->assertSame(300, (int) $dated->points);
        $this->assertSame(Carbon::parse($lotExpiry)->toDateTimeString(), Carbon::parse($dated->expires_at)->toDateTimeString());
        $never = $this->ledger($id, 'order:'.$id.':redeem-refund-gift:v1');
        $this->assertSame(10, (int) $never->points);
        $this->assertNull($never->expires_at);
        $this->assertSame(310, (int) $this->userRow(1)->gift_points_balance);

        // The welcome part still expires: only the 10 grandfathered Protinas outlive it.
        $this->travel(61)->days();
        app(ProtinaWalletService::class)->expireDue();
        $this->assertSame(10, (int) $this->userRow(1)->gift_points_balance);
    }

    public function test_unpublishing_a_review_the_day_its_gift_expired_takes_no_valid_lot(): void
    {
        $points = app(PointsService::class);
        $this->customer(1, 0, 300, 120);                        // welcome lot valid 120 days
        $this->assertTrue($points->awardForReview(User::findOrFail(1), 57, 'Whey', 50)); // valid 60 days
        $this->travel(61)->days();                              // the award expired; protinas:expire has not run yet

        $this->assertFalse($points->reverseForReview(User::findOrFail(1), 57)); // already gone: nothing owed
        $this->assertSame(300, (int) $this->userRow(1)->gift_points_balance);
        $this->assertSame(['expired_lots' => 0, 'points' => 0, 'failed' => 0], app(ProtinaWalletService::class)->expireDue());
        $this->assertSame(300, (int) $this->userRow(1)->gift_points_balance, 'the award is taken back once, the welcome gift is untouched');
        $this->assertSame(300, (int) DB::table('user_point_transactions')->where('idempotency_key', 'welcome:1:unlock:0')->value('remaining'));
    }

    public function test_reinstating_an_order_the_day_its_refunded_gift_expired_takes_no_valid_lot(): void
    {
        $this->product(1, 180);
        $id = $this->placeOrder($this->customer(1, 0, 300, 3), [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->travel(1)->days();
        $this->setStatus($id, 'annuler');                       // the 300 come back, valid until day 8
        app(ProtinaWalletService::class)->creditGift(User::findOrFail(1), 300, 'Cadeau', 'gift:test:1', now()->addDays(60));
        $this->travel(8)->days();                               // the refund lot expired; protinas:expire has not run yet

        $order = Commande::findOrFail($id);
        DB::table('commandes')->where('id', $id)->update(['etat' => 'en_attente']);
        $order->etat = 'en_attente';
        app(PointsService::class)->syncOnStatusChange($order);
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem-gift:v1'));
        $this->assertNull($this->ledger($id, 'order:'.$id.':redeem-gift-earned'));
        $this->assertSame(['expired_lots' => 0, 'points' => 0, 'failed' => 0], app(ProtinaWalletService::class)->expireDue());
        $this->assertSame(300, (int) $this->userRow(1)->gift_points_balance, 'the other gift lot is untouched');
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
    }

    public function test_a_fully_refunded_legacy_order_stays_earned_in_the_split(): void
    {
        DB::table('users')->insert(['id' => 41, 'name' => 'Ancien 41', 'email' => 'ancien41@example.test', 'phone' => '+21620000041',
            'points_balance' => 1000, 'phone_verified_at' => now()->subYear(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('commandes')->insert(['id' => 602, 'numero' => '2026/0602', 'etat' => 'annuler', 'user_id' => 41,
            'authenticated_user_id' => 41, 'prix_ht' => 100, 'prix_ttc' => 85, 'frais_livraison' => 10, 'remise' => 25,
            'points_discount_ht' => 25, 'points_redeemed' => 500, 'created_at' => now(), 'updated_at' => now()]);
        $row = fn (string $type, int $points, ?int $commande, string $key)
            => DB::table('user_point_transactions')->insertGetId(['user_id' => 41, 'commande_id' => $commande, 'type' => $type,
                'points' => $points, 'balance_after' => 0, 'description' => 'Protinas', 'idempotency_key' => $key,
                'bucket' => null, 'created_at' => now()->subMonth(), 'updated_at' => now()->subMonth()]);
        $row('earn', 1000, 601, 'order:601:earn');
        $redeem = $row('redeem', -500, 602, 'order:602:redeem');
        $refund = $row('adjustment', 500, 602, 'order:602:redeem-refund');

        $this->artisan('protinas:split-wallets', ['--apply' => true])->assertExitCode(0);
        $this->assertSame('earned', DB::table('user_point_transactions')->where('id', $redeem)->value('bucket'));
        $this->assertSame('earned', DB::table('user_point_transactions')->where('id', $refund)->value('bucket'));
        $this->assertSame(1000, $this->wallet(41)->earnedSpendable);

        // A new gift, then the old order is put back in progress: the 500 come from earned Protinas only.
        app(ProtinaWalletService::class)->creditGift(User::findOrFail(41), 300, 'Cadeau de bienvenue', 'welcome:41:unlock:0', now()->addDays(60));
        $order = Commande::findOrFail(602);
        DB::table('commandes')->where('id', 602)->update(['etat' => 'en_attente']);
        $order->etat = 'en_attente';
        app(PointsService::class)->syncOnStatusChange($order);
        $this->assertSame(-500, (int) $this->ledger(602, 'order:602:redeem:v1')->points);
        $this->assertSame(300, (int) $this->userRow(41)->gift_points_balance);
        $this->assertSame(500, $this->wallet(41)->earnedSpendable);
    }

    public function test_two_returned_orders_never_ask_to_deduct_more_than_the_debt(): void
    {
        $this->product(1, 200);
        $this->product(2, 300);
        $this->product(3, 400);
        $token = $this->customer(1, 0, 0);
        $place = function (array $panier, array $extra = []) use ($token): int {
            $total = $this->quote($token, $panier, $extra)->assertOk()->json('pricing.total_dt');

            return (int) $this->placeOrder($token, $panier, $extra + ['expected_total' => $total])->assertCreated()->json('id');
        };
        $a = $place([[1, 1]]);
        $b = $place([[2, 1]]);
        $this->setStatus($a, 'livree');
        $this->setStatus($b, 'livree');
        $this->travel(15)->days();
        $earned = (int) $this->userRow(1)->points_balance;
        $this->assertGreaterThan(300, $earned);
        // Spend all but A's share, so B's later reversal is partly paid from the balance.
        $place([[3, 1]], ['points_to_redeem' => $earned - 200]);
        $this->setStatus($b, 'retour');
        $this->setStatus($a, 'retour');
        $debt = (int) $this->userRow(1)->points_debt;
        $this->assertGreaterThan(0, $debt);

        $points = app(PointsService::class);
        $deductA = $points->refundDeductionPoints($a, $debt);
        $deductB = $points->refundDeductionPoints($b, $debt);
        // Each panel used to claim min(debt, its own whole reversal): A 200 + B 300 for a 300 debt.
        $this->assertSame($debt, $deductA + $deductB);
        $this->assertSame(200, $deductA);
    }

    public function test_a_refund_deduction_settles_the_debt_once(): void
    {
        $this->product(1, 180);
        $this->product(2, 100);
        $token = $this->customer(1, 0, 300);
        $a = $this->placeOrder($token, [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $this->setStatus($a, 'livree');
        $this->travel(15)->days();
        $this->placeOrder($token, [[2, 1]], ['points_to_redeem' => 175, 'expected_total' => 101.25])->assertCreated();
        $this->setStatus($a, 'retour');
        $this->assertSame(175, (int) $this->userRow(1)->points_debt);

        $points = app(PointsService::class);
        $this->assertSame(175, $points->refundDeductionPoints($a, 175));
        // Staff kept 8.750 DT out of the cash refund: the debt is settled, never charged a second time.
        $this->assertSame(175, $points->settleRefundDeduction(Commande::findOrFail($a)));
        $this->assertSame(0, (int) $this->userRow(1)->points_debt);
        $this->assertSame(0, (int) $this->userRow(1)->points_balance);
        $this->assertNull($this->wallet(1)->blockedReason);
        $this->assertSame(0, $points->settleRefundDeduction(Commande::findOrFail($a)));
        // A debt from elsewhere is not this order's to deduct again.
        $this->assertSame(0, $points->refundDeductionPoints($a, 50));
        $settled = DB::table('user_point_transactions')->where('idempotency_key', 'order:'.$a.':debt-settled')->first();
        $this->assertSame(175, (int) $settled->points);
        $this->assertNull($settled->commande_id);
    }

    public function test_a_freeze_is_lifted_when_the_refusal_behind_it_is_waived_or_delivered_after_all(): void
    {
        $this->product(1, 30);
        $token = $this->customer(1, 4000);
        $order = fn () => $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');

        $a = $order();
        $this->setStatus($a, 'annuler', true);
        $b = $order();
        $this->setStatus($b, 'annuler', true);
        $this->assertNotNull($this->userRow(1)->gift_frozen_until);
        $this->assertNotNull($this->userRow(1)->cod_confirm_until);

        // Staff forgive the second refusal (Aramex's fault): one strike left, the freeze goes.
        $this->assertSame(400, app(PointsService::class)->waiveForfeit(Commande::findOrFail($b)));
        $this->assertNull($this->userRow(1)->gift_frozen_until);
        $this->assertNull($this->userRow(1)->cod_confirm_until);
        $this->assertNull($this->wallet(1)->blockedReason);
        $this->assertFalse($this->wallet(1)->requiresCodConfirmation());

        // A new refusal makes two again…
        $c = $order();
        $this->setStatus($c, 'annuler', true);
        $this->assertNotNull($this->userRow(1)->gift_frozen_until);

        // …until that « refusal » turns out to be delivered.
        $this->setStatus($c, 'livree');
        $this->assertNull($this->userRow(1)->gift_frozen_until);
        $this->assertNull($this->userRow(1)->cod_confirm_until);
        $this->assertNull(Commande::findOrFail($c)->refused_at);
    }

    public function test_an_admin_save_of_an_old_refused_order_is_no_fresh_strike(): void
    {
        $this->product(1, 30);
        $token = $this->customer(1, 4000);
        $a = $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');
        $this->setStatus($a, 'annuler', true);
        $refusedAt = Commande::findOrFail($a)->refused_at;
        $this->assertNotNull($refusedAt);

        // 100 days later staff archive / edit the old refused order: updated_at moves, refused_at does not.
        $this->travel(100)->days();
        DB::table('commandes')->where('id', $a)->update(['note' => 'adresse corrigée', 'updated_at' => now()]);
        $this->assertSame($refusedAt->toDateTimeString(), Commande::findOrFail($a)->refused_at->toDateTimeString());

        $b = $this->placeOrder($token, [[1, 1]], ['points_to_redeem' => 800, 'expected_total' => 0])->assertCreated()->json('id');
        $this->setStatus($b, 'annuler', true);
        $this->assertNull($this->userRow(1)->gift_frozen_until); // one refusal inside the 90 days, not two
    }

    public function test_the_confirmation_email_shows_the_gift_and_the_delivery_like_the_checkout(): void
    {
        $this->product(1, 180);
        $this->product(2, 90);
        // 180 DT + the welcome gift: the engine pays the delivery first (frais_livraison 0 net,
        // points_shipping_dt 10, remise 5), yet the customer was shown Livraison 10 + gift -15.
        $gift = $this->placeOrder($this->customer(1, 0, 300), [[1, 1]], ['expected_total' => 175])->assertCreated()->json('id');
        $html = (new OrderConfirmedCustomerMail(Commande::findOrFail($gift)))->render();
        $this->assertStringContainsString('Cadeau de bienvenue (300 Protinas)', $html);
        $this->assertStringContainsString('-15.00 DT', $html);
        $this->assertStringContainsString('10.00 DT', $html);
        $this->assertStringContainsString('175.00 DT', $html);
        $this->assertStringNotContainsString('Gratuite', $html);
        $this->assertStringNotContainsString('Remise', $html);

        // 90 DT + 900 earned: the delivery is crossed out and paid with 200, the other 700 pay the goods.
        $earned = $this->placeOrder($this->customer(2, 900), [[2, 1]], ['points_to_redeem' => 900, 'expected_total' => 55])
            ->assertCreated()->json('id');
        $html = (new OrderConfirmedCustomerMail(Commande::findOrFail($earned)))->render();
        $this->assertStringContainsString('Réglée avec 200 Protinas', $html);
        $this->assertStringContainsString('Vos Protinas (700)', $html);
        $this->assertStringContainsString('-35.00 DT', $html);
        $this->assertStringNotContainsString('Gratuite', $html);
    }

    public function test_the_wallet_payload_says_when_protinas_are_capped_by_an_untrusted_phone(): void
    {
        $this->customer(1, 1000, 0, 60, null, null);           // e-mail only: no verified phone
        $this->customer(2, 1000, 0, 60, null, 3);              // phone verified 3 days ago
        $this->customer(3, 1000);                              // phone verified 30 days ago
        $wallets = app(ProtinaWalletService::class);

        $one = $wallets->customerPayload(User::findOrFail(1));
        $this->assertFalse($one['phone_trusted']);
        $this->assertNull($one['phone_trusted_from']);
        $two = $wallets->customerPayload(User::findOrFail(2));
        $this->assertFalse($two['phone_trusted']);
        $this->assertEqualsWithDelta(now()->addDays(11)->getTimestamp(), Carbon::parse($two['phone_trusted_from'])->getTimestamp(), 5);
        $this->assertTrue($wallets->customerPayload(User::findOrFail(3))['phone_trusted']);
    }
}
