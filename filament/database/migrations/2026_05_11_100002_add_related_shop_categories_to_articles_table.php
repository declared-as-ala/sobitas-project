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
            if (! Schema::hasColumn('articles', 'related_shop_category_slugs')) {
                $table->json('related_shop_category_slugs')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table) {
            if (Schema::hasColumn('articles', 'related_shop_category_slugs')) {
                $table->dropColumn('related_shop_category_slugs');
            }
        });
    }
};
