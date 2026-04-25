<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_library_items', function (Blueprint $table): void {
            $table->id();
            $table->string('disk', 64)->default('public');
            $table->string('path', 1024);
            $table->text('alt_text')->nullable();
            $table->string('title', 255)->nullable();
            $table->text('caption')->nullable();
            $table->text('description')->nullable();
            $table->string('meta_title', 255)->nullable();
            $table->text('meta_description')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('mime_type', 255)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();

            $table->unique(['disk', 'path']);
            $table->index('path');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_library_items');
    }
};
