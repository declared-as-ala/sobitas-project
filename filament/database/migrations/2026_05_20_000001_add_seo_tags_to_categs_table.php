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

        Schema::table('categs', function (Blueprint $table): void {
            if (! Schema::hasColumn('categs', 'seo_tags')) {
                $table->json('seo_tags')->nullable()->after('secondary_keywords');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('categs') || ! Schema::hasColumn('categs', 'seo_tags')) {
            return;
        }

        Schema::table('categs', function (Blueprint $table): void {
            $table->dropColumn('seo_tags');
        });
    }
};
