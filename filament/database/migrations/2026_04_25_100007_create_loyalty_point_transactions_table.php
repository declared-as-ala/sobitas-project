<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_point_transactions', function (Blueprint $table) {
            $table->id();
            // Use plain reference for compatibility with legacy clients table id type.
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('order_id')->nullable();
            $table->enum('type', ['earn', 'redeem', 'reversal', 'adjustment']);
            $table->integer('points');
            $table->decimal('monetary_value', 10, 3)->nullable()
                ->comment('DT equivalent of the points transaction.');
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            // Keep legacy order reference nullable/indexed without FK constraint to avoid
            // type-mismatch failures on existing production schemas.

            $table->index(['client_id', 'type']);
            $table->index(['order_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_point_transactions');
    }
};
