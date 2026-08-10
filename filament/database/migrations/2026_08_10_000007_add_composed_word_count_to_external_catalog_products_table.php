<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How many words the promotion step actually wrote into `products.description_fr`.
 *
 * ── WHY THIS NUMBER HAS TO BE STORED AT ALL ───────────────────────────────────────────────
 * `catalog:iherb:promote --publish` decides one thing per product that cannot be taken back once a
 * crawler has seen it: whether the page is indexable. App\Services\Catalog\ImportedProductContent
 * already returns a `word_count` computed the exact way frontend/scripts/audit-pdp-content.mjs
 * computes `bodyWords`, precisely so that decision can be made against that script's
 * MIN_NEW_PRODUCT_WORDS gate — and createProduct() read the composed copy out of that same array and
 * threw the number away. The publish step then had nothing to measure and hardcoded
 * `seo_robots_index = true` for every product, which is how three separate docblocks in this repo
 * ended up describing a `publier = 1 + seo_robots_index = 0` state that the code could not produce.
 *
 * Recomposing at publish time is not an option that costs nothing: compose() needs the brand's
 * display name and the subcategory's slug, label and parent label, i.e. the two lookups
 * CatalogIHerbPromote does per chunk during creation. Publishing a backlog wave would have to redo
 * all of it, for a number that was already computed once and cannot change unless the copy changes.
 *
 * ── WHY ON THE STAGING TABLE AND NOT ON `products` ────────────────────────────────────────
 * Four reasons, in order of how much they would cost to get wrong:
 *
 *   · `products` has no create-migration, carries NOT NULL columns with no DEFAULT, and is the one
 *     table the whole business runs on. Every column added there is a column App\Support\
 *     LegacyColumnDefaults may one day have to know about. This is import bookkeeping, and import
 *     bookkeeping has a table of its own for exactly this reason (see the create migration's
 *     "WHY THIS IS NOT COLUMNS ON `products`").
 *   · the number is a MEASUREMENT THE PIPELINE TOOK, which is what the columns beside it already
 *     are: `completeness` is the hydrator's score, `computed_price` is the promoter's price,
 *     `status_reason` is the database's own last word on the row. It belongs with them.
 *   · every reader already holds the row. The creation loop has it in `$row`; publishBacklog()
 *     selects staging rows and eager-loads their products. Nothing needs a new join.
 *   · rollback is an UPDATE on a staging table and can never touch a customer-facing product.
 *
 * ── NULLABLE, AND WHAT NULL MEANS ─────────────────────────────────────────────────────────
 * "Never measured" — a row promoted before this column existed (812 of them on production right
 * now, all sitting at publier = 0). It is deliberately NOT defaulted to 0: 0 would be a measurement
 * claiming an empty body, and the publish path treats a below-gate measurement as a reason to
 * publish noindexed. Null is the honest value, and CatalogIHerbPromote::bodyWords() handles it by
 * measuring the product's own stored `description_fr` with the same counter — so those 812 rows get
 * a real verdict rather than being held back forever by a column that had not been invented yet.
 *
 * smallint (max 65,535) rather than int: the composed bodies measure in the low hundreds of words,
 * the longest hand-written description on the site is nowhere near five figures, and the writer
 * clamps to the column's range rather than letting a pathological body become a truncation error.
 */
return new class extends Migration
{
    public function up(): void
    {
        // The create migration is guarded the same way. A fresh database runs both in order; a
        // database that already has the table gets only the column.
        if (! Schema::hasTable('external_catalog_products')) {
            return;
        }

        if (Schema::hasColumn('external_catalog_products', 'composed_word_count')) {
            return;
        }

        Schema::table('external_catalog_products', function (Blueprint $table): void {
            // Next to `computed_price`, the other value the promoter measures and writes back.
            $table->unsignedSmallInteger('composed_word_count')->nullable()->after('computed_price');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('external_catalog_products')) {
            return;
        }

        if (! Schema::hasColumn('external_catalog_products', 'composed_word_count')) {
            return;
        }

        Schema::table('external_catalog_products', function (Blueprint $table): void {
            $table->dropColumn('composed_word_count');
        });
    }
};
