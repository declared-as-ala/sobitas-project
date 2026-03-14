<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->index('numero');
            $table->index('client_id');
            $table->index('created_at');
        });

        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->index('numero');
            $table->index('client_id');
            $table->index('created_at');
        });

        Schema::table('commandes', function (Blueprint $table) {
            $table->index('numero');
            $table->index('etat');
            $table->index('created_at');
        });

        Schema::table('factures', function (Blueprint $table) {
            $table->index('numero');
            $table->index('client_id');
            $table->index('created_at');
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->index('numero');
            $table->index('client_id');
            $table->index('created_at');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index('code_product');
            $table->index('designation_fr');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->index('phone_1');
            $table->index('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex(['numero']);
            $table->dropIndex(['client_id']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->dropIndex(['numero']);
            $table->dropIndex(['client_id']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('commandes', function (Blueprint $table) {
            $table->dropIndex(['numero']);
            $table->dropIndex(['etat']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('factures', function (Blueprint $table) {
            $table->dropIndex(['numero']);
            $table->dropIndex(['client_id']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->dropIndex(['numero']);
            $table->dropIndex(['client_id']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['code_product']);
            $table->dropIndex(['designation_fr']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex(['phone_1']);
            $table->dropIndex(['email']);
        });
    }
};
