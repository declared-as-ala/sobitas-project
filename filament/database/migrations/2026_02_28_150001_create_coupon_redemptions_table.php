<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('coupon_redemptions')) {
            return;
        }
        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained('coupons')->cascadeOnDelete();
            // Match commandes.id type: legacy DBs often use INT UNSIGNED (increments), not bigInteger
            $table->unsignedInteger('order_id');
            $table->unsignedBigInteger('client_id')->nullable();
            $table->string('phone_snapshot', 64)->nullable();
            $table->string('email_snapshot', 255)->nullable();
            $table->decimal('discount_amount_ht', 12, 2)->default(0);
            $table->decimal('discount_amount_ttc', 12, 2)->nullable();
            $table->timestamps();
        });

        Schema::table('coupon_redemptions', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('commandes')->cascadeOnDelete();
            $table->index('coupon_id');
            $table->index('order_id');
            $table->index('client_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_redemptions');
    }
};
