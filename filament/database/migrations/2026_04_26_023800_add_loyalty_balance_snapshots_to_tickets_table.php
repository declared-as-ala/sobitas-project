<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'loyalty_old_balance_points')) {
                $table->unsignedInteger('loyalty_old_balance_points')
                    ->default(0)
                    ->after('loyalty_processed_at');
            }

            if (! Schema::hasColumn('tickets', 'loyalty_new_balance_points')) {
                $table->unsignedInteger('loyalty_new_balance_points')
                    ->default(0)
                    ->after('loyalty_old_balance_points');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $dropColumns = [];
            if (Schema::hasColumn('tickets', 'loyalty_new_balance_points')) {
                $dropColumns[] = 'loyalty_new_balance_points';
            }
            if (Schema::hasColumn('tickets', 'loyalty_old_balance_points')) {
                $dropColumns[] = 'loyalty_old_balance_points';
            }

            if (! empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
