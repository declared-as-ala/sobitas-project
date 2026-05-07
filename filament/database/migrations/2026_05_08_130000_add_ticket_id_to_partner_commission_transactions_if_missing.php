<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Same drift case as partner_code_id: 2026_05_07_120001 skips create() when the table
 * already exists, leaving legacy schemas without ticket_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('partner_commission_transactions')) {
            return;
        }

        if (Schema::hasColumn('partner_commission_transactions', 'ticket_id')) {
            return;
        }

        $after = Schema::hasColumn('partner_commission_transactions', 'partner_code_id')
            ? 'partner_code_id'
            : 'partner_id';

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' && Schema::hasTable('tickets')) {
            $ticketIdType = $this->getColumnType('tickets', 'id');
            if ($ticketIdType) {
                DB::statement(
                    "ALTER TABLE `partner_commission_transactions` ADD COLUMN `ticket_id` {$ticketIdType} NULL AFTER `{$after}`"
                );
                DB::statement(
                    'ALTER TABLE `partner_commission_transactions` ADD CONSTRAINT `partner_commission_transactions_ticket_id_foreign` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE SET NULL'
                );

                return;
            }
        }

        Schema::table('partner_commission_transactions', function (Blueprint $table) use ($after) {
            $table->foreignId('ticket_id')
                ->nullable()
                ->after($after)
                ->constrained('tickets')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('partner_commission_transactions')) {
            return;
        }

        if (! Schema::hasColumn('partner_commission_transactions', 'ticket_id')) {
            return;
        }

        Schema::table('partner_commission_transactions', function (Blueprint $table) {
            $table->dropForeign(['ticket_id']);
            $table->dropColumn('ticket_id');
        });
    }

    private function getColumnType(string $table, string $column): ?string
    {
        $dbName = DB::getDatabaseName();
        if (! $dbName) {
            return null;
        }

        return DB::table('information_schema.COLUMNS')
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', $table)
            ->where('COLUMN_NAME', $column)
            ->value('COLUMN_TYPE');
    }
};
