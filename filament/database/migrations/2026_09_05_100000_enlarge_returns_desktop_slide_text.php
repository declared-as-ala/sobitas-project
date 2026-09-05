<?php

use App\Support\ReturnsDesktopArtwork20260905;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('slides')) {
            ReturnsDesktopArtwork20260905::install();
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('slides')) {
            ReturnsDesktopArtwork20260905::restore();
        }
    }
};
