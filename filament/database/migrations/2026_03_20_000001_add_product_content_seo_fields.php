<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'faq')) {
                $table->json('faq')->nullable();
            }
            if (! Schema::hasColumn('products', 'nutrition_values')) {
                $table->longText('nutrition_values')->nullable();
            }
            if (! Schema::hasColumn('products', 'seo_schema_description')) {
                $table->text('seo_schema_description')->nullable();
            }
            if (! Schema::hasColumn('products', 'seo_review')) {
                $table->text('seo_review')->nullable();
            }
            if (! Schema::hasColumn('products', 'seo_aggregate_rating')) {
                $table->string('seo_aggregate_rating', 512)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            foreach (['faq', 'nutrition_values', 'seo_schema_description', 'seo_review', 'seo_aggregate_rating'] as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
