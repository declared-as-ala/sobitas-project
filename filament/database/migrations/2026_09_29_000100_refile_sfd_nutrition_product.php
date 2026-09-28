<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * "VitaMin Complex Sport+ 120 TABLETS - SFD NUTRITION" (#508, in stock) was filed under brand 21
 * "Real Pharm", so the product title builder wrote "| Real Pharm" on an SFD product (28/09/2026).
 * No SFD brand existed: create it (same convention as the Insane Labz insert in
 * 2026_09_28_160100_refile_misbranded_products) and move the product. Query builder only — the
 * Product model's saving() hook recomputes stock. Guarded on id, slug and current brand.
 */
return new class extends Migration
{
    public function up(): void
    {
        $sfd = DB::table('brands')->select('id', 'designation_fr')->get()
            ->first(fn ($b): bool => preg_match('/^\s*sfd(\s+nutrition)?\s*$/i', (string) $b->designation_fr) === 1);
        $sfdId = $sfd ? (int) $sfd->id : DB::table('brands')->insertGetId([
            'designation_fr' => 'SFD Nutrition',
            'slug' => 'sfd-nutrition',
            'match_key' => 'sfd nutrition',
            'external_code' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $moved = DB::table('products')
            ->where('id', 508)
            ->where('slug', 'vitamin-complex-sport-120-tablets-sfd-nutrition')
            ->where('brand_id', 21)
            ->update(['brand_id' => $sfdId, 'updated_at' => now()]);

        echo "[sfd-refile] brand {$sfdId}; product 508: {$moved} row(s) moved from 21\n";
    }

    public function down(): void
    {
        $sfdId = DB::table('brands')->where('slug', 'sfd-nutrition')->value('id');
        if ($sfdId !== null) {
            DB::table('products')->where('id', 508)->where('brand_id', $sfdId)->update(['brand_id' => 21, 'updated_at' => now()]);
        }
    }
};
