<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('partners')) {
            return;
        }

        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 16); // coach | gym
            $table->string('name');
            $table->string('business_name')->nullable();
            $table->string('email');
            $table->string('phone', 64)->nullable();
            $table->text('address')->nullable();
            $table->string('avatar', 512)->nullable();
            $table->string('status', 16)->default('pending'); // pending, active, suspended, rejected
            $table->decimal('default_commission_rate', 8, 2)->default(10);
            $table->string('payment_method', 64)->nullable();
            $table->string('bank_name', 128)->nullable();
            $table->string('rib_or_iban', 128)->nullable();
            $table->text('payout_notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partners');
    }
};
