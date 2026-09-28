<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Point the old addresses of RENAMED products at the product, not at its category.
 *
 * Owner, 28/09/2026, with Search Console open on
 * /whey-proteine/whey-regime-ultra-pure-whey-protein-blend-221kg-william-bonac:
 * *"google isn't indexing my products that I really sell and really have in stock."*
 *
 * That product is live, published, indexable and in stock (qte 96) — at
 * /whey-proteine/whey-regime-2kg-william-bonac. Tidying its name in the product form regenerated the
 * slug, nothing remembered the old one, and the middleware's unknown-slug fallback 301'd the old
 * address to the /whey-proteine LISTING. Google treats a redirect to an irrelevant page as a soft
 * 404 ("Page avec redirection"), so the product's crawl history was discarded.
 *
 * App\Services\Seo\ProductUrlHistory now records every future rename automatically. This migration
 * is the backlog: renames that happened before it existed.
 *
 * ── HOW THE LIST WAS BUILT (not guessed) ───────────────────────────────────────────────────────
 *   1. Every product-shaped path in the repo's saved Search Console exports and audits (3,163),
 *      minus the 11,378 live product URLs in the sitemap → 1,768 dead addresses.
 *   2. A strict token matcher proposed 32 dead → live pairs (brand tail must match, most of both
 *      names shared, clear margin over the runner-up).
 *   3. Each pair was fetched with a Googlebot UA on 28/09/2026. 22 were numeric-suffix URLs that
 *      already 308 to the right product, and one was already in RESLUGGED_PRODUCT_SLUGS — dropped.
 *      The 10 that still 308'd to a CATEGORY are the bug; 9 are below.
 *   4. Every target was re-fetched: 200, zero hops, `index, follow`.
 *
 * Rejected on purpose: /mass-gainers/hard-mass-gainer-7kg. The best match was "MASS GAINER 7KG -
 * WARRIORS", and nothing proves that is the same product. A wrong-product redirect is worse than the
 * category fallback it would replace.
 *
 * Caught by step 4, not by the matcher: /mass-gainers/serious-mass-5-45-kg- matched the 2.7 kg
 * Serious Mass, but the 5.45 kg one is live as `serious-mass-5-45-kg-optimum-nutrition` — a rename
 * (brand appended), mapped to that instead.
 *
 * Idempotent and conservative, like 2026_07_28_000002: keyed on `old_url`, and a rule the owner has
 * already written by hand for the same address is left untouched.
 */
return new class extends Migration
{
    /** [old_url, new_url] — all 301. */
    private const RULES = [
        // --- same product, renamed -------------------------------------------------------------
        ['/whey-proteine/whey-regime-ultra-pure-whey-protein-blend-221kg-william-bonac', '/whey-proteine/whey-regime-2kg-william-bonac'],
        ['/mass-gainers/serious-mass-5-45-kg-', '/mass-gainers/serious-mass-5-45-kg-optimum-nutrition'],
        ['/vitamines/swanson-swanson-vitamins-beet-root-complex-60-gelules-vegetales', '/vitamines/swanson-vitamins-beet-root-complex-60-gelules-vegetales'],
        ['/vitamines/swanson-vitamines-dgl-180-chewable-tablets', '/vitamines/swanson-vitamins-dgl-180-chewable-tablets'],
        ['/vitamines/swanson-vitamines-dim-complex-30-gelules', '/vitamines/swanson-vitamins-dim-complex-30-gelules'],
        ['/vitamines/swanson-vitamines-pregnenolone-high-potency-60-gelules', '/vitamines/swanson-vitamins-pregnenolone-high-potency-60-gelules'],
        ['/vitamines/swanson-vitamins-sulforaphane-from-brocoli-sprout-extract-60-gelules-veganes', '/vitamines/swanson-vitamins-sulforaphane-from-broccoli-sprout-extract-60-gelules-veganes'],

        // --- the old pack size no longer exists in the catalogue; same product, the size we sell ---
        ['/creatine/creatine-monohydrate-300gr-hx-nutrition', '/creatine/creatine-monohydrate-500gr-hx-nutrition'],
        ['/vitamines/vegan-vitamin-d3-k2-240-tablets-weightworld', '/vitamines/vegan-vitamin-d3-k2-365-tablets-weightworld'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('redirections')) {
            echo "[renamed-product-redirects] table missing — skipped\n";

            return;
        }

        $now = now();
        $created = 0;
        $skipped = 0;

        foreach (self::RULES as [$old, $new]) {
            if (DB::table('redirections')->where('old_url', $old)->exists()) {
                $skipped++;
                continue;
            }

            DB::table('redirections')->insert([
                'old_url' => $old,
                'new_url' => $new,
                'code' => 301,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $created++;
        }

        echo sprintf("[renamed-product-redirects] created %d, left %d existing rule(s) untouched\n", $created, $skipped);
    }

    public function down(): void
    {
        if (! Schema::hasTable('redirections')) {
            return;
        }

        DB::table('redirections')->whereIn('old_url', array_column(self::RULES, 0))->delete();
    }
};
