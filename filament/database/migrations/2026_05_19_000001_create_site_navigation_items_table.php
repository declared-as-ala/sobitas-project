<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('site_navigation_items')) {
            Schema::create('site_navigation_items', function (Blueprint $table): void {
                $table->id();
                $table->string('location', 32)->index();
                $table->string('label', 255);
                $table->string('url', 1024);
                $table->string('icon', 80)->nullable();
                $table->boolean('is_visible')->default(true)->index();
                $table->unsignedInteger('sort_order')->default(0)->index();
                $table->boolean('opens_new_tab')->default(false);
                $table->timestamps();

                $table->index(['location', 'is_visible', 'sort_order'], 'site_nav_location_visible_order_idx');
            });
        }

        if (Schema::hasTable('site_navigation_items') && DB::table('site_navigation_items')->count() === 0) {
            $now = now();
            $items = [
                ['location' => 'navbar', 'label' => 'ACCUEIL', 'url' => '/', 'icon' => 'home', 'sort_order' => 1],
                ['location' => 'navbar', 'label' => 'PACKS', 'url' => '/packs', 'icon' => 'package', 'sort_order' => 2],
                ['location' => 'navbar', 'label' => 'MARQUES', 'url' => '/brands', 'icon' => 'store', 'sort_order' => 3],
                ['location' => 'navbar', 'label' => 'BLOG', 'url' => '/blog', 'icon' => 'newspaper', 'sort_order' => 4],
                ['location' => 'navbar', 'label' => 'CONTACT', 'url' => '/contact', 'icon' => 'mail', 'sort_order' => 5],
                ['location' => 'navbar', 'label' => 'QUI SOMMES NOUS', 'url' => '/qui-sommes-nous', 'icon' => 'info', 'sort_order' => 6],
                ['location' => 'sidebar', 'label' => 'ACCUEIL', 'url' => '/', 'icon' => 'home', 'sort_order' => 1],
                ['location' => 'sidebar', 'label' => 'PACKS', 'url' => '/packs', 'icon' => 'package', 'sort_order' => 2],
                ['location' => 'sidebar', 'label' => 'MARQUES', 'url' => '/brands', 'icon' => 'store', 'sort_order' => 3],
                ['location' => 'sidebar', 'label' => 'BLOG', 'url' => '/blog', 'icon' => 'newspaper', 'sort_order' => 4],
                ['location' => 'sidebar', 'label' => 'CONTACT', 'url' => '/contact', 'icon' => 'mail', 'sort_order' => 5],
                ['location' => 'sidebar', 'label' => 'QUI SOMMES NOUS', 'url' => '/qui-sommes-nous', 'icon' => 'info', 'sort_order' => 6],
            ];

            DB::table('site_navigation_items')->insert(array_map(
                fn (array $item): array => $item + [
                    'is_visible' => true,
                    'opens_new_tab' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                $items
            ));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('site_navigation_items');
    }
};
