<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One manufacturer, two brand pages: "CELLUCOR" (/cellucor, 1 product) and "C4 / Cellucor"
 * (/c4-cellucor, 17 products). Both were indexable, self-canonical and in the listings sitemap on
 * 28/09/2026, so the brand's own query had two URLs from this site to choose between — the smaller
 * one titled "CELLUCOR Tunisie : Pré-workout". The only duplicate pair among the 582 brands.
 *
 * The product moves to the brand page that carries the range; /cellucor then has no published
 * product, which drops it from the sitemap by itself (sitemapSources lists brands with products),
 * and a 301 sends its signals to /c4-cellucor. The brand row is kept, empty, so this is reversible.
 * Guarded on both exact names so a brand renamed by hand in the meantime is left alone.
 */
return new class extends Migration
{
    private const FROM = 'CELLUCOR';

    private const TO = 'C4 / Cellucor';

    public function up(): void
    {
        if (! Schema::hasTable('brands') || ! Schema::hasTable('products')) {
            return;
        }

        $from = DB::table('brands')->where('designation_fr', self::FROM)->value('id');
        $to = DB::table('brands')->where('designation_fr', self::TO)->value('id');
        if (! $from || ! $to || $from === $to) {
            echo "[cellucor-merge] brands not found as expected — skipped\n";

            return;
        }

        $moved = DB::table('products')->where('brand_id', $from)->update(['brand_id' => $to, 'updated_at' => now()]);

        $rule = 0;
        if (Schema::hasTable('redirections') && ! DB::table('redirections')->where('old_url', '/cellucor')->exists()) {
            DB::table('redirections')->insert([
                'old_url' => '/cellucor',
                'new_url' => '/c4-cellucor',
                'code' => 301,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $rule = 1;
        }

        echo "[cellucor-merge] {$moved} product(s) moved to \"".self::TO."\", {$rule} redirect rule added\n";
    }

    public function down(): void
    {
        // Not reverted automatically: which product came from CELLUCOR is not recorded once merged.
        // The brand row still exists; reassign by hand and delete the /cellucor rule if needed.
    }
};
