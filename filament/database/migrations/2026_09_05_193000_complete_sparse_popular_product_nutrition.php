<?php

use App\Support\PopularProductNutrition20260905;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'nutrition_facts')) {
            PopularProductNutrition20260905::install();
        }
    }

    public function down(): void
    {
        // Nutrition facts are durable catalogue content and are intentionally retained.
    }
};
