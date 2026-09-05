<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_point_transactions')
            || Schema::hasColumn('user_point_transactions', 'idempotency_key')) {
            return;
        }

        Schema::table('user_point_transactions', function (Blueprint $table): void {
            // Nullable keeps the legacy ledger valid. Every new monetary event that can be
            // replayed receives a deterministic key; UNIQUE is the final concurrency barrier.
            $table->string('idempotency_key', 100)->nullable()->unique()->after('review_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_point_transactions')
            || ! Schema::hasColumn('user_point_transactions', 'idempotency_key')) {
            return;
        }

        Schema::table('user_point_transactions', function (Blueprint $table): void {
            $table->dropUnique(['idempotency_key']);
            $table->dropColumn('idempotency_key');
        });
    }
};
