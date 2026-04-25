<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tickets')) {
            return;
        }

        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'loyalty_card_id')) {
                $table->foreignId('loyalty_card_id')->nullable()->after('client_id')
                    ->constrained('loyalty_cards')->nullOnDelete();
            }
            if (! Schema::hasColumn('tickets', 'loyalty_points_redeemed')) {
                $table->unsignedInteger('loyalty_points_redeemed')->default(0)->after('loyalty_card_id');
            }
            if (! Schema::hasColumn('tickets', 'loyalty_discount_dt')) {
                $table->decimal('loyalty_discount_dt', 10, 3)->default(0)->after('loyalty_points_redeemed');
            }
            if (! Schema::hasColumn('tickets', 'loyalty_points_earned')) {
                $table->unsignedInteger('loyalty_points_earned')->default(0)->after('loyalty_discount_dt');
            }
            if (! Schema::hasColumn('tickets', 'loyalty_processed_at')) {
                $table->timestamp('loyalty_processed_at')->nullable()->after('loyalty_points_earned');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tickets')) {
            return;
        }

        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'loyalty_card_id')) {
                try {
                    $table->dropForeign(['loyalty_card_id']);
                } catch (\Throwable) {
                }

                try {
                    $table->dropIndex(['loyalty_card_id']);
                } catch (\Throwable) {
                }

                $table->dropColumn('loyalty_card_id');
            }

            foreach ([
                'loyalty_points_redeemed',
                'loyalty_discount_dt',
                'loyalty_points_earned',
                'loyalty_processed_at',
            ] as $column) {
                if (Schema::hasColumn('tickets', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
