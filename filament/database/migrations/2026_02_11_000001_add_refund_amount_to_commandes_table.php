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
        Schema::table('commandes', function (Blueprint $table) {
            if (!Schema::hasColumn('commandes', 'refund_amount')) {
                // Add column after prix_ttc if it exists, otherwise just add it
                if (Schema::hasColumn('commandes', 'prix_ttc')) {
                    $table->decimal('refund_amount', 10, 2)->default(0)->nullable()->after('prix_ttc');
                } else {
                    $table->decimal('refund_amount', 10, 2)->default(0)->nullable();
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            if (Schema::hasColumn('commandes', 'refund_amount')) {
                $table->dropColumn('refund_amount');
            }
        });
    }
};
