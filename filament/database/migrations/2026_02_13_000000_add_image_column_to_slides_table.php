<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('slides')) {
            Schema::table('slides', function (Blueprint $table) {
                // Check if column doesn't already exist
                if (!Schema::hasColumn('slides', 'image')) {
                    $table->string('image')->nullable()->after('id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('slides')) {
            Schema::table('slides', function (Blueprint $table) {
                if (Schema::hasColumn('slides', 'image')) {
                    $table->dropColumn('image');
                }
            });
        }
    }
};
