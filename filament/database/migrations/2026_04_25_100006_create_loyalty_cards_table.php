<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
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
