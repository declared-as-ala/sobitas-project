<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_commission_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('promo_code_id')->nullable();
            $table->enum('type', ['commission', 'payout', 'reversal', 'adjustment']);
            $table->decimal('amount', 10, 3);
            $table->decimal('balance_after', 10, 3)->nullable()
                ->comment('Running balance snapshot after this transaction.');
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'paid'])->default('pending');
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('commandes')->nullOnDelete();
            $table->foreign('promo_code_id')->references('id')->on('coupons')->nullOnDelete();

            $table->index(['partner_id', 'type', 'status']);
            $table->index(['order_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_commission_transactions');
    }
};
