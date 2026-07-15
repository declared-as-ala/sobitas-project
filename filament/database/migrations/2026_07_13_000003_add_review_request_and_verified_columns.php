<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Supports the post-delivery review-request engine:
 *  - commandes.review_request_sent_at : once-only guard so a delivered order
 *    triggers exactly one review-request email.
 *  - reviews.commande_id + reviews.verified : link a review to the order it came
 *    from (enables "Achat vérifié" and dedupe of one review per order+product).
 *
 * Idempotent (guarded by Schema::hasColumn) — safe to run repeatedly.
 */
return new class extends Migration
{
    public function up(): void
    {
        // NO ->after(): the legacy `commandes` table lacks the original after-target
        // (`sms_sent`), and a missing after-target makes ADD COLUMN throw — which aborts
        // `migrate --force` and silently blocks EVERY later migration. Column position is
        // cosmetic. Each add is independently guarded so one failure can never block the chain.
        $this->safeAdd('commandes', 'review_request_sent_at', fn (Blueprint $t) => $t->timestamp('review_request_sent_at')->nullable());
        $this->safeAdd('reviews', 'commande_id', fn (Blueprint $t) => $t->unsignedBigInteger('commande_id')->nullable()->index());
        $this->safeAdd('reviews', 'verified', fn (Blueprint $t) => $t->boolean('verified')->default(false));
    }

    private function safeAdd(string $table, string $column, \Closure $add): void
    {
        try {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, $column)) {
                Schema::table($table, $add);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("migration add {$table}.{$column} failed (continuing)", ['error' => $e->getMessage()]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('commandes') && Schema::hasColumn('commandes', 'review_request_sent_at')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->dropColumn('review_request_sent_at');
            });
        }
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                foreach (['commande_id', 'verified'] as $col) {
                    if (Schema::hasColumn('reviews', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
