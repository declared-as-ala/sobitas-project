<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('commandes') && !Schema::hasColumn('commandes', 'quotation_id')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->unsignedBigInteger('quotation_id')->nullable()->after('user_id');
                $table->foreign('quotation_id')->references('id')->on('quotations')->nullOnDelete();
            });
        }

        if (Schema::hasTable('factures') && !Schema::hasColumn('factures', 'commande_id')) {
            Schema::table('factures', function (Blueprint $table) {
                $table->unsignedBigInteger('commande_id')->nullable()->after('client_id');
                $table->foreign('commande_id')->references('id')->on('commandes')->nullOnDelete();
            });
        }

        if (Schema::hasTable('facture_tvas') && !Schema::hasColumn('facture_tvas', 'facture_id')) {
            Schema::table('facture_tvas', function (Blueprint $table) {
                $table->unsignedBigInteger('facture_id')->nullable()->after('client_id');
                $table->foreign('facture_id')->references('id')->on('factures')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('commandes', 'quotation_id')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->dropForeign(['quotation_id']);
            });
        }
        if (Schema::hasColumn('factures', 'commande_id')) {
            Schema::table('factures', function (Blueprint $table) {
                $table->dropForeign(['commande_id']);
            });
        }
        if (Schema::hasColumn('facture_tvas', 'facture_id')) {
            Schema::table('facture_tvas', function (Blueprint $table) {
                $table->dropForeign(['facture_id']);
            });
        }
    }
};
