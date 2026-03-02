<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('number_sequences')) {
            return;
        }

        Schema::create('number_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('name', 16); // DV, BL, FA, AV
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();

            $table->unique(['name', 'year']);
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('number_sequences');
    }
};
