<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('review_images')) {
            return;
        }

        Schema::create('review_images', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('review_id')->index();
            $table->string('path');
            $table->string('mime', 32)->default('image/webp');
            $table->unsignedInteger('size_bytes')->default(0);
            $table->unsignedSmallInteger('width')->nullable();
            $table->unsignedSmallInteger('height')->nullable();
            $table->unsignedTinyInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['review_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_images');
    }
};
