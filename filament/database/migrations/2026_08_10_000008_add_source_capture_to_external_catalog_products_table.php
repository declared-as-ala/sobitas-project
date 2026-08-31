<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two columns that record what the source actually sent.
 *
 * ── WHY THIS TABLE AND NOT `products` ─────────────────────────────────────────────────────
 * Same reason as 2026_08_10_000001: `products` has no create-migration, carries NOT NULL columns
 * with no DEFAULT, and is the single table the business runs on. Nothing here goes near it, so the
 * 309 hand-made products cannot be affected by this file in any way — they have no row in
 * `external_catalog_products` at all, and the storefront reads these values through that row.
 *
 * ── EVERY GUARD, DELIBERATELY ─────────────────────────────────────────────────────────────
 * hasTable, then hasColumn per column, both columns nullable, no default, no backfill, no UPDATE.
 * Re-running this migration on a database where it already ran is a no-op rather than an error, and
 * `down()` drops only what `up()` could have created.
 *
 * ── WHAT THEY ARE FOR ─────────────────────────────────────────────────────────────────────
 * `source_image_url` — the Cloudinary URL derived from partNumber + primaryImageIndex, resolved once
 *   at normalisation instead of re-derived by every caller. Still ONE image: the payload carries a
 *   primary index and no count, so a gallery would have to be guessed. See the note in
 *   CatalogIHerbPromote::coverUrl() — probing 1..n stores URLs that 404, and a broken gallery is
 *   worse than a single good cover.
 *
 * `source_unmapped_keys` — the payload keys IHerbNormalizer did NOT read, per row. The full response
 *   is already in `source_payload`, so this is an index into it rather than a second copy, and it is
 *   the only thing that will ever tell us that iHerb has started returning a description, an
 *   ingredient list or a media array. Without it, a richer payload would be discarded silently on
 *   every one of ~19,000 rows.
 *
 * Both are filled by IHerbNormalizer::normalize(), which is what
 * `php artisan catalog:iherb:hydrate --renormalize` re-runs over every stored payload — so all 955
 * hydrated rows acquire both values with ZERO HTTP requests. That command skips promoted rows on
 * purpose (it will not rewrite a title a live URL was built from), so a promoted row keeps NULL here
 * until it is re-hydrated; NULL therefore means "not measured", never "the source sent nothing".
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('external_catalog_products')) {
            return;
        }

        Schema::table('external_catalog_products', function (Blueprint $table): void {
            if (! Schema::hasColumn('external_catalog_products', 'source_image_url')) {
                // text, not string: the Cloudinary path carries the transformation segment
                // (f_auto,q_auto:eco) and iHerb has changed that scheme before.
                $table->text('source_image_url')->nullable()->after('source_primary_image_index');
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_unmapped_keys')) {
                $table->json('source_unmapped_keys')->nullable()->after('source_payload');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('external_catalog_products')) {
            return;
        }

        Schema::table('external_catalog_products', function (Blueprint $table): void {
            foreach (['source_image_url', 'source_unmapped_keys'] as $column) {
                if (Schema::hasColumn('external_catalog_products', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
