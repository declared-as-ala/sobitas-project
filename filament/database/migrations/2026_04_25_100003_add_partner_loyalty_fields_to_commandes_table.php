<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            // Partner affiliate fields
            $table->unsignedBigInteger('partner_id')->nullable()->after('coupon_id');
            $table->decimal('commission_base', 10, 3)->nullable()->after('partner_id')
                ->comment('Subtotal after discount, excl. delivery — basis for commission calc.');
            $table->decimal('estimated_commission', 10, 3)->nullable()->after('commission_base');

            // Loyalty points fields
            $table->unsignedInteger('loyalty_points_redeemed')->default(0)->after('estimated_commission');
            $table->decimal('loyalty_discount', 10, 3)->default(0.000)->after('loyalty_points_redeemed');
            $table->unsignedInteger('loyalty_points_earned')->default(0)->after('loyalty_discount');

            $table->foreign('partner_id')->references('id')->on('partners')->nullOnDelete();
            $table->index('partner_id');
        });
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->dropForeign(['partner_id']);
            $table->dropIndex(['partner_id']);
            $table->dropColumn([
                'partner_id', 'commission_base', 'estimated_commission',
                'loyalty_points_redeemed', 'loyalty_discount', 'loyalty_points_earned',
            ]);
        });
    }
};
