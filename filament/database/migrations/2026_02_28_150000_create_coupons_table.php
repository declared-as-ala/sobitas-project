<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('type', 32)->default('percent'); // percent | fixed | free_shipping
            $table->decimal('value', 12, 2)->default(0);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->decimal('min_order_amount', 12, 2)->nullable();
            $table->decimal('max_discount_amount', 12, 2)->nullable();
            $table->unsignedInteger('usage_limit_total')->nullable();
            $table->unsignedInteger('usage_limit_per_client')->nullable();
            $table->string('applies_to', 32)->default('order');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::table('coupons', function (Blueprint $table) {
            $table->index(['code'], 'coupons_code_index');
            $table->index(['is_active', 'starts_at', 'ends_at'], 'coupons_validity_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
