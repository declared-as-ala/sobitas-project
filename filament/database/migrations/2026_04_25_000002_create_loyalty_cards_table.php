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
            $table->foreignId('batch_id')->constrained('loyalty_card_batches')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('card_number', 30)->unique();
            $table->uuid('qr_token')->unique();
            $table->enum('status', ['available', 'active', 'lost', 'retired'])->default('available');
            $table->timestamp('printed_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('lost_at')->nullable();
            $table->timestamp('retired_at')->nullable();
            $table->unsignedBigInteger('replacement_for_card_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'client_id']);
            $table->index('client_id');
            $table->index('qr_token');
            $table->foreign('replacement_for_card_id')
                ->references('id')->on('loyalty_cards')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_cards');
    }
};
