<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sous_categories', function (Blueprint $table) {
            $table->unsignedSmallInteger('sort_order')->default(0)->after('id');
        });

        DB::statement('UPDATE sous_categories SET sort_order = id');
    }

    public function down(): void
    {
        Schema::table('sous_categories', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
