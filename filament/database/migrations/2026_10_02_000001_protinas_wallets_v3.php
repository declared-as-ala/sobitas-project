<?php

use App\Models\User;
use App\Services\PointsService;
use App\Services\ProtinaWalletService;
use App\Services\WelcomeBonusService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Protinas v3: two wallets (earned / gift), the hidden order budget, the refusal deposit.
 *
 * ⚠️ THIS MIGRATION MUST NEVER THROW. It runs inside the deploy's `migrate --force`; an exception
 * fails the whole backend release. Every step is guarded (Schema::hasColumn) and wrapped on its own;
 * a failure is Log::critical'd and the code degrades safely without it:
 *   - a missing column is checked everywhere it is written;
 *   - a wallet that was not split counts ENTIRELY as gift (budget-bounded), never as free money
 *     (ProtinaWalletService::forUser). Re-run: vps-run protinas-split-wallets(-dry).
 *
 * Steps:
 *   1. columns on users, user_point_transactions, commandes, coupons, products, welcome_bonus_claims;
 *   2. the wallet split (ProtinaWalletService::splitWallets, same as `protinas:split-wallets --apply`):
 *      every legacy ledger row gets its bucket, legacy gifts keep NO expiry;
 *   3. every pending welcome claim (credited_at NULL) is released as gift with no expiry
 *      (grandfathered), key welcome:{uid}:unlock:0 — only when unlock-on-delivery is off.
 *
 * `bucket` is added NULLABLE on purpose: NULL marks "written before v3, not classified yet", which
 * is exactly what the split looks for and what the wallet treats as gift until it is classified.
 */
return new class extends Migration
{
    private function step(string $name, callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            Log::critical('protinas v3 migration step failed: '.$name, ['error' => $e->getMessage()]);
        }
    }

    private function hasIndex(string $table, array $columns): bool
    {
        try {
            return collect(Schema::getIndexes($table))->contains(fn ($index) => $index['columns'] === $columns);
        } catch (\Throwable) {
            return false;
        }
    }

    private function addColumn(string $table, string $column, callable $definition): void
    {
        $this->step($table.'.'.$column, function () use ($table, $column, $definition): void {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, $column)) {
                Schema::table($table, fn (Blueprint $t) => $definition($t));
            }
        });
    }

    public function up(): void
    {
        // ── 1. Columns ───────────────────────────────────────────────────────────────────────
        $this->addColumn('users', 'gift_points_balance', fn (Blueprint $t) => $t->unsignedInteger('gift_points_balance')->default(0));
        $this->addColumn('users', 'points_debt', fn (Blueprint $t) => $t->unsignedInteger('points_debt')->default(0));
        $this->addColumn('users', 'gift_frozen_until', fn (Blueprint $t) => $t->timestamp('gift_frozen_until')->nullable());
        $this->addColumn('users', 'cod_confirm_until', fn (Blueprint $t) => $t->timestamp('cod_confirm_until')->nullable());

        $this->addColumn('user_point_transactions', 'bucket', fn (Blueprint $t) => $t->string('bucket', 8)->nullable());
        $this->addColumn('user_point_transactions', 'expires_at', fn (Blueprint $t) => $t->timestamp('expires_at')->nullable());
        $this->addColumn('user_point_transactions', 'remaining', fn (Blueprint $t) => $t->integer('remaining')->nullable());
        $this->addColumn('user_point_transactions', 'available_at', fn (Blueprint $t) => $t->timestamp('available_at')->nullable());
        $this->step('user_point_transactions indexes', function (): void {
            if (! Schema::hasTable('user_point_transactions')) {
                return;
            }
            if (Schema::hasColumn('user_point_transactions', 'bucket') && Schema::hasColumn('user_point_transactions', 'expires_at')
                && ! $this->hasIndex('user_point_transactions', ['user_id', 'bucket', 'expires_at'])) {
                Schema::table('user_point_transactions', fn (Blueprint $t) => $t->index(['user_id', 'bucket', 'expires_at'], 'upt_user_bucket_expires_idx'));
            }
            if (Schema::hasColumn('user_point_transactions', 'available_at')
                && ! $this->hasIndex('user_point_transactions', ['user_id', 'available_at'])) {
                Schema::table('user_point_transactions', fn (Blueprint $t) => $t->index(['user_id', 'available_at'], 'upt_user_available_idx'));
            }
        });

        $this->addColumn('commandes', 'pricing_version', fn (Blueprint $t) => $t->unsignedTinyInteger('pricing_version')->nullable());
        $this->addColumn('commandes', 'points_redeemed_gift', fn (Blueprint $t) => $t->unsignedInteger('points_redeemed_gift')->default(0));
        $this->addColumn('commandes', 'points_shipping_dt', fn (Blueprint $t) => $t->decimal('points_shipping_dt', 10, 3)->default(0));
        $this->addColumn('commandes', 'earn_base_dt', fn (Blueprint $t) => $t->decimal('earn_base_dt', 10, 3)->nullable());
        $this->addColumn('commandes', 'budget_dt', fn (Blueprint $t) => $t->decimal('budget_dt', 10, 3)->nullable());
        $this->addColumn('commandes', 'requires_phone_confirmation', fn (Blueprint $t) => $t->boolean('requires_phone_confirmation')->default(false));
        $this->addColumn('commandes', 'phone_confirmed_at', fn (Blueprint $t) => $t->timestamp('phone_confirmed_at')->nullable());
        $this->addColumn('commandes', 'phone_confirmed_by', fn (Blueprint $t) => $t->unsignedBigInteger('phone_confirmed_by')->nullable());
        $this->addColumn('commandes', 'protinas_forfeited', fn (Blueprint $t) => $t->unsignedInteger('protinas_forfeited')->default(0));
        $this->addColumn('commandes', 'protinas_forfeit_waived', fn (Blueprint $t) => $t->boolean('protinas_forfeit_waived')->default(false));
        // Rules 15/18: when etat first entered a shipping status — a parcel shipped by hand has no HAWB.
        $this->addColumn('commandes', 'shipped_at', fn (Blueprint $t) => $t->timestamp('shipped_at')->nullable());
        // Rule 18: when the refusal happened (written only by the refusal, cleared when the order is delivered
        // or put back in progress) — never updated_at, which any admin save or archive moves forward.
        $this->addColumn('commandes', 'refused_at', fn (Blueprint $t) => $t->timestamp('refused_at')->nullable());
        // Rule 17: the account's verified phone AT CHECKOUT — the number staff call, never one verified later.
        $this->addColumn('commandes', 'confirm_phone', fn (Blueprint $t) => $t->string('confirm_phone', 32)->nullable());
        $this->addColumn('commandes', 'confirm_phone_verified_at', fn (Blueprint $t) => $t->timestamp('confirm_phone_verified_at')->nullable());

        // Every existing code is guarded (false) — the owner ticks « perte acceptée » deliberately.
        $this->addColumn('coupons', 'allow_over_budget', fn (Blueprint $t) => $t->boolean('allow_over_budget')->default(false));
        // NULL = cost unknown, the margin floor applies. Private: Product::$hidden.
        $this->addColumn('products', 'prix_achat', fn (Blueprint $t) => $t->decimal('prix_achat', 10, 3)->nullable());

        $this->addColumn('welcome_bonus_claims', 'used_phone_hash', fn (Blueprint $t) => $t->char('used_phone_hash', 64)->nullable());
        $this->addColumn('welcome_bonus_claims', 'used_by_commande_id', fn (Blueprint $t) => $t->unsignedBigInteger('used_by_commande_id')->nullable());
        $this->step('welcome_bonus_claims index', function (): void {
            if (Schema::hasTable('welcome_bonus_claims') && Schema::hasColumn('welcome_bonus_claims', 'used_phone_hash')
                && ! $this->hasIndex('welcome_bonus_claims', ['used_phone_hash'])) {
                Schema::table('welcome_bonus_claims', fn (Blueprint $t) => $t->index('used_phone_hash'));
            }
        });

        // ── 2. Wallet split (idempotent) ───────────────────────────────────────────────────────
        $this->step('split wallets', function (): void {
            if (! Schema::hasTable('user_point_transactions') || ! Schema::hasTable('users')) {
                return;
            }
            $report = app(ProtinaWalletService::class)->splitWallets(true);
            unset($report['details']);
            if ($report['status'] !== 'ok') {
                Log::critical('protinas v3: wallet split incomplete — run vps-run protinas-split-wallets', $report);
            } else {
                Log::info('protinas v3: wallet split', $report);
            }
        });

        // ── 3. Release pending welcome claims (grandfathered: no expiry) ───────────────────────
        $this->step('release pending welcome claims', function (): void {
            if (! Schema::hasTable('welcome_bonus_claims') || ! Schema::hasColumn('welcome_bonus_claims', 'credited_at')) {
                return;
            }
            if ((bool) config('welcome_bonus.unlock_on_first_delivery', false)) {
                Log::warning('protinas v3: WELCOME_BONUS_UNLOCK_ON_DELIVERY is on, pending welcome claims stay pending');

                return;
            }
            $released = 0;
            $failed = 0;
            foreach (DB::table('welcome_bonus_claims')->whereNull('credited_at')->orderBy('user_id')->pluck('user_id') as $userId) {
                $user = User::find($userId);
                if (! $user) {
                    continue;
                }
                try {
                    $released += app(WelcomeBonusService::class)->creditPending($user, true) ? 1 : 0;
                } catch (\Throwable $e) {
                    $failed++;
                    Log::error('protinas v3: pending welcome claim not released', ['user_id' => $userId, 'error' => $e->getMessage()]);
                }
            }
            $context = ['released' => $released, 'failed' => $failed];
            $failed > 0
                ? Log::critical('protinas v3: some pending welcome claims were not released — run vps-run welcome-release-pending', $context)
                : Log::info('protinas v3: pending welcome claims released', $context);
        });
    }

    public function down(): void
    {
        // Additive and value-preserving; rollback is LOYALTY_RULES_VERSION=2, the columns stay.
    }
};
