<?php

use App\Support\CampaignArtwork20260903;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('slides')) {
            CampaignArtwork20260903::install();
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('slides')) {
            CampaignArtwork20260903::restore();
        }
    }
};
