<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Manual "hard" out-of-stock override. When true, the product is unavailable
 * regardless of quantity, and the Product model's saving hook will NOT reset it
 * back to in-stock — so it survives bulk re-saves (imports, enrichment commands).
 * Default false → existing quantity-driven behaviour is unchanged.
 *
 * Idempotent (guarded by Schema::hasColumn).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products') && ! Schema::hasColumn('products', 'force_out_of_stock')) {
            Schema::table('products', function (Blueprint $table) {
                $table->boolean('force_out_of_stock')->default(false);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'force_out_of_stock')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('force_out_of_stock');
            });
        }
    }
};
