<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a unique constraint on commandes.numero to prevent duplicate order numbers.
     * Before adding the constraint, deduplicate any existing rows that share the same
     * numero by keeping the row with the lowest id and re-numbering the others.
     */
    public function up(): void
    {
        if (! Schema::hasTable('commandes')) {
            return;
        }

        // If the unique index already exists, skip
        $indexes = collect(DB::select("SHOW INDEX FROM `commandes`"))
            ->pluck('Key_name')
            ->unique();

        if ($indexes->contains('commandes_numero_unique')) {
            return;
        }

        // Fix any existing duplicates before adding the constraint
        $duplicates = DB::select(
            "SELECT numero, COUNT(*) as cnt FROM commandes
             WHERE numero IS NOT NULL AND numero != ''
             GROUP BY numero HAVING cnt > 1"
        );

        foreach ($duplicates as $dup) {
            // Keep the first (lowest id), rename the rest to avoid conflict
            $rows = DB::table('commandes')
                ->where('numero', $dup->numero)
                ->orderBy('id')
                ->skip(1)
                ->pluck('id');

            foreach ($rows as $i => $id) {
                $suffix = 'DUP' . ($i + 1);
                DB::table('commandes')->where('id', $id)->update([
                    'numero' => $dup->numero . '-' . $suffix,
                ]);
            }
        }

        Schema::table('commandes', function (Blueprint $table) {
            $table->unique('numero', 'commandes_numero_unique');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('commandes')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->dropUnique('commandes_numero_unique');
            });
        }
    }
};
