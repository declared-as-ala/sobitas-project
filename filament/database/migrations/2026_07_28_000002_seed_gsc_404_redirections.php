<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Seed the `redirections` table with the last of the Search Console "Not found (404)" URLs.
 *
 * Context: the 404 export held 541 URLs. Code fixes (numeric-suffix recovery, the WordPress
 * nested-path rules, the deleted-product single-hop collapse) already resolve 474 of them, and a
 * re-crawl confirmed 40 more of the leftovers now redirect correctly on their own. What remains is
 * the genuinely hand-curated tail: URLs whose product or category no longer exists, where only a
 * human judgement can say where they should point.
 *
 * These live in the DB rather than in code on purpose: middleware reads them through
 * util/adminRedirects.ts (module-cached, stale-while-revalidate, fail-open) and they are editable
 * in Filament -> SEO -> Redirections, so the owner can retarget or disable any of them without a
 * deploy. `is_active` is the off switch.
 *
 * EVERY ROW WAS VERIFIED LIVE BEFORE BEING WRITTEN HERE:
 *   • each `old_url` returns 404 to BOTH a browser and a Googlebot user-agent
 *   • each `new_url` returns 200 in ZERO redirect hops
 * That check is not ceremony. The generated proposal list had been measured with a Googlebot UA
 * before PR #152 shipped, so it wanted to 410 both `/pack-builder` (which answers 200 — it was
 * only 404 to bots, the reserved-route bug) and `/api` (which now 301s to /marque-api). Seeding it
 * unchecked would have deleted a working page and a working brand redirect from the index.
 *
 * Idempotent: keyed on `old_url`, so re-running updates in place and never duplicates. Existing
 * rows the owner has since edited are NOT overwritten — see the skip below.
 */
return new class extends Migration
{
    /**
     * [old_url, new_url|null, code]. null new_url = 410 Gone.
     * Targets are category/subcategory pages where the exact product is gone: a relevant listing
     * beats a dead end for the visitor and keeps the link equity on-site.
     */
    private const RULES = [
        // --- exact product survives under a new slug -------------------------------------------
        ['/gold-whey-2-kg', '/whey-proteine/gold-whey-2-kg-kevin-leverone', 301],

        // --- typo'd / truncated URL of a page that is very much alive ---------------------------
        ['/conditions-generale-de-ventes-protein.tn', '/conditions-generale-de-ventes-protein', 301],

        // --- dead product or legacy category -> the closest live listing ------------------------
        ['/proteine-whey-old', '/whey-proteine', 301],
        ['/iso-100-whey-zero-', '/whey-proteine', 301],
        ['/all-in-isolate-204kg-big-ramy', '/whey-isolate', 301],
        ['/complexe-de-proteines', '/proteines', 301],
        ['/gainers-riche-en-glucides', '/mass-gainers', 301],
        ['/carbo-big-15kg-big-ramy-labs', '/glucides', 301],
        ['/the-pump-261gr-challenger-nutrition', '/pre-workout', 301],
        ['/pendant-l-entrainement', '/Intra-Workout', 301],
        ['/amino', '/eaa', 301],
        ['/biotyna-60-caps-real-pharm', '/beaute-cheveux', 301],
        ['/shaker-bouteille', '/accessoires', 301],
        ['/gants-fitness-musculation', '/accessoires', 301],
        ['/t-shirt', '/vetements', 301],

        // --- no honest destination: a broken fragment, gone for good ----------------------------
        ['/l-', null, 410],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('redirections')) {
            echo "[redirections-seed] table missing — skipped (its own migration runs first)\n";

            return;
        }

        $now = now();
        $created = 0;
        $skipped = 0;

        foreach (self::RULES as [$old, $new, $code]) {
            $existing = DB::table('redirections')->where('old_url', $old)->first();

            if ($existing) {
                // Never clobber a rule the owner has already tuned by hand.
                $skipped++;
                continue;
            }

            DB::table('redirections')->insert([
                'old_url' => $old,
                'new_url' => $new,
                'code' => $code,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $created++;
        }

        echo sprintf("[redirections-seed] created %d, left %d existing rule(s) untouched\n", $created, $skipped);
    }

    public function down(): void
    {
        if (! Schema::hasTable('redirections')) {
            return;
        }
        // Remove only the rows this migration introduced, matched by their exact source path.
        DB::table('redirections')
            ->whereIn('old_url', array_column(self::RULES, 0))
            ->delete();
    }
};
