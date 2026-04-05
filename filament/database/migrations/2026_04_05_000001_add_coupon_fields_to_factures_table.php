<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add coupon tracking columns to the factures (BL) table.
 *
 * WHY:  When a commande is converted to a BL, the coupon discount (discount_ht)
 *       is folded into remise. These columns preserve the coupon portion and its
 *       metadata so BL print / display can show the breakdown separately.
 *
 * INVARIANT:  factures.remise = manual_remise + discount_ht (always)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            if (! Schema::hasColumn('factures', 'discount_ht')) {
                $table->decimal('discount_ht', 15, 3)->default(0)->after('remise')
                    ->comment('Coupon discount portion included in remise');
            }
            if (! Schema::hasColumn('factures', 'coupon_code_snapshot')) {
                $table->string('coupon_code_snapshot', 64)->nullable()->after('discount_ht');
            }
            if (! Schema::hasColumn('factures', 'coupon_type_snapshot')) {
                $table->string('coupon_type_snapshot', 32)->nullable()->after('coupon_code_snapshot');
            }
            if (! Schema::hasColumn('factures', 'coupon_value_snapshot')) {
                $table->decimal('coupon_value_snapshot', 15, 3)->nullable()->after('coupon_type_snapshot');
            }
        });
    }

    public function down(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $cols = ['discount_ht', 'coupon_code_snapshot', 'coupon_type_snapshot', 'coupon_value_snapshot'];
            $existing = array_filter($cols, fn ($c) => Schema::hasColumn('factures', $c));
            if ($existing) {
                $table->dropColumn(array_values($existing));
            }
        });
    }
};
