<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('coupon_redemptions')) {
            return;
        }

        $this->dropOrderIdForeignKeys();

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->unsignedInteger('order_id')->nullable()->change();
        });

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('commandes')->cascadeOnDelete();
        });

        $this->dropForeignKeysForColumn('coupon_redemptions', 'ticket_id');
        $this->syncTicketIdColumnTypeWithTicketsId();
        $this->addTicketForeignKeyIfPossible();
    }

    public function down(): void
    {
        if (! Schema::hasTable('coupon_redemptions')) {
            return;
        }

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            if (Schema::hasColumn('coupon_redemptions', 'ticket_id')) {
                $this->dropForeignKeysForColumn('coupon_redemptions', 'ticket_id');
                $table->dropColumn('ticket_id');
            }
        });

        $this->dropOrderIdForeignKeys();

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->unsignedInteger('order_id')->nullable(false)->change();
        });

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('commandes')->cascadeOnDelete();
        });
    }

    /**
     * Drop any FK(s) bound to coupon_redemptions.order_id safely, regardless of actual FK names.
     */
    private function dropOrderIdForeignKeys(): void
    {
        $this->dropForeignKeysForColumn('coupon_redemptions', 'order_id');
    }

    /**
     * Drop all FK constraints bound to a given table column, whatever their names are.
     */
    private function dropForeignKeysForColumn(string $table, string $column): void
    {
        $dbName = DB::getDatabaseName();
        if (! $dbName) {
            return;
        }

        $constraints = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->select('CONSTRAINT_NAME')
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', $table)
            ->where('COLUMN_NAME', $column)
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME')
            ->filter()
            ->unique()
            ->values();

        foreach ($constraints as $constraintName) {
            // Quote table/constraint names to avoid issues with unusual names.
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraintName}`");
        }
    }

    /**
     * Make coupon_redemptions.ticket_id exactly match tickets.id SQL type.
     */
    private function syncTicketIdColumnTypeWithTicketsId(): void
    {
        if (! Schema::hasTable('tickets')) {
            return;
        }

        $ticketIdType = $this->getColumnType('tickets', 'id');
        if (! $ticketIdType) {
            return;
        }

        $hasTicketId = Schema::hasColumn('coupon_redemptions', 'ticket_id');

        if (! $hasTicketId) {
            DB::statement("ALTER TABLE `coupon_redemptions` ADD COLUMN `ticket_id` {$ticketIdType} NULL AFTER `order_id`");

            return;
        }

        $existingType = $this->getColumnType('coupon_redemptions', 'ticket_id');
        if ($existingType && strcasecmp($existingType, $ticketIdType) !== 0) {
            DB::statement("ALTER TABLE `coupon_redemptions` MODIFY COLUMN `ticket_id` {$ticketIdType} NULL");
        }
    }

    /**
     * Add FK coupon_redemptions.ticket_id -> tickets.id if both exist.
     */
    private function addTicketForeignKeyIfPossible(): void
    {
        if (! Schema::hasTable('tickets') || ! Schema::hasColumn('coupon_redemptions', 'ticket_id')) {
            return;
        }

        DB::statement(
            'ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_ticket_id_foreign` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE SET NULL'
        );
    }

    /**
     * Get column SQL type exactly as stored in MySQL (e.g. int(10) unsigned).
     */
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
