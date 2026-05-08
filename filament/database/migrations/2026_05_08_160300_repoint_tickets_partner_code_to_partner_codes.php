<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tickets') || ! Schema::hasTable('partner_codes')) {
            return;
        }

        if (! Schema::hasColumn('tickets', 'partner_code_id')) {
            return;
        }

        if (Schema::hasColumn('tickets', 'partner_code_fk')) {
            return;
        }

        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedBigInteger('partner_code_fk')->nullable()->after('partner_id');
        });

        $idByLegacy = DB::table('partner_codes')->whereNotNull('legacy_coupon_id')->pluck('id', 'legacy_coupon_id');

        $tickets = DB::table('tickets')->whereNotNull('partner_code_id')->select(['id', 'partner_code_id'])->get();
        foreach ($tickets as $t) {
            $newId = $idByLegacy[(int) $t->partner_code_id] ?? null;
            if ($newId !== null) {
                DB::table('tickets')->where('id', $t->id)->update(['partner_code_fk' => $newId]);
            }
        }

        $this->dropForeignKeyIfExists('tickets', 'partner_code_id');

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('partner_code_id');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->renameColumn('partner_code_fk', 'partner_code_id');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->foreign('partner_code_id')->references('id')->on('partner_codes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        // Irreversible data migration in production; manual restore only.
    }

    private function dropForeignKeyIfExists(string $table, string $column): void
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'mysql') {
            $dbName = $connection->getDatabaseName();
            $constraints = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', $dbName)
                ->where('TABLE_NAME', $table)
                ->where('COLUMN_NAME', $column)
                ->whereNotNull('REFERENCED_TABLE_NAME')
                ->pluck('CONSTRAINT_NAME');

            foreach ($constraints as $name) {
                DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$name}`");
            }

            return;
        }

        try {
            Schema::table($table, function (Blueprint $table) use ($column) {
                $table->dropForeign([$column]);
            });
        } catch (\Throwable) {
            //
        }
    }
};
