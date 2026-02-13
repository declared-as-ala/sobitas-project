<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add performance indexes for frequently queried columns
     */
    public function up(): void
    {
        // Factures table
        Schema::table('factures', function (Blueprint $table) {
            $table->index('client_id', 'idx_factures_client_id');
            $table->index('created_at', 'idx_factures_created_at');
            $table->index('numero', 'idx_factures_numero');
        });

        // Facture TVAs table
        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->index('client_id', 'idx_facture_tvas_client_id');
            $table->index('created_at', 'idx_facture_tvas_created_at');
            $table->index('numero', 'idx_facture_tvas_numero');
        });

        // Tickets table
        Schema::table('tickets', function (Blueprint $table) {
            $table->index('client_id', 'idx_tickets_client_id');
            $table->index('created_at', 'idx_tickets_created_at');
            $table->index('numero', 'idx_tickets_numero');
        });

        // Commandes table
        Schema::table('commandes', function (Blueprint $table) {
            $table->index('created_at', 'idx_commandes_created_at');
            $table->index('etat', 'idx_commandes_etat');
            $table->index('numero', 'idx_commandes_numero');
            $table->index(['etat', 'created_at'], 'idx_commandes_etat_created_at');
        });

        // Quotations table
        Schema::table('quotations', function (Blueprint $table) {
            $table->index('client_id', 'idx_quotations_client_id');
            $table->index('created_at', 'idx_quotations_created_at');
            $table->index('numero', 'idx_quotations_numero');
        });

        // Details tables (for joins and aggregations)
        Schema::table('details_factures', function (Blueprint $table) {
            $table->index('facture_id', 'idx_details_factures_facture_id');
            $table->index('produit_id', 'idx_details_factures_produit_id');
            $table->index(['facture_id', 'produit_id'], 'idx_details_factures_composite');
        });

        Schema::table('details_facture_tvas', function (Blueprint $table) {
            $table->index('facture_tva_id', 'idx_details_facture_tvas_facture_tva_id');
            $table->index('produit_id', 'idx_details_facture_tvas_produit_id');
            $table->index(['facture_tva_id', 'produit_id'], 'idx_details_facture_tvas_composite');
        });

        Schema::table('details_tickets', function (Blueprint $table) {
            $table->index('ticket_id', 'idx_details_tickets_ticket_id');
            $table->index('produit_id', 'idx_details_tickets_produit_id');
            $table->index(['ticket_id', 'produit_id'], 'idx_details_tickets_composite');
        });

        Schema::table('commande_details', function (Blueprint $table) {
            $table->index('commande_id', 'idx_commande_details_commande_id');
            $table->index('produit_id', 'idx_commande_details_produit_id');
            $table->index(['commande_id', 'produit_id'], 'idx_commande_details_composite');
        });

        Schema::table('details_quotations', function (Blueprint $table) {
            $table->index('quotation_id', 'idx_details_quotations_quotation_id');
            $table->index('produit_id', 'idx_details_quotations_produit_id');
            $table->index(['quotation_id', 'produit_id'], 'idx_details_quotations_composite');
        });

        // Clients table
        Schema::table('clients', function (Blueprint $table) {
            $table->index('email', 'idx_clients_email');
            $table->index('phone_1', 'idx_clients_phone_1');
            $table->index('created_at', 'idx_clients_created_at');
        });

        // Products table
        Schema::table('produits', function (Blueprint $table) {
            $table->index('sous_categorie_id', 'idx_produits_sous_categorie_id');
            $table->index('brand_id', 'idx_produits_brand_id');
            $table->index('qte', 'idx_produits_qte');
            $table->index('publier', 'idx_produits_publier');
            $table->index('designation_fr', 'idx_produits_designation_fr');
        });

        // Sous Categories table
        Schema::table('sous_categories', function (Blueprint $table) {
            $table->index('categ_id', 'idx_sous_categories_categ_id');
        });

        // Users table
        Schema::table('users', function (Blueprint $table) {
            $table->index('email', 'idx_users_email');
            $table->index('role_id', 'idx_users_role_id');
            $table->index('created_at', 'idx_users_created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Factures
        Schema::table('factures', function (Blueprint $table) {
            $table->dropIndex('idx_factures_client_id');
            $table->dropIndex('idx_factures_created_at');
            $table->dropIndex('idx_factures_numero');
        });

        // Facture TVAs
        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->dropIndex('idx_facture_tvas_client_id');
            $table->dropIndex('idx_facture_tvas_created_at');
            $table->dropIndex('idx_facture_tvas_numero');
        });

        // Tickets
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('idx_tickets_client_id');
            $table->dropIndex('idx_tickets_created_at');
            $table->dropIndex('idx_tickets_numero');
        });

        // Commandes
        Schema::table('commandes', function (Blueprint $table) {
            $table->dropIndex('idx_commandes_created_at');
            $table->dropIndex('idx_commandes_etat');
            $table->dropIndex('idx_commandes_numero');
            $table->dropIndex('idx_commandes_etat_created_at');
        });

        // Quotations
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropIndex('idx_quotations_client_id');
            $table->dropIndex('idx_quotations_created_at');
            $table->dropIndex('idx_quotations_numero');
        });

        // Details tables
        Schema::table('details_factures', function (Blueprint $table) {
            $table->dropIndex('idx_details_factures_facture_id');
            $table->dropIndex('idx_details_factures_produit_id');
            $table->dropIndex('idx_details_factures_composite');
        });

        Schema::table('details_facture_tvas', function (Blueprint $table) {
            $table->dropIndex('idx_details_facture_tvas_facture_tva_id');
            $table->dropIndex('idx_details_facture_tvas_produit_id');
            $table->dropIndex('idx_details_facture_tvas_composite');
        });

        Schema::table('details_tickets', function (Blueprint $table) {
            $table->dropIndex('idx_details_tickets_ticket_id');
            $table->dropIndex('idx_details_tickets_produit_id');
            $table->dropIndex('idx_details_tickets_composite');
        });

        Schema::table('commande_details', function (Blueprint $table) {
            $table->dropIndex('idx_commande_details_commande_id');
            $table->dropIndex('idx_commande_details_produit_id');
            $table->dropIndex('idx_commande_details_composite');
        });

        Schema::table('details_quotations', function (Blueprint $table) {
            $table->dropIndex('idx_details_quotations_quotation_id');
            $table->dropIndex('idx_details_quotations_produit_id');
            $table->dropIndex('idx_details_quotations_composite');
        });

        // Clients
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('idx_clients_email');
            $table->dropIndex('idx_clients_phone_1');
            $table->dropIndex('idx_clients_created_at');
        });

        // Products
        Schema::table('produits', function (Blueprint $table) {
            $table->dropIndex('idx_produits_sous_categorie_id');
            $table->dropIndex('idx_produits_brand_id');
            $table->dropIndex('idx_produits_qte');
            $table->dropIndex('idx_produits_publier');
            $table->dropIndex('idx_produits_designation_fr');
        });

        // Sous Categories
        Schema::table('sous_categories', function (Blueprint $table) {
            $table->dropIndex('idx_sous_categories_categ_id');
        });

        // Users
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_email');
            $table->dropIndex('idx_users_role_id');
            $table->dropIndex('idx_users_created_at');
        });
    }
};
