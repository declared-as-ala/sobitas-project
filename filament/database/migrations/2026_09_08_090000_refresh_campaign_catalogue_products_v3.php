<?php

use App\Support\CampaignArtwork20260908Products;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('slides')) {
            CampaignArtwork20260908Products::install();
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('slides')) {
            CampaignArtwork20260908Products::restore();
        }
    }
};
