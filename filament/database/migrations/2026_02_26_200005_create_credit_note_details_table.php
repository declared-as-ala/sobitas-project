<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('credit_note_details')) {
            return;
        }

        Schema::create('credit_note_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('credit_note_id');
            $table->unsignedBigInteger('produit_id');
            $table->integer('qte')->default(1);
            $table->decimal('unit_price_ht', 14, 3)->default(0);
            $table->decimal('discount', 14, 3)->default(0);
            $table->decimal('tva_rate', 5, 2)->default(0);
            $table->decimal('total_ht', 14, 3)->default(0);
            $table->decimal('total_ttc', 14, 3)->default(0);
            $table->timestamps();

            $table->foreign('credit_note_id')->references('id')->on('credit_notes')->cascadeOnDelete();
            $table->foreign('produit_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('credit_note_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_note_details');
    }
};
