<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('blog_categories')) {
            Schema::create('blog_categories', function (Blueprint $table): void {
                $table->id();
                $table->string('name', 255);
                $table->string('slug', 255)->unique();
                $table->string('seo_title', 255)->nullable();
                $table->string('seo_description', 500)->nullable();
                $table->string('seo_canonical_url', 1024)->nullable();
                $table->boolean('seo_robots_index')->nullable();
                $table->boolean('seo_robots_follow')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('blog_tags')) {
            Schema::create('blog_tags', function (Blueprint $table): void {
                $table->id();
                $table->string('name', 255);
                $table->string('slug', 255)->unique();
                $table->string('seo_title', 255)->nullable();
                $table->string('seo_description', 500)->nullable();
                $table->string('seo_canonical_url', 1024)->nullable();
                $table->boolean('seo_robots_index')->nullable();
                $table->boolean('seo_robots_follow')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('article_blog_category')) {
            Schema::create('article_blog_category', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
                $table->foreignId('blog_category_id')->constrained('blog_categories')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['article_id', 'blog_category_id'], 'article_blog_category_unique');
            });
        }

        if (! Schema::hasTable('article_blog_tag')) {
            Schema::create('article_blog_tag', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
                $table->foreignId('blog_tag_id')->constrained('blog_tags')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['article_id', 'blog_tag_id'], 'article_blog_tag_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('article_blog_tag');
        Schema::dropIfExists('article_blog_category');
        Schema::dropIfExists('blog_tags');
        Schema::dropIfExists('blog_categories');
    }
};

