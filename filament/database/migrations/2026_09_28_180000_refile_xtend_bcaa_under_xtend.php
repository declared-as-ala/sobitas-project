<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * XTEND BCAA 420G (#175, 61 in stock) was filed under brand 35 "SCIVATION" — XTEND's maker — while the
 * brand shoppers search and competitors rank is XTEND (#163): House Nutrition's /brand/xtend is #5 on
 * "bcaa tunisie" (Google Tunisia, 28/09/2026), and our /xtend page listed only two on-order XTEND 7G
 * flavours. Same pattern as 2026_09_28_160100_refile_misbranded_products: query builder (the Product
 * model's saving() hook recomputes stock), guarded on the exact id, slug and current brand.
 */
return new class extends Migration
{
    public function up(): void
    {
        $xtend = DB::table('brands')->where('id', 163)->value('designation_fr');
        if ($xtend === null || stripos((string) $xtend, 'xtend') === false) {
            echo "[xtend-refile] brand 163 is not XTEND — nothing moved\n";

            return;
        }

        $moved = DB::table('products')
            ->where('id', 175)
            ->where('slug', 'xtend-bcaa-420g')
            ->where('brand_id', 35)
            ->update(['brand_id' => 163, 'updated_at' => now()]);

        echo "[xtend-refile] product 175: {$moved} row(s) moved from 35 to 163\n";
    }

    public function down(): void
    {
        DB::table('products')
            ->where('id', 175)
            ->where('slug', 'xtend-bcaa-420g')
            ->where('brand_id', 163)
            ->update(['brand_id' => 35, 'updated_at' => now()]);
    }
};
