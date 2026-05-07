<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Some environments created partner_commission_transactions before partner_code_id existed,
 * or 2026_05_07_120001 skipped create() because the table was already present — leaving a stale schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('partner_commission_transactions')) {
            return;
        }

        if (Schema::hasColumn('partner_commission_transactions', 'partner_code_id')) {
            return;
        }

        Schema::table('partner_commission_transactions', function (Blueprint $table) {
            $table->foreignId('partner_code_id')
                ->nullable()
                ->after('partner_id')
                ->constrained('coupons')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('partner_commission_transactions')) {
            return;
        }

        if (! Schema::hasColumn('partner_commission_transactions', 'partner_code_id')) {
            return;
        }

        Schema::table('partner_commission_transactions', function (Blueprint $table) {
            $table->dropForeign(['partner_code_id']);
            $table->dropColumn('partner_code_id');
        });
    }
};
