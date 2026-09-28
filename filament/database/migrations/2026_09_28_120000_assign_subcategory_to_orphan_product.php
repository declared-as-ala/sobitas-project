<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The one published product with no subcategory answered HTTP 500 on every address.
 *
 * Measured 28/09/2026 with Googlebot and Chrome UAs: /eaa/beef-aminos-200-tabs 308 →
 * /shop/beef-aminos-200-tabs → 500 (twice, ~0.4 s). The product (id 122, Universal Beef Aminos,
 * published, seo_robots_index on) has `sous_categorie_id = null`, so no canonical
 * /{subcategory}/{slug} exists and the subcategory-less fallback route fails to render. A 5xx on a
 * published product also pulls the site's crawl rate down.
 *
 * It lived under /eaa before (that is the address Google still has), and an amino-acid tablet
 * belongs there. Guarded: only if the product is still orphaned and the EAA subcategory exists, so
 * a manual fix made in the meantime is never overwritten.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasTable('sous_categories')) {
            return;
        }

        $eaa = DB::table('sous_categories')->whereRaw('LOWER(slug) = ?', ['eaa'])->value('id');
        if (! $eaa) {
            echo "[orphan-product] EAA subcategory not found — skipped\n";

            return;
        }

        $n = DB::table('products')
            ->where('id', 122)
            ->where('slug', 'beef-aminos-200-tabs')
            ->whereNull('sous_categorie_id')
            ->update(['sous_categorie_id' => $eaa, 'updated_at' => now()]);

        echo "[orphan-product] {$n} product(s) given the EAA subcategory\n";
    }

    public function down(): void
    {
        // Deliberately not reverted: returning the product to "no subcategory" restores the 500.
    }
};
