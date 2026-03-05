<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Performance: index on facture_tvas.numero for Filament table search and filters.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('facture_tvas') || ! Schema::hasColumn('facture_tvas', 'numero')) {
            return;
        }
        if ($this->indexExists('facture_tvas', 'idx_facture_tvas_numero')) {
            return;
        }
        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->index('numero', 'idx_facture_tvas_numero');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('facture_tvas')) {
            return;
        }
        if (! $this->indexExists('facture_tvas', 'idx_facture_tvas_numero')) {
            return;
        }
        Schema::table('facture_tvas', function (Blueprint $table) {
            $table->dropIndex('idx_facture_tvas_numero');
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            $result = DB::selectOne(
                "SELECT COUNT(*) as c FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?",
                [Schema::getConnection()->getDatabaseName(), $table, $index]
            );
            return (int) ($result->c ?? 0) > 0;
        }
        if (method_exists(Schema::class, 'getIndexListing')) {
            return in_array($index, Schema::getIndexListing($table), true);
        }
        return false;
    }
};
