<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Performance: Filament product select search.
 * - designation_fr: already indexed (idx_products_designation_search).
 * - code_product: add index for WHERE code_product LIKE 'term%' (prefix search).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        if (Schema::hasColumn('products', 'code_product') && ! Schema::hasIndex('products', 'idx_products_code_product')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index('code_product', 'idx_products_code_product');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasIndex('products', 'idx_products_code_product')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropIndex('idx_products_code_product');
            });
        }
    }
};
