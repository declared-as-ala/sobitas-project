<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('credit_notes')) {
            return;
        }

        Schema::create('credit_notes', function (Blueprint $table) {
            $table->id();
            // Match facture_tvas.id type: older DBs may use INT UNSIGNED (increments), so use unsignedInteger
            $table->unsignedInteger('facture_tva_id');
            $table->string('numero', 64)->unique();
            $table->decimal('total_ht', 14, 3)->default(0);
            $table->decimal('total_ttc', 14, 3)->default(0);
            $table->string('status', 32)->default('draft'); // draft, issued
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();

            $table->foreign('facture_tva_id')->references('id')->on('facture_tvas')->cascadeOnDelete();
            $table->index('facture_tva_id');
            $table->index('status');
            $table->index('issued_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_notes');
    }
};
