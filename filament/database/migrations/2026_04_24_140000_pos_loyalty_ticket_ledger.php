<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                if (! Schema::hasColumn('tickets', 'loyalty_card_id')) {
                    $table->unsignedBigInteger('loyalty_card_id')->nullable()->after('client_id');
                    $table->index('loyalty_card_id');
                }
                if (! Schema::hasColumn('tickets', 'loyalty_points_earned')) {
                    $table->unsignedInteger('loyalty_points_earned')->default(0)->after('loyalty_card_id');
                }
                if (! Schema::hasColumn('tickets', 'loyalty_points_redeemed')) {
                    $table->unsignedInteger('loyalty_points_redeemed')->default(0)->after('loyalty_points_earned');
                }
                if (! Schema::hasColumn('tickets', 'loyalty_discount_amount')) {
                    $table->decimal('loyalty_discount_amount', 10, 3)->default(0)->after('loyalty_points_redeemed');
                }
                if (! Schema::hasColumn('tickets', 'loyalty_processed_at')) {
                    $table->timestamp('loyalty_processed_at')->nullable()->after('loyalty_discount_amount');
                }
            });
        }

        if (Schema::hasTable('loyalty_point_transactions')) {
            Schema::table('loyalty_point_transactions', function (Blueprint $table) {
                if (! Schema::hasColumn('loyalty_point_transactions', 'ticket_id')) {
                    $table->unsignedBigInteger('ticket_id')->nullable()->after('order_id');
                    $table->index(['ticket_id', 'type'], 'lpt_ticket_id_type_idx');
                }
                if (! Schema::hasColumn('loyalty_point_transactions', 'loyalty_card_id')) {
                    $table->unsignedBigInteger('loyalty_card_id')->nullable()->after('ticket_id');
                    $table->index('loyalty_card_id');
                }
            });
        }

        if (Schema::hasTable('loyalty_cards')) {
            Schema::table('loyalty_cards', function (Blueprint $table) {
                if (! Schema::hasColumn('loyalty_cards', 'replaced_at')) {
                    $table->timestamp('replaced_at')->nullable()->after('issued_at');
                }
            });

            if (Schema::getConnection()->getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE loyalty_cards MODIFY COLUMN status ENUM('active','suspended','lost','replaced') NOT NULL DEFAULT 'active'");
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                foreach (['loyalty_processed_at', 'loyalty_discount_amount', 'loyalty_points_redeemed', 'loyalty_points_earned', 'loyalty_card_id'] as $col) {
                    if (Schema::hasColumn('tickets', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('loyalty_point_transactions')) {
            Schema::table('loyalty_point_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('loyalty_point_transactions', 'ticket_id')) {
                    $table->dropIndex('lpt_ticket_id_type_idx');
                    $table->dropColumn('ticket_id');
                }
                if (Schema::hasColumn('loyalty_point_transactions', 'loyalty_card_id')) {
                    $table->dropIndex(['loyalty_card_id']);
                    $table->dropColumn('loyalty_card_id');
                }
            });
        }

        if (Schema::hasTable('loyalty_cards')) {
            Schema::table('loyalty_cards', function (Blueprint $table) {
                if (Schema::hasColumn('loyalty_cards', 'replaced_at')) {
                    $table->dropColumn('replaced_at');
                }
            });
            if (Schema::getConnection()->getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE loyalty_cards MODIFY COLUMN status ENUM('active','suspended','lost') NOT NULL DEFAULT 'active'");
            }
        }
    }
};
