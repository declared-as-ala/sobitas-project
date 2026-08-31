<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Source taxonomy → protein.tn taxonomy. Explicit, never inferred.
 *
 * ── WHY MAPPING RATHER THAN COPYING THE SOURCE TAXONOMY ───────────────────────────────────
 * iHerb's tree is built for a US marketplace with tens of thousands of SKUs across cosmetics, baby
 * care and groceries. protein.tn's tree is a Tunisian sports-nutrition shop. Copying one into the
 * other would produce customer-facing categories nobody here searches for.
 *
 * ── WHY AN UNMAPPED PRODUCT IS NEVER PROMOTED ─────────────────────────────────────────────
 * The subcategory is not decoration: the public URL is `/{sous_category.slug}/{product.slug}`
 * (frontend/src/util/productUrl.ts), and a product with no subcategory falls back to `/shop/{slug}`
 * which middleware then 301s away. Guessing a category therefore means guessing a URL, publishing
 * it, letting Google index it, and having to redirect it later. A missing mapping keeps the row in
 * staging, where it costs nothing.
 *
 * `sous_category_id` is nullable on purpose: a row with a null target records "we have SEEN this
 * source category and deliberately not mapped it", which is different from never having encountered
 * it. Discovery inserts the former automatically so the admin has a worklist.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('external_category_mappings')) {
            return;
        }

        Schema::create('external_category_mappings', function (Blueprint $table): void {
            $table->id();

            $table->string('provider', 20)->default('iherb');
            $table->string('external_category_id', 40);
            $table->string('external_category_name', 190)->nullable();

            // Null = seen but not mapped. Products under it stay in staging.
            $table->unsignedBigInteger('sous_category_id')->nullable();

            // Deliberately excluded rather than merely unmapped — e.g. cosmetics. Lets the filter
            // report "excluded on purpose" instead of "awaiting a decision".
            $table->boolean('excluded')->default(false);

            $table->unsignedInteger('product_count')->default(0);
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->unique(['provider', 'external_category_id'], 'ecm_provider_external_unique');
            $table->index('sous_category_id', 'ecm_sous_category_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_category_mappings');
    }
};
