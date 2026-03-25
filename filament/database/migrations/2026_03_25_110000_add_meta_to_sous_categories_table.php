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
            if (! Schema::hasColumn('sous_categories', 'meta')) {
                $table->longText('meta')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('sous_categories')) {
            return;
        }

        Schema::table('sous_categories', function (Blueprint $table) {
            if (Schema::hasColumn('sous_categories', 'meta')) {
                $table->dropColumn('meta');
            }
        });
    }
};
