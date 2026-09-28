<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Three redirect rules seeded on 28/07 (2026_07_28_000002) send a product slug to a CATEGORY, on the
 * belief that the product was gone. It is not: each product is live today, in stock or orderable,
 * at the address below (verified in the product sitemaps, 28/09/2026). Product → category is a soft
 * 404 to Google, so the old address never passed anything to the page it named.
 *
 * Retargeted only where the rule still holds the value that migration wrote — a rule the owner has
 * since edited by hand is left alone.
 */
return new class extends Migration
{
    /** [old_url, seeded new_url, live product] */
    private const RULES = [
        ['/all-in-isolate-204kg-big-ramy', '/whey-isolate', '/whey-isolate/all-in-isolate-204kg-big-ramy'],
        ['/carbo-big-15kg-big-ramy-labs', '/glucides', '/glucides/carbo-big-15kg-big-ramy-labs'],
        ['/biotyna-60-caps-real-pharm', '/beaute-cheveux', '/beaute-cheveux/biotyna-60-caps-real-pharm'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('redirections')) {
            return;
        }

        $changed = 0;
        foreach (self::RULES as [$old, $seeded, $live]) {
            $changed += DB::table('redirections')
                ->where('old_url', $old)
                ->where('new_url', $seeded)
                ->update(['new_url' => $live, 'code' => 301, 'updated_at' => now()]);
        }

        echo "[retarget-admin-redirects] {$changed} rule(s) now point at the live product\n";
    }

    public function down(): void
    {
        if (! Schema::hasTable('redirections')) {
            return;
        }

        foreach (self::RULES as [$old, $seeded, $live]) {
            DB::table('redirections')->where('old_url', $old)->where('new_url', $live)->update(['new_url' => $seeded]);
        }
    }
};
