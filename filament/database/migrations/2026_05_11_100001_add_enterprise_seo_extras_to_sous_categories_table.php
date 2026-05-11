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
            $cols = [
                'twitter_title' => fn (Blueprint $t) => $t->string('twitter_title', 255)->nullable(),
                'twitter_description' => fn (Blueprint $t) => $t->string('twitter_description', 500)->nullable(),
                'twitter_image' => fn (Blueprint $t) => $t->string('twitter_image', 512)->nullable(),
                'seo_tags' => fn (Blueprint $t) => $t->json('seo_tags')->nullable(),
                'seo_banner_desktop' => fn (Blueprint $t) => $t->string('seo_banner_desktop', 512)->nullable(),
                'seo_banner_mobile' => fn (Blueprint $t) => $t->string('seo_banner_mobile', 512)->nullable(),
                'sitemap_include' => fn (Blueprint $t) => $t->boolean('sitemap_include')->default(true),
                'sitemap_priority' => fn (Blueprint $t) => $t->decimal('sitemap_priority', 3, 2)->nullable(),
                'sitemap_changefreq' => fn (Blueprint $t) => $t->string('sitemap_changefreq', 32)->nullable(),
                'extra_json_ld' => fn (Blueprint $t) => $t->json('extra_json_ld')->nullable(),
                'related_category_slugs' => fn (Blueprint $t) => $t->json('related_category_slugs')->nullable(),
            ];

            foreach ($cols as $name => $callback) {
                if (! Schema::hasColumn('sous_categories', $name)) {
                    $callback($table);
                }
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
                'twitter_title',
                'twitter_description',
                'twitter_image',
                'seo_tags',
                'seo_banner_desktop',
                'seo_banner_mobile',
                'sitemap_include',
                'sitemap_priority',
                'sitemap_changefreq',
                'extra_json_ld',
                'related_category_slugs',
            ] as $col) {
                if (Schema::hasColumn('sous_categories', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
