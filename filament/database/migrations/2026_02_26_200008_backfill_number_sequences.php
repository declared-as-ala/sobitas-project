<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill number_sequences so new BL/FA/AV/DV numbers continue after existing data.
     */
    public function up(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('number_sequences')) {
            return;
        }

        $year = (int) date('Y');

        foreach (['BL' => 'factures', 'FA' => 'facture_tvas', 'DV' => 'quotations'] as $name => $table) {
            if (! \Illuminate\Support\Facades\Schema::hasTable($table)) {
                continue;
            }
            $count = (int) DB::table($table)->whereYear('created_at', $year)->count();
            if ($count > 0) {
                DB::table('number_sequences')->updateOrInsert(
                    ['name' => $name, 'year' => $year],
                    ['last_number' => $count, 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        // Optional: clear backfilled rows; leave table as-is for safety
    }
};
