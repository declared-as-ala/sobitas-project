<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table): void {
            if (! Schema::hasColumn('pages', 'meta_title')) {
                $table->string('meta_title', 255)->nullable()->after('slug');
            }

            if (! Schema::hasColumn('pages', 'canonical_url')) {
                $table->string('canonical_url', 1024)->nullable()->after('meta_keywords');
            }

            if (! Schema::hasColumn('pages', 'robots_index')) {
                $table->boolean('robots_index')->default(true)->after('canonical_url');
            }

            if (! Schema::hasColumn('pages', 'robots_follow')) {
                $table->boolean('robots_follow')->default(true)->after('robots_index');
            }

            if (! Schema::hasColumn('pages', 'og_title')) {
                $table->string('og_title', 255)->nullable()->after('robots_follow');
            }

            if (! Schema::hasColumn('pages', 'og_description')) {
                $table->text('og_description')->nullable()->after('og_title');
            }

            if (! Schema::hasColumn('pages', 'og_image')) {
                $table->string('og_image', 1024)->nullable()->after('og_description');
            }
        });
    }

    public function down(): void
    {
        $columns = [
            'meta_title',
            'canonical_url',
            'robots_index',
            'robots_follow',
            'og_title',
            'og_description',
            'og_image',
        ];

        Schema::table('pages', function (Blueprint $table) use ($columns): void {
            foreach ($columns as $column) {
                if (Schema::hasColumn('pages', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
