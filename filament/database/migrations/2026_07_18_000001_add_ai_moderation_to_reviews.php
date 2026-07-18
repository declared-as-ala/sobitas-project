<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the AI moderation verdict for each review so the admin can see WHY a
 * review was published, held, or flagged — and so re-runs are idempotent:
 *  - reviews.ai_moderation : JSON verdict (decision, flags, sentiment, reason…)
 *  - reviews.ai_checked_at : when the moderator last ran (null = never checked)
 *
 * Idempotent + independently guarded (mirrors the review-request migration): a
 * single ADD COLUMN failure can never abort `migrate --force` and block the chain.
 */
return new class extends Migration
{
    public function up(): void
    {
        // NO ->after(): column position is cosmetic and a missing after-target throws.
        $this->safeAdd('reviews', 'ai_moderation', fn (Blueprint $t) => $t->json('ai_moderation')->nullable());
        $this->safeAdd('reviews', 'ai_checked_at', fn (Blueprint $t) => $t->timestamp('ai_checked_at')->nullable());
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
        if (! Schema::hasTable('reviews')) {
            return;
        }
        Schema::table('reviews', function (Blueprint $table) {
            foreach (['ai_moderation', 'ai_checked_at'] as $col) {
                if (Schema::hasColumn('reviews', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
