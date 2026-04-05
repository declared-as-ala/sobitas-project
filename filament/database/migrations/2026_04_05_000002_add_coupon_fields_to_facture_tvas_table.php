<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add coupon tracking columns to the facture_tvas table.
 *
 * WHY:  Coupon info flows Commande → BL (factures) → FactureTva.
 *       These columns let the invoice print/display show the coupon line
 *       separately from any manual remise.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facture_tvas', function (Blueprint $table) {
            if (! Schema::hasColumn('facture_tvas', 'discount_ht')) {
                $table->decimal('discount_ht', 15, 3)->default(0)->after('remise')
                    ->comment('Coupon discount portion included in remise');
            }
            if (! Schema::hasColumn('facture_tvas', 'coupon_code_snapshot')) {
                $table->string('coupon_code_snapshot', 64)->nullable()->after('discount_ht');
            }
            if (! Schema::hasColumn('facture_tvas', 'coupon_type_snapshot')) {
                $table->string('coupon_type_snapshot', 32)->nullable()->after('coupon_code_snapshot');
            }
            if (! Schema::hasColumn('facture_tvas', 'coupon_value_snapshot')) {
                $table->decimal('coupon_value_snapshot', 15, 3)->nullable()->after('coupon_type_snapshot');
            }
        });
    }

    public function down(): void
    {
        Schema::table('facture_tvas', function (Blueprint $table) {
            $cols = ['discount_ht', 'coupon_code_snapshot', 'coupon_type_snapshot', 'coupon_value_snapshot'];
            $existing = array_filter($cols, fn ($c) => Schema::hasColumn('facture_tvas', $c));
            if ($existing) {
                $table->dropColumn(array_values($existing));
            }
        });
    }
};
