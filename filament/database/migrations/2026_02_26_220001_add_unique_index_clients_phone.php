<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add index on clients.phone_1 (unique only when no duplicates exist).
     * Also add code_postale to clients if missing (for delivery data).
     */
    public function up(): void
    {
        if (! Schema::hasTable('clients')) {
            return;
        }

        // Add code_postale if missing (client fields migration may not have it)
        if (Schema::hasTable('clients') && ! Schema::hasColumn('clients', 'code_postale')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->string('code_postale', 32)->nullable()->after('ville');
            });
        }

        if (Schema::hasIndex('clients', 'clients_phone_1_unique')) {
            return;
        }
        if (Schema::hasIndex('clients', 'idx_clients_phone_1')) {
            return;
        }

        // Only add UNIQUE index when there are no duplicate phone_1 (excluding nulls)
        $duplicates = DB::table('clients')
            ->whereNotNull('phone_1')
            ->where('phone_1', '!=', '')
            ->selectRaw('phone_1, COUNT(*) as cnt')
            ->groupBy('phone_1')
            ->havingRaw('COUNT(*) > 1')
            ->count();

        Schema::table('clients', function (Blueprint $table) use ($duplicates) {
            if ($duplicates === 0) {
                $table->unique('phone_1', 'clients_phone_1_unique');
            } else {
                $table->index('phone_1', 'idx_clients_phone_1');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('clients')) {
            Schema::table('clients', function (Blueprint $table) {
                if (Schema::hasIndex('clients', 'clients_phone_1_unique')) {
                    $table->dropUnique('clients_phone_1_unique');
                }
                if (Schema::hasIndex('clients', 'idx_clients_phone_1')) {
                    $table->dropIndex('idx_clients_phone_1');
                }
                if (Schema::hasColumn('clients', 'code_postale')) {
                    $table->dropColumn('code_postale');
                }
            });
        }
    }
};
