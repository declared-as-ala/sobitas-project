<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('site_navigation_items')) {
            return;
        }

        foreach (['navbar', 'sidebar'] as $location) {
            $exists = DB::table('site_navigation_items')
                ->where('location', $location)
                ->where(function ($query): void {
                    $query
                        ->where('url', '/shop')
                        ->orWhere('label', 'NOS PRODUITS')
                        ->orWhere('label', 'Nos Produits');
                })
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('site_navigation_items')
                ->where('location', $location)
                ->where('sort_order', '>=', 2)
                ->increment('sort_order');

            DB::table('site_navigation_items')->insert([
                'location' => $location,
                'label' => 'NOS PRODUITS',
                'url' => '/shop',
                'icon' => 'shopping-bag',
                'is_visible' => true,
                'sort_order' => 2,
                'opens_new_tab' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Keep navigation rows intact because admins can edit them after this migration runs.
    }
};
