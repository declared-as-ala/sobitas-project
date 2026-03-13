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
        Schema::table('factures', function (Blueprint $table) {
            if (!Schema::hasColumn('factures', 'remise')) {
                $table->decimal('remise', 15, 3)->default(0)->after('prix_ht');
            }
            if (!Schema::hasColumn('factures', 'pourcentage_remise')) {
                $table->decimal('pourcentage_remise', 5, 2)->default(0)->after('remise');
            }
            if (!Schema::hasColumn('factures', 'frais_livraison')) {
                $table->decimal('frais_livraison', 15, 3)->default(0)->after('timbre');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->dropColumn(['remise', 'pourcentage_remise', 'frais_livraison']);
        });
    }
};
