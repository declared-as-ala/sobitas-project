<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── tickets: type (ticket_caisse | bon_livraison) + commande_id for BL ──
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                if (!Schema::hasColumn('tickets', 'type')) {
                    $table->string('type', 32)->default('ticket_caisse')->after('id');
                }
                if (!Schema::hasColumn('tickets', 'commande_id')) {
                    $table->unsignedInteger('commande_id')->nullable()->after('client_id');
                    $table->foreign('commande_id')->references('id')->on('commandes')->nullOnDelete();
                    $table->index('commande_id');
                }
                if (Schema::hasColumn('tickets', 'type') && ! Schema::hasIndex('tickets', 'tickets_type_created_at_index')) {
                    $table->index(['type', 'created_at'], 'tickets_type_created_at_index');
                }
            });
        }

        // ── facture_tvas: source_ticket_id + commande_id for linked invoices (no double CA) ──
        if (Schema::hasTable('facture_tvas')) {
            Schema::table('facture_tvas', function (Blueprint $table) {
                if (!Schema::hasColumn('facture_tvas', 'source_ticket_id')) {
                    $table->unsignedInteger('source_ticket_id')->nullable()->after('client_id');
                    $table->foreign('source_ticket_id')->references('id')->on('tickets')->nullOnDelete();
                    $table->index('source_ticket_id');
                }
                if (!Schema::hasColumn('facture_tvas', 'commande_id')) {
                    $table->unsignedInteger('commande_id')->nullable()->after('source_ticket_id');
                    $table->foreign('commande_id')->references('id')->on('commandes')->nullOnDelete();
                    $table->index('commande_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                if (Schema::hasIndex('tickets', 'tickets_type_created_at_index')) {
                    $table->dropIndex('tickets_type_created_at_index');
                }
                if (Schema::hasColumn('tickets', 'type')) {
                    $table->dropColumn('type');
                }
            });
        }
        if (Schema::hasTable('tickets') && Schema::hasColumn('tickets', 'commande_id')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropForeign(['commande_id']);
                $table->dropIndex(['commande_id']);
                $table->dropColumn('commande_id');
            });
        }

        if (Schema::hasTable('facture_tvas') && Schema::hasColumn('facture_tvas', 'source_ticket_id')) {
            Schema::table('facture_tvas', function (Blueprint $table) {
                $table->dropForeign(['source_ticket_id']);
                $table->dropIndex(['source_ticket_id']);
                $table->dropColumn('source_ticket_id');
            });
        }
        if (Schema::hasTable('facture_tvas') && Schema::hasColumn('facture_tvas', 'commande_id')) {
            Schema::table('facture_tvas', function (Blueprint $table) {
                $table->dropForeign(['commande_id']);
                $table->dropIndex(['commande_id']);
                $table->dropColumn('commande_id');
            });
        }
    }
};
