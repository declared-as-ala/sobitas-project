<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('coupon_redemptions')) {
            return;
        }

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
        });

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

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
        });

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->unsignedInteger('order_id')->nullable(false)->change();
        });

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('commandes')->cascadeOnDelete();
        });
    }
};
