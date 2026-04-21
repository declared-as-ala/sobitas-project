<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table): void {
            if (! Schema::hasColumn('articles', 'seo_title')) {
                $table->string('seo_title', 255)->nullable()->after('meta_title');
            }
            if (! Schema::hasColumn('articles', 'seo_description')) {
                $table->string('seo_description', 500)->nullable()->after('meta_description_fr');
            }
            if (! Schema::hasColumn('articles', 'seo_excerpt')) {
                $table->text('seo_excerpt')->nullable()->after('seo_description');
            }
            if (! Schema::hasColumn('articles', 'seo_canonical_url')) {
                $table->string('seo_canonical_url', 1024)->nullable()->after('seo_excerpt');
            }
            if (! Schema::hasColumn('articles', 'seo_robots_index')) {
                $table->boolean('seo_robots_index')->nullable()->after('seo_canonical_url');
            }
            if (! Schema::hasColumn('articles', 'seo_robots_follow')) {
                $table->boolean('seo_robots_follow')->nullable()->after('seo_robots_index');
            }
            if (! Schema::hasColumn('articles', 'og_title')) {
                $table->string('og_title', 255)->nullable()->after('seo_robots_follow');
            }
            if (! Schema::hasColumn('articles', 'og_description')) {
                $table->string('og_description', 500)->nullable()->after('og_title');
            }
            if (! Schema::hasColumn('articles', 'og_image')) {
                $table->string('og_image', 1024)->nullable()->after('og_description');
            }
            if (! Schema::hasColumn('articles', 'twitter_title')) {
                $table->string('twitter_title', 255)->nullable()->after('og_image');
            }
            if (! Schema::hasColumn('articles', 'twitter_description')) {
                $table->string('twitter_description', 500)->nullable()->after('twitter_title');
            }
            if (! Schema::hasColumn('articles', 'twitter_image')) {
                $table->string('twitter_image', 1024)->nullable()->after('twitter_description');
            }
            if (! Schema::hasColumn('articles', 'twitter_card')) {
                $table->string('twitter_card', 32)->nullable()->after('twitter_image');
            }
            if (! Schema::hasColumn('articles', 'seo_author_name')) {
                $table->string('seo_author_name', 255)->nullable()->after('twitter_card');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table): void {
            foreach ([
                'seo_title',
                'seo_description',
                'seo_excerpt',
                'seo_canonical_url',
                'seo_robots_index',
                'seo_robots_follow',
                'og_title',
                'og_description',
                'og_image',
                'twitter_title',
                'twitter_description',
                'twitter_image',
                'twitter_card',
                'seo_author_name',
            ] as $column) {
                if (Schema::hasColumn('articles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

