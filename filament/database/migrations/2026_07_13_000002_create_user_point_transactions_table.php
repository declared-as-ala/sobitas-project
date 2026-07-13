<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_point_transactions')) {
            return;
        }

        Schema::create('user_point_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            // commandes may be legacy — index only, no hard FK
            $table->unsignedBigInteger('commande_id')->nullable()->index();
            $table->enum('type', ['earn', 'redeem', 'adjustment', 'expiry'])->default('earn');
            $table->integer('points');
            $table->integer('balance_after')->default(0);
            $table->string('description', 255)->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['user_id', 'created_at']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_point_transactions');
    }
};
