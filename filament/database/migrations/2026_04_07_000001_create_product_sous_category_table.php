<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Make migration idempotent for environments where the table already exists.
        if (! Schema::hasTable('product_sous_category')) {
            Schema::create('product_sous_category', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
                $table->foreignId('sous_category_id')->constrained('sous_categories')->onDelete('cascade');
                $table->unique(['product_id', 'sous_category_id']);
                $table->timestamps();
            });
        }

        // Migrate existing single sous_categorie_id to the pivot table
        if (Schema::hasColumn('products', 'sous_categorie_id')) {
            DB::table('products')
                ->select('id', 'sous_categorie_id')
                ->whereNotNull('sous_categorie_id')
                ->where('sous_categorie_id', '>', 0)
                ->chunkById(100, function ($products) {
                    $inserts = [];
                    foreach ($products as $product) {
                        $inserts[] = [
                            'product_id' => $product->id,
                            'sous_category_id' => $product->sous_categorie_id,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                    if (! empty($inserts)) {
                        DB::table('product_sous_category')->insertOrIgnore($inserts);
                    }
                }, 'id');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_sous_category');
    }
};
