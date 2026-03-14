<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure all critical indexes for Filament performance are in place
        // These are used by table list pages, search, sorting, and filtering

        // ── Tickets ──────────────────────────────────────
        Schema::table('tickets', function (Blueprint $table) {
            if (!Schema::hasIndex('tickets', 'idx_tickets_numero')) {
                $table->index('numero', 'idx_tickets_numero');
            }
            if (!Schema::hasIndex('tickets', 'idx_tickets_commande')) {
                $table->index('commande_id', 'idx_tickets_commande');
            }
        });

        // ── Factures TVA ─────────────────────────────────
        Schema::table('facture_tvas', function (Blueprint $table) {
            if (!Schema::hasIndex('facture_tvas', 'idx_facture_tvas_numero')) {
                $table->index('numero', 'idx_facture_tvas_numero');
            }
        });

        // ── Factures (BL)────────────────────────────────
        Schema::table('factures', function (Blueprint $table) {
            if (!Schema::hasIndex('factures', 'idx_factures_numero')) {
                $table->index('numero', 'idx_factures_numero');
            }
        });

        // ── Commandes ────────────────────────────────────
        Schema::table('commandes', function (Blueprint $table) {
            if (!Schema::hasIndex('commandes', 'idx_commandes_numero')) {
                $table->index('numero', 'idx_commandes_numero');
            }
            if (!Schema::hasIndex('commandes', 'idx_commandes_client')) {
                $table->index('client_id', 'idx_commandes_client');
            }
        });

        // ── Quotations ───────────────────────────────────
        if (Schema::hasTable('quotations')) {
            Schema::table('quotations', function (Blueprint $table) {
                if (Schema::hasColumn('quotations', 'numero')) {
                    if (!Schema::hasIndex('quotations', 'idx_quotations_numero')) {
                        $table->index('numero', 'idx_quotations_numero');
                    }
                }
            });
        }

        // ── Products ─────────────────────────────────────
        // Ensure barcode is indexed for fast POS lookups
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'barcode')) {
                if (!Schema::hasIndex('products', 'idx_products_barcode')) {
                    $table->index('barcode', 'idx_products_barcode');
                }
            }
            if (Schema::hasColumn('products', 'code_product')) {
                if (!Schema::hasIndex('products', 'idx_products_code_product')) {
                    $table->index('code_product', 'idx_products_code_product');
                }
            }
        });

        // ── Clients ──────────────────────────────────────
        Schema::table('clients', function (Blueprint $table) {
            // These should already exist from previous migration, but ensure they do
            if (!Schema::hasIndex('clients', 'idx_clients_email')) {
                $table->index('email', 'idx_clients_email');
            }
        });
    }

    public function down(): void
    {
        // Drop indexes if they exist (be safe about it)
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasIndex('tickets', 'idx_tickets_numero')) {
                $table->dropIndex('idx_tickets_numero');
            }
            if (Schema::hasIndex('tickets', 'idx_tickets_commande')) {
                $table->dropIndex('idx_tickets_commande');
            }
        });

        Schema::table('facture_tvas', function (Blueprint $table) {
            if (Schema::hasIndex('facture_tvas', 'idx_facture_tvas_numero')) {
                $table->dropIndex('idx_facture_tvas_numero');
            }
        });

        Schema::table('factures', function (Blueprint $table) {
            if (Schema::hasIndex('factures', 'idx_factures_numero')) {
                $table->dropIndex('idx_factures_numero');
            }
        });

        Schema::table('commandes', function (Blueprint $table) {
            if (Schema::hasIndex('commandes', 'idx_commandes_numero')) {
                $table->dropIndex('idx_commandes_numero');
            }
            if (Schema::hasIndex('commandes', 'idx_commandes_client')) {
                $table->dropIndex('idx_commandes_client');
            }
        });

        if (Schema::hasTable('quotations')) {
            Schema::table('quotations', function (Blueprint $table) {
                if (Schema::hasIndex('quotations', 'idx_quotations_numero')) {
                    $table->dropIndex('idx_quotations_numero');
                }
            });
        }

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasIndex('products', 'idx_products_barcode')) {
                $table->dropIndex('idx_products_barcode');
            }
            if (Schema::hasIndex('products', 'idx_products_code_product')) {
                $table->dropIndex('idx_products_code_product');
            }
        });

        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasIndex('clients', 'idx_clients_email')) {
                $table->dropIndex('idx_clients_email');
            }
        });
    }
};
