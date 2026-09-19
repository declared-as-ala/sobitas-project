<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('commande_details')) {
            Schema::table('commande_details', function (Blueprint $t): void {
                if (! Schema::hasColumn('commande_details', 'arome')) {
                    $t->string('arome', 191)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('commande_details') && Schema::hasColumn('commande_details', 'arome')) {
            Schema::table('commande_details', fn (Blueprint $t) => $t->dropColumn('arome'));
        }
    }
};
