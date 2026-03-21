<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Backfill number_sequences for CMD (commandes) and TK (tickets)
     * so new numbers continue after the highest existing numero.
     * Uses MAX(numeric part of numero) — not COUNT — to be safe against deletions.
     */
    public function up(): void
    {
        if (! Schema::hasTable('number_sequences')) {
            return;
        }

        $year = (int) date('Y');

        foreach (['CMD' => 'commandes', 'TK' => 'tickets'] as $name => $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $row = DB::selectOne(
                "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero, '/', -1) AS UNSIGNED)), 0) AS n
                 FROM `{$table}`
                 WHERE YEAR(created_at) = ? AND numero LIKE ?",
                [$year, $year . '/%']
            );

            $lastNumber = (int) ($row->n ?? 0);

            DB::table('number_sequences')->updateOrInsert(
                ['name' => $name, 'year' => $year],
                ['last_number' => $lastNumber, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }

    public function down(): void
    {
        $year = (int) date('Y');
        DB::table('number_sequences')
            ->whereIn('name', ['CMD', 'TK'])
            ->where('year', $year)
            ->delete();
    }
};
