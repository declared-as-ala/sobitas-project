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

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            if (! Schema::hasColumn('coupon_redemptions', 'ticket_id')) {
                $table->foreignId('ticket_id')->nullable()->after('order_id')->constrained('tickets')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('coupon_redemptions')) {
            return;
        }

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            if (Schema::hasColumn('coupon_redemptions', 'ticket_id')) {
                $table->dropForeign(['ticket_id']);
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
        $dbName = DB::getDatabaseName();
        if (! $dbName) {
            return;
        }

        $constraints = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->select('CONSTRAINT_NAME')
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'coupon_redemptions')
            ->where('COLUMN_NAME', 'order_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME')
            ->filter()
            ->unique()
            ->values();

        foreach ($constraints as $constraintName) {
            // Quote table/constraint names to avoid issues with unusual names.
            DB::statement("ALTER TABLE `coupon_redemptions` DROP FOREIGN KEY `{$constraintName}`");
        }
    }
};
