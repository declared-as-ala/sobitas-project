<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PhoneVerificationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;

/**
 * In-memory SQLite shaped like production BEFORE Protinas v3, then the real v3 migration on top.
 * Shared by ProtinasV3PricingTest and ProtinasV3LifecycleTest (not a test class itself).
 */
trait ProtinasV3Schema
{
    /** The launch configuration of the spec (m = 15 %, K = 10 DT, S = 3 DT), pinned against any .env. */
    protected function pinProtinasV3Config(): void
    {
        config([
            'database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'cache.default' => 'array', 'queue.default' => 'sync', 'mail.admin_emails' => [],
            'services.whatsapp.autosend' => false,
            'loyalty.rules_version' => 3,
            'loyalty.budget.margin_floor_percent' => 15,
            'loyalty.budget.courier_cost_dt' => 10,
            'loyalty.budget.safety_dt' => 3,
            'loyalty.checkout.max_total_discount_percent' => 10,
            'loyalty.checkout.delivery_fee_dt' => 10,
            'loyalty.checkout.free_delivery_from_dt' => 300,
            'loyalty.checkout.total_mismatch_tolerance_dt' => 0.01,
            'loyalty.checkout.quote_throttle_per_minute' => 60,
            'loyalty.pack.tiers' => [['from_dt' => 200, 'percent' => 3], ['from_dt' => 350, 'percent' => 5], ['from_dt' => 500, 'percent' => 7]],
            'loyalty.pack.exclude_promo_lines' => false,
            'loyalty.points.points_per_dt' => 20, 'loyalty.points.earn_per_dt' => 1,
            'loyalty.points.earned_max_percent' => 100, 'loyalty.points.cover_shipping' => true,
            'loyalty.points.min_cash_dt' => 0, 'loyalty.points.earn_hold_days' => 14,
            'loyalty.gift.valid_days' => 60, 'loyalty.gift.refund_grace_days' => 7,
            'loyalty.gift.auto_apply' => true, 'loyalty.gift.sms_reminders' => false,
            'loyalty.refusal.forfeit_points' => 400, 'loyalty.refusal.freeze_after' => 2,
            'loyalty.refusal.window_days' => 90, 'loyalty.refusal.freeze_days' => 90,
            'loyalty.cod.confirm_below_cash_dt' => 20, 'loyalty.cod.confirm_points_share_percent' => 50,
            'loyalty.cod.trusted_phone_days' => 14,
            'loyalty.program.excluded_subcategory_slugs' => ['materiel-de-musculation', 'cardio-fitness'],
            'loyalty.coupons.margin_guard' => true,
            'welcome_bonus.points' => 300, 'welcome_bonus.unlock_on_first_delivery' => false,
            'welcome_bonus.unique_delivery_phone' => false, 'welcome_bonus.enabled' => true,
            'welcome_bonus.include_existing_customers' => true,
        ]);
    }

    protected function buildProtinasV3Database(): void
    {
        $this->pinProtinasV3Config();
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        // NumberSequence::getNextFor() speaks MySQL (INSERT IGNORE … NOW()). Translate exactly those
        // two tokens so the real order-numbering code runs inside the real order transaction.
        $pdo = new class('sqlite::memory:', null, null, [
            \PDO::ATTR_CASE => \PDO::CASE_NATURAL,
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_ORACLE_NULLS => \PDO::NULL_NATURAL,
            \PDO::ATTR_STRINGIFY_FETCHES => false,
        ]) extends \PDO {
            public function prepare(string $query, array $options = []): \PDOStatement|false
            {
                return parent::prepare(str_replace(
                    ['INSERT IGNORE INTO', 'NOW()'], ['INSERT OR IGNORE INTO', 'CURRENT_TIMESTAMP'], $query
                ), $options);
            }
        };
        DB::connection('sqlite')->setPdo($pdo)->setReadPdo($pdo);
        Bus::fake();
        Mail::fake();
        Notification::fake();
        RateLimiter::clear('coupon-apply:127.0.0.1');
        $this->withoutMiddleware(ThrottleRequests::class);

        Schema::create('users', function (Blueprint $t): void {
            $t->id(); $t->string('name'); $t->string('email')->unique(); $t->string('phone')->nullable();
            $t->string('password')->nullable(); $t->unsignedInteger('role_id')->default(2);
            $t->unsignedInteger('points_balance')->default(0);
            $t->timestamp('email_verified_at')->nullable(); $t->timestamp('phone_verified_at')->nullable();
            $t->boolean('welcome_bonus_eligible')->default(true); $t->timestamp('welcome_bonus_awarded_at')->nullable();
            $t->rememberToken(); $t->timestamps();
        });
        Schema::create('personal_access_tokens', function (Blueprint $t): void {
            $t->id(); $t->morphs('tokenable'); $t->string('name'); $t->string('token', 64)->unique();
            $t->text('abilities')->nullable(); $t->timestamp('last_used_at')->nullable();
            $t->timestamp('expires_at')->nullable(); $t->timestamps();
        });
        Schema::create('clients', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id')->nullable(); $t->string('name')->nullable();
            $t->string('email')->nullable(); $t->string('phone_1')->nullable(); $t->string('phone_2')->nullable();
            $t->string('adresse')->nullable(); $t->string('region')->nullable(); $t->string('ville')->nullable();
            $t->string('code_postale')->nullable(); $t->string('source')->nullable(); $t->boolean('sms')->default(false);
            $t->timestamps();
        });
        Schema::create('sous_categories', function (Blueprint $t): void {
            $t->id(); $t->string('designation_fr')->nullable(); $t->string('slug'); $t->timestamps();
        });
        Schema::create('products', function (Blueprint $t): void {
            $t->id(); $t->string('designation_fr')->nullable(); $t->decimal('prix', 12, 3);
            $t->decimal('promo', 12, 3)->nullable(); $t->date('promo_expiration_date')->nullable();
            $t->unsignedBigInteger('sous_categorie_id')->nullable();
            $t->integer('qte')->default(0); $t->boolean('rupture')->default(false); $t->timestamps();
        });
        Schema::create('commandes', function (Blueprint $t): void {
            $t->id();
            foreach (['numero', 'order_token', 'nom', 'prenom', 'email', 'phone', 'pays', 'region', 'ville', 'code_postale',
                'adresse1', 'adresse2', 'note', 'etat', 'livraison_nom', 'livraison_prenom', 'livraison_email',
                'livraison_phone', 'livraison_region', 'livraison_ville', 'livraison_code_postale', 'livraison_adresse1',
                'livraison_adresse2', 'checkout_idempotency_key', 'checkout_payload_hash', 'coupon_code_snapshot',
                'coupon_type_snapshot'] as $column) {
                $t->string($column)->nullable();
            }
            $t->unsignedTinyInteger('livraison')->nullable();
            foreach (['prix_ht', 'prix_ttc', 'frais_livraison', 'remise', 'discount_ht', 'discount_ttc', 'discount_amount',
                'pack_discount_ht', 'points_discount_ht', 'coupon_value_snapshot'] as $column) {
                $t->decimal($column, 12, 3)->nullable();
            }
            $t->unsignedInteger('points_redeemed')->default(0);
            foreach (['user_id', 'client_id', 'authenticated_user_id', 'coupon_id', 'affilie_id'] as $column) {
                $t->unsignedBigInteger($column)->nullable();
            }
            $t->timestamp('delivered_at')->nullable();
            $t->timestamps();
        });
        Schema::create('commande_details', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('commande_id'); $t->unsignedBigInteger('produit_id');
            $t->integer('qte'); $t->string('arome')->nullable();
            foreach (['prix_unitaire', 'prix_ht', 'prix_ttc'] as $column) $t->decimal($column, 12, 3);
        });
        Schema::create('factures', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('commande_id')->nullable(); $t->string('aramex_hawb')->nullable(); $t->timestamps();
        });
        Schema::create('number_sequences', function (Blueprint $t): void {
            $t->id(); $t->string('name'); $t->integer('year'); $t->unsignedInteger('last_number')->default(0);
            $t->timestamps(); $t->unique(['name', 'year']);
        });
        Schema::create('coupons', function (Blueprint $t): void {
            $t->id(); $t->string('code'); $t->string('type'); $t->decimal('value', 12, 3)->default(0);
            $t->timestamp('starts_at')->nullable(); $t->timestamp('ends_at')->nullable();
            $t->boolean('is_active')->default(true); $t->boolean('is_affilie_code')->default(false);
            $t->string('applies_channel')->nullable(); $t->unsignedBigInteger('affilie_id')->nullable();
            $t->decimal('min_order_amount', 12, 3)->nullable(); $t->decimal('max_discount_amount', 12, 3)->nullable();
            $t->unsignedInteger('usage_limit_total')->nullable(); $t->unsignedInteger('usage_limit_per_client')->nullable();
            $t->timestamps();
        });
        Schema::create('coupon_redemptions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('coupon_id'); $t->unsignedBigInteger('order_id')->nullable();
            $t->unsignedBigInteger('ticket_id')->nullable(); $t->unsignedBigInteger('client_id')->nullable();
            $t->string('phone_snapshot')->nullable(); $t->string('email_snapshot')->nullable();
            $t->decimal('discount_amount_ht', 12, 3)->nullable(); $t->decimal('discount_amount_ttc', 12, 3)->nullable();
            $t->timestamps();
        });
        Schema::create('coordinates', function (Blueprint $t): void {
            $t->id(); $t->decimal('tva', 5, 2)->nullable(); $t->timestamps();
        });
        Schema::create('messages', function (Blueprint $t): void {
            $t->id(); $t->text('msg_passez_commande')->nullable(); $t->text('msg_etat_commande')->nullable(); $t->timestamps();
        });
        Schema::create('user_point_transactions', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('user_id'); $t->unsignedBigInteger('commande_id')->nullable();
            $t->unsignedBigInteger('review_id')->nullable();
            $t->string('type'); $t->integer('points'); $t->integer('balance_after');
            $t->string('description')->nullable(); $t->string('idempotency_key')->nullable()->unique();
            $t->timestamps();
        });
        (require database_path('migrations/2026_09_03_160000_add_phone_verification_welcome_bonus.php'))->up();
        (require database_path('migrations/2026_09_29_000200_add_welcome_unlock_fields.php'))->up();

        (require database_path('migrations/2026_10_02_000001_protinas_wallets_v3.php'))->up();
    }

    protected function product(int $id, float $price, ?string $subcategorySlug = null, int $stock = 50, ?float $promo = null): void
    {
        $subcategoryId = null;
        if ($subcategorySlug !== null) {
            $subcategoryId = DB::table('sous_categories')->where('slug', $subcategorySlug)->value('id')
                ?? DB::table('sous_categories')->insertGetId(['slug' => $subcategorySlug, 'designation_fr' => $subcategorySlug,
                    'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('products')->insert(['id' => $id, 'designation_fr' => 'Produit '.$id, 'prix' => $price, 'promo' => $promo,
            'sous_categorie_id' => $subcategoryId, 'qte' => $stock, 'created_at' => now(), 'updated_at' => now()]);
    }

    /**
     * A phone-verified account already on the v3 ledger: $earned earned Protinas (spendable) and a
     * $gift gift lot expiring in $giftDays days (null = never), credited as its welcome gift.
     * Its phone was verified $phoneVerifiedDaysAgo days ago (30 by default: an account holding earned
     * Protinas is necessarily older than the rule-17 trust delay). Returns its bearer token.
     */
    protected function customer(int $id, int $earned = 0, int $gift = 0, ?int $giftDays = 60, ?string $phone = null,
        ?int $phoneVerifiedDaysAgo = 30): string
    {
        $phone ??= '+2162'.str_pad((string) $id, 7, '0', STR_PAD_LEFT); // unique per account (claims dedupe phones)
        DB::table('users')->insert(['id' => $id, 'name' => 'Client '.$id, 'email' => 'client'.$id.'@example.test',
            'phone' => $phone, 'points_balance' => $earned + $gift, 'gift_points_balance' => $gift,
            'phone_verified_at' => $phoneVerifiedDaysAgo === null ? null : now()->subDays($phoneVerifiedDaysAgo),
            'email_verified_at' => $phoneVerifiedDaysAgo === null ? now() : null,
            'created_at' => now(), 'updated_at' => now()]);
        if ($earned > 0) {
            DB::table('user_point_transactions')->insert(['user_id' => $id, 'type' => 'earn', 'points' => $earned,
                'balance_after' => $earned, 'description' => 'Protinas gagnées', 'bucket' => 'earned',
                'idempotency_key' => 'seed:'.$id.':earned', 'created_at' => now()->subMonth(), 'updated_at' => now()->subMonth()]);
        }
        if ($gift > 0) {
            DB::table('user_point_transactions')->insert(['user_id' => $id, 'type' => 'earn', 'points' => $gift,
                'balance_after' => $earned + $gift, 'description' => 'Cadeau de bienvenue — 15 DT en Protinas',
                'bucket' => 'gift', 'remaining' => $gift, 'expires_at' => $giftDays === null ? null : now()->addDays($giftDays),
                'idempotency_key' => 'welcome:'.$id.':unlock:0', 'created_at' => now(), 'updated_at' => now()]);
            DB::table('welcome_bonus_claims')->insert(['user_id' => $id,
                'phone_hash' => PhoneVerificationService::fingerprint($phone),
                'email_hash' => PhoneVerificationService::fingerprint('client'.$id.'@example.test'),
                'points' => $gift, 'credited_at' => now(), 'created_at' => now()]);
        }

        return User::findOrFail($id)->createToken('test')->plainTextToken;
    }

    /** @param list<array{0: int, 1: int}> $panier [productId, quantity] */
    protected function orderBody(array $panier, array $extra = [], array $commande = []): array
    {
        return array_merge([
            'commande' => array_merge([
                'livraison_nom' => 'Client Test', 'livraison_phone' => '20123456',
                'livraison_region' => 'Tunis', 'livraison_ville' => 'Tunis', 'livraison_adresse1' => '12 rue Test',
                'livraison' => 1,
            ], $commande),
            'panier' => array_map(fn (array $line) => ['produit_id' => $line[0], 'quantite' => $line[1]], $panier),
        ], $extra);
    }

    protected function wallet(int $userId): \App\Support\ProtinaWallet
    {
        return app(\App\Services\ProtinaWalletService::class)->forUser(User::findOrFail($userId));
    }

    protected function userRow(int $userId): object
    {
        return DB::table('users')->where('id', $userId)->first();
    }
}
