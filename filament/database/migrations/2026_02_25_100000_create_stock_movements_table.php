<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('stock_movements')) {
            return;
        }

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('movement_type', 50); // entry, exit, adjustment, reservation, release, sale, cancellation, return
            $table->integer('qty_before')->default(0);
            $table->integer('qty_change'); // positive = entry, negative = exit
            $table->integer('qty_after')->default(0);
            $table->string('reason', 100)->nullable(); // purchase, manual_correction, damaged, expired, inventory_count, order_shipped, order_canceled, return
            $table->string('reference_type', 80)->nullable(); // order, purchase_order, inventory_count, admin_manual
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['movement_type', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
