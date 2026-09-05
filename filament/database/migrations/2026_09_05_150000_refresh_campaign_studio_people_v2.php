<?php

use App\Support\CampaignArtwork20260905Studio;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('slides')) {
            CampaignArtwork20260905Studio::install();
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('slides')) {
            CampaignArtwork20260905Studio::restore();
        }
    }
};
