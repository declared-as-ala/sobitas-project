<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotency marker for stock restoration. When an order is cancelled (etat -> 'annuler') or
 * deleted, its stock is given back exactly once; stock_restored_at records that it happened so a
 * re-save while cancelled, or a cancel-then-delete, can never restore the same order twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('commandes') && ! Schema::hasColumn('commandes', 'stock_restored_at')) {
            Schema::table('commandes', function (Blueprint $table): void {
                $table->timestamp('stock_restored_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('commandes') && Schema::hasColumn('commandes', 'stock_restored_at')) {
            Schema::table('commandes', function (Blueprint $table): void {
                $table->dropColumn('stock_restored_at');
            });
        }
    }
};
