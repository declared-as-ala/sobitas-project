<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('commandes')) {
            Schema::table('commandes', function (Blueprint $t): void {
                if (! Schema::hasColumn('commandes', 'fulfillment_mode')) {
                    $t->string('fulfillment_mode', 20)->nullable()->default('delivery');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('commandes') && Schema::hasColumn('commandes', 'fulfillment_mode')) {
            Schema::table('commandes', fn (Blueprint $t) => $t->dropColumn('fulfillment_mode'));
        }
    }
};
