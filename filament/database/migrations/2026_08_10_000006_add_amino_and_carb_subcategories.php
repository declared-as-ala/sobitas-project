<?php

use App\Support\LegacyColumnDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Two subcategories the FIRST PROMOTION DRY RUN asked for.
 *
 * ── WHERE THESE CAME FROM, AND WHY THAT IS DIFFERENT FROM THE LAST SEVEN ──────────────────
 * 2026_08_10_000005 added seven subcategories derived from clustering product NAMES. This pair
 * comes from something stronger: 875 rows went through the real promotion gate, 90 of them (10.3%)
 * matched no classification rule, and the report printed twelve of them by name. Two clusters in
 * that list had nowhere to go and are unambiguously sports nutrition:
 *
 *     Taurine · L-Ornithine · Tri-Amino · Amino Athlete · Amino Day   → free amino acids
 *     Carbo Gain (3.63 kg maltodextrin) · D-Ribose                    → carbohydrates
 *
 * 10.3% of the 42,034 rows still to hydrate is roughly 4,300 products that would otherwise stay
 * staged for ever. These are not categories that sounded plausible; they are categories the
 * measured backlog demanded.
 *
 * ── THE PARENT IS FOUND VIA A SIBLING, NOT NAMED ──────────────────────────────────────────
 * The previous migration hardcoded parent slugs ('sante-vitalite', 'proteines') and skipped any
 * row whose parent it could not find — safe, but silent, and it means a shop that spells its
 * categories differently gets nothing with no indication why. Here the parent is read from an
 * EXISTING sibling subcategory instead: amino acids belong wherever `bcaa` already lives, and
 * carbohydrates wherever `mass-gainers` already lives. Whatever the owner has called those parent
 * categories, and whatever their ids are, the new subcategory lands beside a sibling that is
 * demonstrably in the right place.
 *
 * A missing sibling still skips rather than fails: the classification rules simply resolve to no
 * subcategory, PromotionGate reports SUBCATEGORY_MISSING by name, and the rows stay in staging.
 * Nothing is published into a category that does not exist.
 *
 * ── VISIBILITY ────────────────────────────────────────────────────────────────────────────
 * Created EMPTY, and that is safe for the same reason as last time: sitemapData.ts only emits a
 * subcategory URL once it has products, so an empty one is never submitted to Google and cannot
 * become a thin indexed page. They fill when promotion runs.
 */
return new class extends Migration
{
    /** [sibling subcategory slug, new slug, French label] */
    private const SUBCATEGORIES = [
        ['bcaa', 'acides-amines', 'Acides Aminés'],
        ['mass-gainers', 'glucides-energie', 'Glucides & Énergie'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('sous_categories')) {
            return;
        }

        foreach (self::SUBCATEGORIES as [$siblingSlug, $slug, $label]) {
            // Already there — by our hand or the owner's. Leave it completely alone.
            if (DB::table('sous_categories')->where('slug', $slug)->exists()) {
                continue;
            }

            $parentId = DB::table('sous_categories')->where('slug', $siblingSlug)->value('categorie_id');

            if ($parentId === null) {
                continue;
            }

            $attributes = LegacyColumnDefaults::fill('sous_categories', [
                'slug' => $slug,
                'designation_fr' => $label,
                'categorie_id' => $parentId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Only columns this table really has — the shape varies between environments and a
            // missing column here would abort the whole migration.
            foreach (['sitemap_include' => 1, 'robots_index' => 1, 'seo_enabled' => 1] as $column => $value) {
                if (Schema::hasColumn('sous_categories', $column) && ! array_key_exists($column, $attributes)) {
                    $attributes[$column] = $value;
                }
            }

            DB::table('sous_categories')->insert($attributes);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('sous_categories')) {
            return;
        }

        // Only remove the ones still empty. A subcategory that has acquired products is doing its
        // job, and dropping it would orphan them — and break URLs Google may already hold.
        foreach (self::SUBCATEGORIES as [, $slug]) {
            $id = DB::table('sous_categories')->where('slug', $slug)->value('id');

            if ($id === null) {
                continue;
            }

            $inUse = DB::table('products')->where('sous_categorie_id', $id)->exists()
                || (Schema::hasTable('product_sous_category')
                    && DB::table('product_sous_category')->where('sous_category_id', $id)->exists());

            if (! $inUse) {
                DB::table('sous_categories')->where('id', $id)->delete();
            }
        }
    }
};
