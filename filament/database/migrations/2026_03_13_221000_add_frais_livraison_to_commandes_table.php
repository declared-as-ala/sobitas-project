<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            if (! Schema::hasColumn('commandes', 'frais_livraison')) {
                $table->decimal('frais_livraison', 10, 3)->default(0)->after('prix_ttc');
            }
        });
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            if (Schema::hasColumn('commandes', 'frais_livraison')) {
                $table->dropColumn('frais_livraison');
            }
        });
    }
};
