<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The only real protection against paying an affiliate twice.
 *
 * ── WHY A MARKER COLUMN IS NOT ENOUGH ───────────────────────────────────────────────────────
 * `commandes.affilie_commission_processed_at` is checked under `lockForUpdate`, and inside one
 * database that is sound. It stops being sound the moment there are two PHP processes and one of
 * them is a queue worker retrying a job: the marker is a value this application reads and then
 * decides to trust. A UNIQUE INDEX is a promise the database keeps whether or not the application
 * is correct, and commission is money leaving the building.
 *
 * `user_point_transactions.idempotency_key` (migration 2026_09_05_120000) exists for exactly this
 * reason and this column is its mirror, deliberately down to the length and the nullability:
 *
 *   NULLABLE   every ledger row written before today has no key, and back-filling one would mean
 *              inventing keys for history. MySQL treats NULLs as distinct in a unique index, so
 *              any number of legacy rows coexist with the constraint.
 *   UNIQUE     two workers racing the same delivery: one INSERTs, the other gets a duplicate-key
 *              error and rolls back its transaction having moved no balance. That is the whole
 *              design — the loser of the race must fail loudly inside a transaction, not quietly
 *              succeed outside one.
 *   100 chars  keys are of the shape `commande:12345:commission`; 100 leaves room and stays well
 *              inside MySQL's index-length limits on utf8mb4.
 *
 * Guarded throughout, like every migration in this module: the production database is restored
 * from a backup that predates the rename, so this file must be safe to run before or after
 * 2026_09_09_120000 and safe to run twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('affilie_transactions')
            || Schema::hasColumn('affilie_transactions', 'idempotency_key')) {
            return;
        }

        Schema::table('affilie_transactions', function (Blueprint $table): void {
            $table->string('idempotency_key', 100)->nullable()->unique();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('affilie_transactions')
            || ! Schema::hasColumn('affilie_transactions', 'idempotency_key')) {
            return;
        }

        Schema::table('affilie_transactions', function (Blueprint $table): void {
            try {
                $table->dropUnique(['idempotency_key']);
            } catch (\Throwable) {
                // Index absent (partially applied migration) — dropping the column is enough.
            }
            $table->dropColumn('idempotency_key');
        });
    }
};
