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
            if (! Schema::hasColumn('tickets', 'partner_id')) {
                $table->foreignId('partner_id')->nullable()->constrained('partners')->nullOnDelete();
            }
            if (! Schema::hasColumn('tickets', 'partner_code_id')) {
                $table->foreignId('partner_code_id')->nullable()->after('partner_id')->constrained('coupons')->nullOnDelete();
            }
            if (! Schema::hasColumn('tickets', 'partner_code_snapshot')) {
                $table->string('partner_code_snapshot', 64)->nullable()->after('partner_code_id');
            }
            if (! Schema::hasColumn('tickets', 'partner_discount_amount')) {
                $table->decimal('partner_discount_amount', 14, 3)->default(0)->after('partner_code_snapshot');
            }
            if (! Schema::hasColumn('tickets', 'partner_commission_base')) {
                $table->decimal('partner_commission_base', 14, 3)->default(0)->after('partner_discount_amount');
            }
            if (! Schema::hasColumn('tickets', 'partner_commission_rate')) {
                $table->decimal('partner_commission_rate', 8, 2)->default(0)->after('partner_commission_base');
            }
            if (! Schema::hasColumn('tickets', 'partner_commission_amount')) {
                $table->decimal('partner_commission_amount', 14, 3)->default(0)->after('partner_commission_rate');
            }
            if (! Schema::hasColumn('tickets', 'partner_commission_processed_at')) {
                $table->timestamp('partner_commission_processed_at')->nullable()->after('partner_commission_amount');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tickets')) {
            return;
        }

        Schema::table('tickets', function (Blueprint $table) {
            foreach ([
                'partner_commission_processed_at',
                'partner_commission_amount',
                'partner_commission_rate',
                'partner_commission_base',
                'partner_discount_amount',
                'partner_code_snapshot',
                'partner_code_id',
                'partner_id',
            ] as $col) {
                if (Schema::hasColumn('tickets', $col)) {
                    if (in_array($col, ['partner_id', 'partner_code_id'], true)) {
                        $table->dropForeign([$col]);
                    }
                    $table->dropColumn($col);
                }
            }
        });
    }
};
