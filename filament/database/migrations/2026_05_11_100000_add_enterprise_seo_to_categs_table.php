<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('categs')) {
            return;
        }

        Schema::table('categs', function (Blueprint $table) {
            $cols = [
                'h1_title' => fn (Blueprint $t) => $t->string('h1_title', 255)->nullable(),
                'short_intro' => fn (Blueprint $t) => $t->longText('short_intro')->nullable(),
                'long_bottom_content' => fn (Blueprint $t) => $t->longText('long_bottom_content')->nullable(),
                'canonical_url' => fn (Blueprint $t) => $t->string('canonical_url', 512)->nullable(),
                'meta_keywords' => fn (Blueprint $t) => $t->string('meta_keywords', 500)->nullable(),
                'og_title' => fn (Blueprint $t) => $t->string('og_title', 255)->nullable(),
                'og_description' => fn (Blueprint $t) => $t->string('og_description', 500)->nullable(),
                'og_image' => fn (Blueprint $t) => $t->string('og_image', 512)->nullable(),
                'og_image_alt' => fn (Blueprint $t) => $t->string('og_image_alt', 255)->nullable(),
                'twitter_title' => fn (Blueprint $t) => $t->string('twitter_title', 255)->nullable(),
                'twitter_description' => fn (Blueprint $t) => $t->string('twitter_description', 500)->nullable(),
                'twitter_image' => fn (Blueprint $t) => $t->string('twitter_image', 512)->nullable(),
                'breadcrumb_label' => fn (Blueprint $t) => $t->string('breadcrumb_label', 255)->nullable(),
                'primary_keyword' => fn (Blueprint $t) => $t->string('primary_keyword', 255)->nullable(),
                'secondary_keywords' => fn (Blueprint $t) => $t->json('secondary_keywords')->nullable(),
                'robots_index' => fn (Blueprint $t) => $t->boolean('robots_index')->default(true),
                'robots_follow' => fn (Blueprint $t) => $t->boolean('robots_follow')->default(true),
                'seo_enabled' => fn (Blueprint $t) => $t->boolean('seo_enabled')->default(true),
                'seo_banner_desktop' => fn (Blueprint $t) => $t->string('seo_banner_desktop', 512)->nullable(),
                'seo_banner_mobile' => fn (Blueprint $t) => $t->string('seo_banner_mobile', 512)->nullable(),
                'sitemap_include' => fn (Blueprint $t) => $t->boolean('sitemap_include')->default(true),
                'sitemap_priority' => fn (Blueprint $t) => $t->decimal('sitemap_priority', 3, 2)->nullable(),
                'sitemap_changefreq' => fn (Blueprint $t) => $t->string('sitemap_changefreq', 32)->nullable(),
                'extra_json_ld' => fn (Blueprint $t) => $t->json('extra_json_ld')->nullable(),
                'related_category_slugs' => fn (Blueprint $t) => $t->json('related_category_slugs')->nullable(),
                'faq' => fn (Blueprint $t) => $t->json('faq')->nullable(),
            ];

            foreach ($cols as $name => $callback) {
                if (! Schema::hasColumn('categs', $name)) {
                    $callback($table);
                }
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('categs')) {
            return;
        }

        Schema::table('categs', function (Blueprint $table) {
            foreach ([
                'h1_title',
                'short_intro',
                'long_bottom_content',
                'canonical_url',
                'meta_keywords',
                'og_title',
                'og_description',
                'og_image',
                'og_image_alt',
                'twitter_title',
                'twitter_description',
                'twitter_image',
                'breadcrumb_label',
                'primary_keyword',
                'secondary_keywords',
                'robots_index',
                'robots_follow',
                'seo_enabled',
                'seo_banner_desktop',
                'seo_banner_mobile',
                'sitemap_include',
                'sitemap_priority',
                'sitemap_changefreq',
                'extra_json_ld',
                'related_category_slugs',
                'faq',
            ] as $col) {
                if (Schema::hasColumn('categs', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
