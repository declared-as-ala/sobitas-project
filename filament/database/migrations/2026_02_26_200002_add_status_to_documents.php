<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('quotations') && !Schema::hasColumn('quotations', 'status')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->string('status', 32)->default('draft')->after('statut');
            });
        }

        if (Schema::hasTable('factures') && !Schema::hasColumn('factures', 'status')) {
            Schema::table('factures', function (Blueprint $table) {
                $table->string('status', 32)->default('draft')->after('client_id');
            });
        }

        if (Schema::hasTable('facture_tvas') && !Schema::hasColumn('facture_tvas', 'status')) {
            Schema::table('facture_tvas', function (Blueprint $table) {
                $table->string('status', 32)->default('draft')->after('client_id');
            });
        }

        if (Schema::hasTable('tickets') && !Schema::hasColumn('tickets', 'status')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->string('status', 32)->default('draft')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('quotations') && Schema::hasColumn('quotations', 'status')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
        if (Schema::hasTable('factures') && Schema::hasColumn('factures', 'status')) {
            Schema::table('factures', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
        if (Schema::hasTable('facture_tvas') && Schema::hasColumn('facture_tvas', 'status')) {
            Schema::table('facture_tvas', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
        if (Schema::hasTable('tickets') && Schema::hasColumn('tickets', 'status')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
