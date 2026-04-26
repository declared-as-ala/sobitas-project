<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('clients') || Schema::hasColumn('clients', 'loyalty_points_balance')) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->unsignedInteger('loyalty_points_balance')->default(0)->after('loyalty_note');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('clients') || ! Schema::hasColumn('clients', 'loyalty_points_balance')) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('loyalty_points_balance');
        });
    }
};
