<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PERFORMANCE FIX: All key business tables had ZERO indexes (besides PRIMARY).
 *
 * Impact:
 * - Every WHERE, JOIN, ORDER BY, GROUP BY was doing full table scans
 * - Dashboard widget queries scanning entire tables for aggregations
 * - API list queries without index-assisted filtering
 * - Filament table searches doing unindexed LIKE queries
 *
 * This migration adds targeted indexes for:
 * - Foreign keys (used in JOINs and eager loading)
 * - Filter columns (WHERE clauses in API + Filament)
 * - Sort columns (ORDER BY in tables)
 * - Search columns (LIKE queries)
 * - Composite indexes for common query patterns
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Products ─────────────────────────────────────
        // Used in: API product lists, Filament ProductResource, dashboard widgets
        Schema::table('products', function (Blueprint $table) {
            $table->index('sous_categorie_id', 'idx_products_sous_categorie');
            $table->index('brand_id', 'idx_products_brand');
            $table->index('slug', 'idx_products_slug');
            $table->index('publier', 'idx_products_publier');
            $table->index('created_at', 'idx_products_created_at');
            // Composite: common API filter pattern (published + new/best/pack)
            $table->index(['publier', 'new_product'], 'idx_products_pub_new');
            $table->index(['publier', 'best_seller'], 'idx_products_pub_best');
            $table->index(['publier', 'pack'], 'idx_products_pub_pack');
        });

        // ── Commandes ────────────────────────────────────
        // Used in: API order history, Filament CommandeResource, dashboard stats
        Schema::table('commandes', function (Blueprint $table) {
            $table->index('etat', 'idx_commandes_etat');
            $table->index('user_id', 'idx_commandes_user');
            $table->index('created_at', 'idx_commandes_created_at');
            $table->index('phone', 'idx_commandes_phone');
            // Composite: dashboard badge query (etat + count)
            $table->index(['etat', 'created_at'], 'idx_commandes_etat_date');
        });

        // ── Commande Details ─────────────────────────────
        // Used in: order detail lookups, email generation
        Schema::table('commande_details', function (Blueprint $table) {
            $table->index('commande_id', 'idx_cmd_details_commande');
            $table->index('produit_id', 'idx_cmd_details_produit');
        });

        // ── Factures (Bons de Livraison) ─────────────────
        // Used in: Filament FactureResource, dashboard revenue charts
        Schema::table('factures', function (Blueprint $table) {
            $table->index('client_id', 'idx_factures_client');
            $table->index('created_at', 'idx_factures_created_at');
        });

        // ── Facture TVA ──────────────────────────────────
        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->index('client_id', 'idx_facture_tvas_client');
            $table->index('created_at', 'idx_facture_tvas_created_at');
        });

        // ── Tickets ──────────────────────────────────────
        Schema::table('tickets', function (Blueprint $table) {
            $table->index('client_id', 'idx_tickets_client');
            $table->index('created_at', 'idx_tickets_created_at');
        });

        // ── Details Factures ─────────────────────────────
        // Used in: dashboard top products widget (JOIN + GROUP BY)
        Schema::table('details_factures', function (Blueprint $table) {
            $table->index('facture_id', 'idx_det_factures_facture');
            $table->index('produit_id', 'idx_det_factures_produit');
        });

        // ── Details Facture TVA ──────────────────────────
        Schema::table('details_facture_tvas', function (Blueprint $table) {
            $table->index('facture_tva_id', 'idx_det_ftvas_facture_tva');
            $table->index('produit_id', 'idx_det_ftvas_produit');
        });

        // ── Details Tickets ──────────────────────────────
        Schema::table('details_tickets', function (Blueprint $table) {
            $table->index('ticket_id', 'idx_det_tickets_ticket');
            $table->index('produit_id', 'idx_det_tickets_produit');
        });

        // ── Clients ──────────────────────────────────────
        // Used in: Filament ClientResource search, API historique
        Schema::table('clients', function (Blueprint $table) {
            $table->index('phone_1', 'idx_clients_phone1');
            $table->index('phone_2', 'idx_clients_phone2');
            $table->index('name', 'idx_clients_name');
            $table->index('created_at', 'idx_clients_created_at');
        });

        // ── Reviews ──────────────────────────────────────
        // Used in: Filament ReviewResource, API product details
        Schema::table('reviews', function (Blueprint $table) {
            $table->index('product_id', 'idx_reviews_product');
            $table->index('user_id', 'idx_reviews_user');
            $table->index('publier', 'idx_reviews_publier');
            $table->index('created_at', 'idx_reviews_created_at');
        });

        // ── Sous-Catégories ──────────────────────────────
        // Used in: API category filters, Filament SousCategoryResource
        Schema::table('sous_categories', function (Blueprint $table) {
            $table->index('categorie_id', 'idx_sous_cat_categorie');
            $table->index('slug', 'idx_sous_cat_slug');
        });

        // ── Articles ─────────────────────────────────────
        // Used in: API blog endpoints, Filament ArticleResource
        Schema::table('articles', function (Blueprint $table) {
            $table->index('slug', 'idx_articles_slug');
            $table->index('publier', 'idx_articles_publier');
            $table->index('created_at', 'idx_articles_created_at');
        });

        // ── Newsletters ──────────────────────────────────
        Schema::table('newsletters', function (Blueprint $table) {
            $table->index('email', 'idx_newsletters_email');
        });

        // ── Quotations ───────────────────────────────────
        if (Schema::hasTable('quotations')) {
            Schema::table('quotations', function (Blueprint $table) {
                if (Schema::hasColumn('quotations', 'client_id')) {
                    $table->index('client_id', 'idx_quotations_client');
                }
                if (Schema::hasColumn('quotations', 'created_at')) {
                    $table->index('created_at', 'idx_quotations_created_at');
                }
            });
        }
    }

    public function down(): void
    {
        // Products
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_sous_categorie');
            $table->dropIndex('idx_products_brand');
            $table->dropIndex('idx_products_slug');
            $table->dropIndex('idx_products_publier');
            $table->dropIndex('idx_products_created_at');
            $table->dropIndex('idx_products_pub_new');
            $table->dropIndex('idx_products_pub_best');
            $table->dropIndex('idx_products_pub_pack');
        });

        Schema::table('commandes', function (Blueprint $table) {
            $table->dropIndex('idx_commandes_etat');
            $table->dropIndex('idx_commandes_user');
            $table->dropIndex('idx_commandes_created_at');
            $table->dropIndex('idx_commandes_phone');
            $table->dropIndex('idx_commandes_etat_date');
        });

        Schema::table('commande_details', function (Blueprint $table) {
            $table->dropIndex('idx_cmd_details_commande');
            $table->dropIndex('idx_cmd_details_produit');
        });

        Schema::table('factures', function (Blueprint $table) {
            $table->dropIndex('idx_factures_client');
            $table->dropIndex('idx_factures_created_at');
        });

        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->dropIndex('idx_facture_tvas_client');
            $table->dropIndex('idx_facture_tvas_created_at');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('idx_tickets_client');
            $table->dropIndex('idx_tickets_created_at');
        });

        Schema::table('details_factures', function (Blueprint $table) {
            $table->dropIndex('idx_det_factures_facture');
            $table->dropIndex('idx_det_factures_produit');
        });

        Schema::table('details_facture_tvas', function (Blueprint $table) {
            $table->dropIndex('idx_det_ftvas_facture_tva');
            $table->dropIndex('idx_det_ftvas_produit');
        });

        Schema::table('details_tickets', function (Blueprint $table) {
            $table->dropIndex('idx_det_tickets_ticket');
            $table->dropIndex('idx_det_tickets_produit');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('idx_clients_phone1');
            $table->dropIndex('idx_clients_phone2');
            $table->dropIndex('idx_clients_name');
            $table->dropIndex('idx_clients_created_at');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex('idx_reviews_product');
            $table->dropIndex('idx_reviews_user');
            $table->dropIndex('idx_reviews_publier');
            $table->dropIndex('idx_reviews_created_at');
        });

        Schema::table('sous_categories', function (Blueprint $table) {
            $table->dropIndex('idx_sous_cat_categorie');
            $table->dropIndex('idx_sous_cat_slug');
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->dropIndex('idx_articles_slug');
            $table->dropIndex('idx_articles_publier');
            $table->dropIndex('idx_articles_created_at');
        });

        Schema::table('newsletters', function (Blueprint $table) {
            $table->dropIndex('idx_newsletters_email');
        });

        if (Schema::hasTable('quotations')) {
            Schema::table('quotations', function (Blueprint $table) {
                if (Schema::hasIndex('quotations', 'idx_quotations_client')) {
                    $table->dropIndex('idx_quotations_client');
                }
                if (Schema::hasIndex('quotations', 'idx_quotations_created_at')) {
                    $table->dropIndex('idx_quotations_created_at');
                }
            });
        }
    }
};
