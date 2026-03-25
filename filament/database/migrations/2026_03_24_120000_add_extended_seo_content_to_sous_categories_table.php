<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sous_categories')) {
            return;
        }

        Schema::table('sous_categories', function (Blueprint $table) {
            if (! Schema::hasColumn('sous_categories', 'meta_title')) {
                $table->string('meta_title', 255)->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'meta_description')) {
                $table->string('meta_description', 500)->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'meta_keywords')) {
                $table->string('meta_keywords', 500)->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'description_cover')) {
                $table->string('description_cover', 500)->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'seo_schema_description')) {
                $table->text('seo_schema_description')->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'faq')) {
                $table->json('faq')->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'nutrition_values')) {
                $table->longText('nutrition_values')->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'more_details')) {
                $table->longText('more_details')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('sous_categories')) {
            return;
        }

        Schema::table('sous_categories', function (Blueprint $table) {
            foreach ([
                'meta_title',
                'meta_description',
                'meta_keywords',
                'description_cover',
                'seo_schema_description',
                'faq',
                'nutrition_values',
                'more_details',
            ] as $col) {
                if (Schema::hasColumn('sous_categories', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
