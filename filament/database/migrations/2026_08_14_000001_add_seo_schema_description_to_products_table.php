<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add `products.seo_schema_description`, which is missing in production and is taking the whole
 * content pipeline down with it.
 *
 * ── HOW ONE ABSENT COLUMN STOPPED 10,000 PRODUCTS BEING INDEXABLE ─────────────────────────────
 * Measured through /api/catalog_health on 14/08/2026:
 *
 *     staging: 10,359 promoted rows, 5,843 with a verified barcode, 4,197 with manufacturer prose
 *     products: 253 carry a barcode, average body 118 words against a 250-word gate, 10,308 noindexed
 *
 * The data was captured and simply never arrived. `catalog:iherb:promote --recompose` copies it, and
 * it does so in one save:
 *
 *     $product->description_fr = $next;
 *     if ($writesGtin)   { $product->gtin = $gtin; }
 *     if ($writesSchema) { $product->seo_schema_description = $body['schema_description']; }
 *     $product->save();
 *
 * With the column absent that save raises `Unknown column 'seo_schema_description'`. The command
 * catches QueryException, counts the row as failed, warns, and continues — so the body and the
 * barcode were lost too, on every row that had an overview, which is precisely the set of rows the
 * pass exists to serve. The failure is caught rather than crashing, which is why it ran hourly for
 * days looking healthy.
 *
 * The three values are decoupled in the command in the same commit, so a missing column can never
 * again cost the two fields that had nothing to do with it.
 *
 * ── WHY THE COLUMN IS MISSING, AND WHY THIS MIGRATION IS SEPARATE ────────────────────────────
 * 2026_03_20_000001_add_product_content_seo_fields.php adds five columns, each behind its own
 * `hasColumn` guard, and `faq` and `nutrition_values` from that same file DO exist in production —
 * /api/catalog_health returns counts for both and null for this one. So the file ran and this branch
 * did not take effect. A guarded `Schema::table` that partially applies leaves no trace, and
 * re-running the original is not possible because Laravel records it as complete.
 *
 * Hence a new, separately-recorded migration. It is guarded the same way, so it is a no-op wherever
 * the column already exists — local, staging, and any environment that got it the first time.
 *
 * `down()` deliberately does NOT drop the column. Once promotion has written manufacturer copy into
 * it, dropping it discards content on a rollback that was only meant to undo a schema change.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table): void {
            if (! Schema::hasColumn('products', 'seo_schema_description')) {
                // text, not string: it holds the JSON-LD `description`, which is a paragraph of
                // manufacturer copy rather than a SERP-sized string.
                $table->text('seo_schema_description')->nullable();
            }
        });
    }

    public function down(): void
    {
        // Intentionally empty. See the note above: this column carries content once populated, and
        // a schema rollback must not delete it.
    }
};
