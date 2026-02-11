<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PERFORMANCE FIX: Add indexes for search operations
 * 
 * These indexes are critical for:
 * - API search endpoints (LIKE queries)
 * - Filament table search functionality
 * - Fast lookups by slug
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Products: Search by designation_fr ─────────────────
        // Used in: ApisController::searchProduct() with LIKE "%term%"
        // Note: Full-text index would be better, but regular index helps with prefix searches
        if (Schema::hasTable('products') && !Schema::hasIndex('products', 'idx_products_designation_search')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index('designation_fr', 'idx_products_designation_search');
            });
        }

        // ── Commandes: Search by name fields ───────────────────
        // Used in: CommandeResource table search on nom/prenom
        if (Schema::hasTable('commandes')) {
            if (!Schema::hasIndex('commandes', 'idx_commandes_nom')) {
                Schema::table('commandes', function (Blueprint $table) {
                    $table->index('nom', 'idx_commandes_nom');
                });
            }
            if (!Schema::hasIndex('commandes', 'idx_commandes_prenom')) {
                Schema::table('commandes', function (Blueprint $table) {
                    $table->index('prenom', 'idx_commandes_prenom');
                });
            }
        }

        // ── Categories: Search by designation_fr ───────────────
        // Used in: CategResource table search
        if (Schema::hasTable('categories') && !Schema::hasIndex('categories', 'idx_categories_designation')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->index('designation_fr', 'idx_categories_designation');
            });
        }

        // ── Sous Categories: Search by designation_fr ──────────
        if (Schema::hasTable('sous_categories') && !Schema::hasIndex('sous_categories', 'idx_sous_cat_designation')) {
            Schema::table('sous_categories', function (Blueprint $table) {
                $table->index('designation_fr', 'idx_sous_cat_designation');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasIndex('products', 'idx_products_designation_search')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropIndex('idx_products_designation_search');
            });
        }

        if (Schema::hasTable('commandes')) {
            if (Schema::hasIndex('commandes', 'idx_commandes_nom')) {
                Schema::table('commandes', function (Blueprint $table) {
                    $table->dropIndex('idx_commandes_nom');
                });
            }
            if (Schema::hasIndex('commandes', 'idx_commandes_prenom')) {
                Schema::table('commandes', function (Blueprint $table) {
                    $table->dropIndex('idx_commandes_prenom');
                });
            }
        }

        if (Schema::hasTable('categories') && Schema::hasIndex('categories', 'idx_categories_designation')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->dropIndex('idx_categories_designation');
            });
        }

        if (Schema::hasTable('sous_categories') && Schema::hasIndex('sous_categories', 'idx_sous_cat_designation')) {
            Schema::table('sous_categories', function (Blueprint $table) {
                $table->dropIndex('idx_sous_cat_designation');
            });
        }
    }
};
