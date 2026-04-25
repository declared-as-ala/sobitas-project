<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_card_batches', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->nullable();
            $table->string('prefix', 10)->default('SOBITAS');
            $table->unsignedInteger('start_number')->default(1);
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->unsignedTinyInteger('padding')->default(6);
            $table->unsignedSmallInteger('generated_count')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('prefix');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_card_batches');
    }
};
