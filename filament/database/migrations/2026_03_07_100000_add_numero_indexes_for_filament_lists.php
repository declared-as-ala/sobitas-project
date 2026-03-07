<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Indexes for Filament list search/sort on numero (factures, quotations).
     * facture_tvas.numero already has idx_facture_tvas_numero from a previous migration.
     */
    public function up(): void
    {
        if (Schema::hasTable('factures') && Schema::hasColumn('factures', 'numero') && !$this->indexExists('factures', 'idx_factures_numero')) {
            Schema::table('factures', function (Blueprint $table) {
                $table->index('numero', 'idx_factures_numero');
            });
        }

        if (Schema::hasTable('quotations') && Schema::hasColumn('quotations', 'numero') && !$this->indexExists('quotations', 'idx_quotations_numero')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->index('numero', 'idx_quotations_numero');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('factures') && $this->indexExists('factures', 'idx_factures_numero')) {
            Schema::table('factures', function (Blueprint $table) {
                $table->dropIndex('idx_factures_numero');
            });
        }
        if (Schema::hasTable('quotations') && $this->indexExists('quotations', 'idx_quotations_numero')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->dropIndex('idx_quotations_numero');
            });
        }
    }

    private function indexExists(string $table, string $index): bool
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver !== 'mysql') {
            return false;
        }
        $result = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]);
        return count($result) > 0;
    }
};
