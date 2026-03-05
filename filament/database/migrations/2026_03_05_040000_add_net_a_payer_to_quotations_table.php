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
        Schema::table('quotations', function (Blueprint $table) {
            if (!Schema::hasColumn('quotations', 'prix_ht_apres_remise')) {
                $table->decimal('prix_ht_apres_remise', 15, 3)->nullable()->after('prix_ht');
            }
            if (!Schema::hasColumn('quotations', 'net_a_payer')) {
                $table->decimal('net_a_payer', 15, 3)->nullable()->after('prix_ttc');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            if (Schema::hasColumn('quotations', 'prix_ht_apres_remise')) {
                $table->dropColumn('prix_ht_apres_remise');
            }
            if (Schema::hasColumn('quotations', 'net_a_payer')) {
                $table->dropColumn('net_a_payer');
            }
        });
    }
};
