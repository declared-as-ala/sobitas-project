<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('quotations') && ! Schema::hasColumn('quotations', 'statut')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->string('statut', 32)->nullable()->after('remise');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('quotations', 'statut')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->dropColumn('statut');
            });
        }
    }
};
