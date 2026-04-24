<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('loyalty_cards')) {
            return;
        }

        Schema::create('loyalty_cards', function (Blueprint $table) {
            $table->id();
            // Use plain reference for compatibility with legacy clients table id type.
            $table->unsignedBigInteger('client_id');
            $table->string('card_number', 20)->unique();
            $table->string('qr_token', 64)->unique();
            $table->enum('status', ['active', 'suspended', 'lost'])->default('active');
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamps();

            $table->index('client_id');
            $table->index('qr_token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_cards');
    }
};
