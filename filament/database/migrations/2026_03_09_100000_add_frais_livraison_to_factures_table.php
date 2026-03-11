<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('factures') || Schema::hasColumn('factures', 'frais_livraison')) {
            return;
        }
        Schema::table('factures', function (Blueprint $table) {
            $table->decimal('frais_livraison', 15, 3)->nullable()->default(0)->after('timbre');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('factures', 'frais_livraison')) {
            Schema::table('factures', function (Blueprint $table) {
                $table->dropColumn('frais_livraison');
            });
        }
    }
};
