<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('color', 32)->nullable()->default('info');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed with existing BlogArticleType enum values so existing articles keep their type labels
        DB::table('article_types')->insert([
            ['name' => 'Compléments',  'slug' => 'complements', 'color' => 'info',    'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Lifestyle',    'slug' => 'lifestyle',   'color' => 'success', 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Nutrition',    'slug' => 'nutrition',   'color' => 'warning', 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Recettes',     'slug' => 'recettes',    'color' => 'danger',  'sort_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Sport',        'slug' => 'sport',       'color' => 'primary', 'sort_order' => 5, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('article_types');
    }
};
