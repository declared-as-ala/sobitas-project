<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ensures all backend article columns exist in the filament DB.
 * Backend source of truth: sobitas_db_2026.sql → articles table.
 *
 * Columns guaranteed by backend:
 *   designation_fr, cover, description, publier, slug,
 *   alt_cover, description_cover, meta_description_fr,
 *   meta, meta_title, content_seo, review, aggregateRating
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table) {
            // Core content — backend uses 'description', not 'description_fr'
            if (! Schema::hasColumn('articles', 'description')) {
                $table->text('description')->nullable()->after('cover');
            }

            // Image SEO fields
            if (! Schema::hasColumn('articles', 'alt_cover')) {
                $table->string('alt_cover', 255)->nullable();
            }
            if (! Schema::hasColumn('articles', 'description_cover')) {
                $table->string('description_cover', 255)->nullable();
            }

            // SEO fields
            if (! Schema::hasColumn('articles', 'meta_description_fr')) {
                $table->text('meta_description_fr')->nullable();
            }
            if (! Schema::hasColumn('articles', 'meta')) {
                $table->text('meta')->nullable();
            }
            if (! Schema::hasColumn('articles', 'content_seo')) {
                $table->text('content_seo')->nullable();
            }
            if (! Schema::hasColumn('articles', 'review')) {
                $table->text('review')->nullable();
            }
            if (! Schema::hasColumn('articles', 'aggregateRating')) {
                $table->string('aggregateRating', 500)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table) {
            foreach (['alt_cover', 'description_cover', 'meta_description_fr', 'meta', 'content_seo', 'review', 'aggregateRating'] as $col) {
                if (Schema::hasColumn('articles', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
