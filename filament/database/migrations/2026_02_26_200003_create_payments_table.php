<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments')) {
            return;
        }

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            // Match facture_tvas.id type (older DBs may use INT UNSIGNED)
            $table->unsignedInteger('facture_tva_id')->nullable();
            $table->unsignedBigInteger('commande_id')->nullable();
            $table->string('method', 32); // COD, Stripe, PayPal
            $table->decimal('amount', 14, 3)->default(0);
            $table->string('currency', 3)->default('TND');
            $table->string('status', 32)->default('pending'); // pending, succeeded, failed, refunded
            $table->string('provider_ref', 255)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('facture_tva_id')->references('id')->on('facture_tvas')->nullOnDelete();
            $table->foreign('commande_id')->references('id')->on('commandes')->nullOnDelete();
            $table->index('facture_tva_id');
            $table->index('commande_id');
            $table->index('status');
            $table->index('paid_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
