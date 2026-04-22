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
                'h1_title' => fn (Blueprint $t) => $t->string('h1_title', 255)->nullable(),
                'short_intro' => fn (Blueprint $t) => $t->longText('short_intro')->nullable(),
                'long_bottom_content' => fn (Blueprint $t) => $t->longText('long_bottom_content')->nullable(),
                'canonical_url' => fn (Blueprint $t) => $t->string('canonical_url', 512)->nullable(),
                'og_title' => fn (Blueprint $t) => $t->string('og_title', 255)->nullable(),
                'og_description' => fn (Blueprint $t) => $t->string('og_description', 500)->nullable(),
                'og_image' => fn (Blueprint $t) => $t->string('og_image', 512)->nullable(),
                'og_image_alt' => fn (Blueprint $t) => $t->string('og_image_alt', 255)->nullable(),
                'robots_index' => fn (Blueprint $t) => $t->boolean('robots_index')->default(true),
                'robots_follow' => fn (Blueprint $t) => $t->boolean('robots_follow')->default(true),
                'breadcrumb_label' => fn (Blueprint $t) => $t->string('breadcrumb_label', 255)->nullable(),
                'primary_keyword' => fn (Blueprint $t) => $t->string('primary_keyword', 255)->nullable(),
                'secondary_keywords' => fn (Blueprint $t) => $t->json('secondary_keywords')->nullable(),
                'seo_enabled' => fn (Blueprint $t) => $t->boolean('seo_enabled')->default(true),
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
                'h1_title',
                'short_intro',
                'long_bottom_content',
                'canonical_url',
                'og_title',
                'og_description',
                'og_image',
                'og_image_alt',
                'robots_index',
                'robots_follow',
                'breadcrumb_label',
                'primary_keyword',
                'secondary_keywords',
                'seo_enabled',
            ] as $col) {
                if (Schema::hasColumn('sous_categories', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
