<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table) {
            if (! Schema::hasColumn('articles', 'blog_type')) {
                $table->string('blog_type', 32)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table) {
            if (Schema::hasColumn('articles', 'blog_type')) {
                $table->dropColumn('blog_type');
            }
        });
    }
};
