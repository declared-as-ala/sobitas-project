<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            if (! Schema::hasColumn('commandes', 'coupon_id')) {
                $table->foreignId('coupon_id')->nullable()->after('quotation_id')->constrained('coupons')->nullOnDelete();
            }
            if (! Schema::hasColumn('commandes', 'coupon_code_snapshot')) {
                $table->string('coupon_code_snapshot', 64)->nullable()->after('coupon_id');
            }
            if (! Schema::hasColumn('commandes', 'coupon_type_snapshot')) {
                $table->string('coupon_type_snapshot', 32)->nullable()->after('coupon_code_snapshot');
            }
            if (! Schema::hasColumn('commandes', 'coupon_value_snapshot')) {
                $table->decimal('coupon_value_snapshot', 12, 2)->nullable()->after('coupon_type_snapshot');
            }
            if (! Schema::hasColumn('commandes', 'discount_ht')) {
                $table->decimal('discount_ht', 12, 2)->default(0)->after('coupon_value_snapshot');
            }
            if (! Schema::hasColumn('commandes', 'discount_ttc')) {
                $table->decimal('discount_ttc', 12, 2)->nullable()->after('discount_ht');
            }
        });
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $columns = ['coupon_id', 'coupon_code_snapshot', 'coupon_type_snapshot', 'coupon_value_snapshot', 'discount_ht', 'discount_ttc'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('commandes', $col)) {
                    if ($col === 'coupon_id') {
                        $table->dropForeign(['coupon_id']);
                    } else {
                        $table->dropColumn($col);
                    }
                }
            }
        });
    }
};
