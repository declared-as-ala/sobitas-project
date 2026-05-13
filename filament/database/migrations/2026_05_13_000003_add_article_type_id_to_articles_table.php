<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->foreignId('article_type_id')
                ->nullable()
                ->after('blog_type')
                ->constrained('article_types')
                ->nullOnDelete();
        });

        // Back-fill article_type_id from existing blog_type string values
        if (Schema::hasColumn('articles', 'blog_type')) {
            DB::statement("
                UPDATE articles a
                INNER JOIN article_types t ON t.slug = a.blog_type
                SET a.article_type_id = t.id
                WHERE a.blog_type IS NOT NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('article_type_id');
        });
    }
};
