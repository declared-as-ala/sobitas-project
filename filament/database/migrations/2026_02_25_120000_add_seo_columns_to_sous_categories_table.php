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
            if (! Schema::hasColumn('sous_categories', 'description_fr')) {
                $table->text('description_fr')->nullable()->after('slug');
            }
            if (! Schema::hasColumn('sous_categories', 'alt_cover')) {
                $table->string('alt_cover', 255)->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'review_seo')) {
                $table->string('review_seo', 255)->nullable();
            }
            if (! Schema::hasColumn('sous_categories', 'aggregate_rating_seo')) {
                $table->string('aggregate_rating_seo', 255)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('sous_categories')) {
            return;
        }

        Schema::table('sous_categories', function (Blueprint $table) {
            $columns = ['description_fr', 'alt_cover', 'review_seo', 'aggregate_rating_seo'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('sous_categories', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
