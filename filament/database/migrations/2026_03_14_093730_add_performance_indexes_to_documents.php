<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Idempotent: skips any index that already exists.
     */
    public function up(): void
    {
        $this->addIndexesSafe('tickets', ['numero', 'client_id', 'created_at']);
        $this->addIndexesSafe('facture_tvas', ['numero', 'client_id', 'created_at']);
        $this->addIndexesSafe('commandes', ['numero', 'etat', 'created_at']);
        $this->addIndexesSafe('factures', ['numero', 'client_id', 'created_at']);
        $this->addIndexesSafe('quotations', ['numero', 'client_id', 'created_at']);
        $this->addIndexesSafe('products', ['code_product', 'designation_fr']);
        $this->addIndexesSafe('clients', ['phone_1', 'email']);
    }

    protected function addIndexesSafe(string $table, array $columns): void
    {
        $existing = collect(DB::select("SHOW INDEX FROM `{$table}`"))->pluck('Key_name')->unique()->toArray();

        Schema::table($table, function (Blueprint $blueprint) use ($table, $columns, $existing) {
            foreach ($columns as $col) {
                $indexName = "{$table}_{$col}_index";
                if (!in_array($indexName, $existing)) {
                    $blueprint->index($col);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->dropIndexesSafe('tickets', ['numero', 'client_id', 'created_at']);
        $this->dropIndexesSafe('facture_tvas', ['numero', 'client_id', 'created_at']);
        $this->dropIndexesSafe('commandes', ['numero', 'etat', 'created_at']);
        $this->dropIndexesSafe('factures', ['numero', 'client_id', 'created_at']);
        $this->dropIndexesSafe('quotations', ['numero', 'client_id', 'created_at']);
        $this->dropIndexesSafe('products', ['code_product', 'designation_fr']);
        $this->dropIndexesSafe('clients', ['phone_1', 'email']);
    }

    protected function dropIndexesSafe(string $table, array $columns): void
    {
        $existing = collect(DB::select("SHOW INDEX FROM `{$table}`"))->pluck('Key_name')->unique()->toArray();

        Schema::table($table, function (Blueprint $blueprint) use ($table, $columns, $existing) {
            foreach ($columns as $col) {
                $indexName = "{$table}_{$col}_index";
                if (in_array($indexName, $existing)) {
                    $blueprint->dropIndex([$col]);
                }
            }
        });
    }
};
