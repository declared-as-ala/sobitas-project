<?php

use App\Support\LegacyColumnDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Seven new subcategories, chosen from the catalogue rather than from intuition.
 *
 * ── WHERE THESE CAME FROM ─────────────────────────────────────────────────────────────────
 * Classifying all 47,537 real iHerb product names against protein.tn's existing 41 subcategories
 * placed 13,128 and left 34,409 with nowhere to go. Tokenising those leftovers — with brands, dose
 * forms, flavours and units filtered out — ranked what the shop actually has no home for:
 *
 *     1,432  oil            probiotic  566      herb / herbs  776
 *       566  probiotic      melatonin  327      kids / baby   789
 *       412  bars           sleep      294      mushroom      302
 *
 * Each subcategory below answers one of those clusters. Nothing here was invented because it
 * sounded like a good category; every one is worth hundreds to a few thousand products, and the
 * clusters that are NOT supplements (cream 976, serum 555, butter 520, mask 314) deliberately get
 * no category — they belong to the deny list instead.
 *
 * ── WHY A MIGRATION AND NOT A SEEDER ──────────────────────────────────────────────────────
 * It has to run on deploy, exactly once, on a box nobody can reach interactively. The entrypoint
 * runs `migrate --force` on every container start, so this is the only mechanism that reliably
 * executes. Idempotent by slug, so re-running is a no-op and an existing subcategory is never
 * modified — if the owner has already renamed one of these by hand, that name wins.
 *
 * ── WHY LegacyColumnDefaults ──────────────────────────────────────────────────────────────
 * `sous_categories` is the same generation of table as `products`: no create-migration in the
 * repository, and NOT NULL columns with no DEFAULT. A bare insert of the columns we care about
 * dies with SQLSTATE[HY000] 1364 on whatever else the table demands. fill() introspects and
 * supplies those, which is precisely why it takes a table name rather than being products-only.
 *
 * ── VISIBILITY ────────────────────────────────────────────────────────────────────────────
 * These are created EMPTY. That is safe: sitemapData.ts only emits a subcategory URL once it has
 * products (`subCategorySlugsWithProducts`), so an empty subcategory is not submitted to Google
 * and cannot become a thin indexed page. They fill up when promotion runs.
 */
return new class extends Migration
{
    /** [parent category slug, subcategory slug, French label] */
    private const SUBCATEGORIES = [
        ['sante-vitalite', 'probiotiques', 'Probiotiques'],
        ['sante-vitalite', 'digestion', 'Digestion & Transit'],
        ['sante-vitalite', 'sommeil-stress', 'Sommeil & Stress'],
        ['sante-vitalite', 'immunite', 'Immunité'],
        ['sante-vitalite', 'plantes-et-herbes', 'Plantes & Herbes'],
        ['sante-vitalite', 'enfants', 'Enfants'],
        ['proteines', 'barres-proteinees', 'Barres & Snacks Protéinés'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('sous_categories') || ! Schema::hasTable('categs')) {
            return;
        }

        foreach (self::SUBCATEGORIES as [$parentSlug, $slug, $label]) {
            // Already there — by our hand or the owner's. Leave it completely alone.
            if (DB::table('sous_categories')->where('slug', $slug)->exists()) {
                continue;
            }

            $parentId = DB::table('categs')->where('slug', $parentSlug)->value('id');

            // A missing parent is not worth failing a deploy over: the other six still land, and
            // the products for this one simply stay in staging, which is the safe direction.
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
        // job, and dropping it would orphan them — and break URLs that Google may already hold.
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
