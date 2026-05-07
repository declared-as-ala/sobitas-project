<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('partner_commission_transactions')) {
            return;
        }

        Schema::create('partner_commission_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->foreignId('partner_code_id')->nullable()->constrained('coupons')->nullOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('tickets')->nullOnDelete();
            $table->string('type', 32); // commission, payout, reversal, adjustment
            $table->string('status', 32)->default('pending'); // pending, confirmed, cancelled, paid
            $table->decimal('commission_base', 14, 3)->default(0);
            $table->decimal('commission_rate', 8, 2)->default(0);
            $table->decimal('amount', 14, 3);
            $table->decimal('balance_after', 14, 3)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['partner_id', 'type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_commission_transactions');
    }
};
