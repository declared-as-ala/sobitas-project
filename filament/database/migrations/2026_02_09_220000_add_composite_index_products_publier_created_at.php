<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PERFORMANCE FIX: Add composite index for /api/all_products main query
 * 
 * The query: SELECT * FROM products WHERE publier = 1 ORDER BY created_at DESC
 * 
 * This composite index allows MySQL to:
 * 1. Filter by publier = 1 using the index
 * 2. Sort by created_at using the same index
 * 3. Avoid filesort operation
 * 
 * Expected improvement: 20-50% faster query execution
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                // Check if index doesn't already exist
                $indexes = Schema::getConnection()
                    ->getDoctrineSchemaManager()
                    ->listTableIndexes('products');
                
                if (!isset($indexes['idx_products_publier_created_at'])) {
                    $table->index(['publier', 'created_at'], 'idx_products_publier_created_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropIndex('idx_products_publier_created_at');
            });
        }
    }
};
