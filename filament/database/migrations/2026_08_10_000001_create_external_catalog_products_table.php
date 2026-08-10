<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Staging for externally-discovered catalogue products.
 *
 * ── WHY THIS IS NOT COLUMNS ON `products` ─────────────────────────────────────────────────
 * `products` is a legacy table with no `create_products_table` migration anywhere — it was inherited
 * from a deleted application and is only ever `Schema::table`-altered. It carries NOT NULL columns
 * with no DEFAULT, which is why `App\Support\LegacyColumnDefaults` has to exist at all. It is also
 * the single table the entire business runs on.
 *
 * Bolting twenty nullable `source_*` columns onto it, to serve ~61,500 rows of which most will never
 * be sellable, is risk with no upside. Here instead:
 *
 *   · rollback is `DELETE FROM external_catalog_products` and cannot touch a real product
 *   · the normaliser can be iterated on by truncating and re-importing, at any hour
 *   · bulk writes are safe, because this table has no legacy NOT NULL landmines
 *   · "the 309 existing products do not change" becomes structural rather than a promise
 *
 * A row becomes a real product only through an explicit promotion step, which must go through the
 * Eloquent model so `Product::creating` fires. See catalog:iherb:promote.
 *
 * ── SOURCE-OWNED VS OURS ──────────────────────────────────────────────────────────────────
 * Every `source_*` column is refreshable from upstream on every sync. Everything the promoted
 * product owns — Tunisian price, stock, French copy, SEO, publication state — lives on `products`
 * and is never written by a sync. The separation is physical, not a convention someone has to
 * remember.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('external_catalog_products')) {
            return;
        }

        Schema::create('external_catalog_products', function (Blueprint $table): void {
            $table->id();

            // ── Identity at the source ────────────────────────────────────────────────────
            $table->string('provider', 20)->default('iherb');
            $table->string('external_product_id', 40);
            $table->string('external_part_number', 60)->nullable();
            $table->text('external_url')->nullable();
            // The slug from the sitemap URL. Carries the product name, which is what lets the
            // relevance prefilter run over 61,500 rows without spending a single HTTP request.
            $table->string('external_url_name', 190)->nullable();

            // ── Raw source values. Refreshable, never customer-facing as-is ───────────────
            $table->string('source_title', 500)->nullable();
            $table->string('source_brand_name', 190)->nullable();
            $table->string('source_brand_code', 12)->nullable();
            $table->string('source_root_category_id', 20)->nullable();
            $table->string('source_root_category_name', 120)->nullable();
            $table->decimal('source_list_price', 12, 2)->nullable();
            $table->decimal('source_discount_price', 12, 2)->nullable();
            $table->string('source_currency', 3)->nullable();
            /**
             * Reference only. These never become schema.org aggregateRating: that requires an
             * attested first-party purchase (frontend/src/util/structuredData.ts isAttestedPurchase),
             * and presenting another shop's ratings as ours would be the same misrepresentation as
             * inventing them.
             */
            $table->decimal('source_rating', 3, 2)->nullable();
            $table->unsignedInteger('source_rating_count')->nullable();
            $table->boolean('source_available')->default(false);
            $table->boolean('source_discontinued')->default(false);
            $table->unsignedInteger('source_primary_image_index')->nullable();
            // The hydration response, for debugging a bad normalisation without re-fetching.
            // Deliberately here and not on `products`.
            $table->json('source_payload')->nullable();

            // ── Normalised, ours ─────────────────────────────────────────────────────────
            $table->string('normalized_title', 500)->nullable();
            // Casing/accent/punctuation-folded brand name. `brands` has no slug column and matching
            // is currently `LIKE '%name%'`, so without this "Optimum Nutrition" and "optimum
            // nutrition" become two brand rows and split the brand page in half.
            $table->string('normalized_brand_key', 190)->nullable();
            $table->string('flavour', 120)->nullable();
            $table->decimal('pack_size', 10, 3)->nullable();
            $table->string('pack_unit', 20)->nullable();
            $table->decimal('computed_price', 12, 3)->nullable();

            // ── Resolved links ───────────────────────────────────────────────────────────
            $table->unsignedBigInteger('brand_id')->nullable();
            $table->unsignedBigInteger('sous_category_id')->nullable();
            // Defaults to true: a product is never guessed into a category, because the subcategory
            // is what determines the public URL (/{subcat}/{slug}).
            $table->boolean('category_mapping_required')->default(true);
            $table->unsignedTinyInteger('completeness')->default(0);

            // ── State machine. This IS the resume mechanism ───────────────────────────────
            // discovered → filtered_out | queued → hydrating → hydrated | failed → promoted
            // Work is selected by querying for a state, so a killed worker resumes by definition:
            // there is no in-memory cursor to lose.
            $table->string('status', 24)->default('discovered');
            $table->string('status_reason', 255)->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);

            // ── Promotion link. One-way, set once ────────────────────────────────────────
            $table->unsignedBigInteger('product_id')->nullable();
            $table->timestamp('promoted_at')->nullable();

            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            // Running the importer twice must not duplicate. 60 chars of utf8mb4 is well inside
            // InnoDB's index limit.
            $table->unique(['provider', 'external_product_id'], 'ecp_provider_external_unique');

            $table->index(['provider', 'status'], 'ecp_provider_status_index');
            $table->index('status', 'ecp_status_index');
            $table->index('normalized_brand_key', 'ecp_brand_key_index');
            $table->index('external_part_number', 'ecp_part_number_index');
            $table->index('product_id', 'ecp_product_id_index');
            $table->index('sous_category_id', 'ecp_sous_category_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_catalog_products');
    }
};
