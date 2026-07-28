<?php

use App\Models\Product;
use App\Services\Seo\ProductSeoDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Re-apply the product SEO templates, now that ProductSeoDefaults also UPGRADES the values its
 * previous version wrote.
 *
 * Migration 000004 stamped an auto-generated title + description onto 279 products. Both had
 * problems that only showed up once they existed:
 *
 *   • The title ran to ~88 characters, so Google truncated it around 60 and the geo token
 *     "Tunisie" — the exact term these pages must rank for — was never actually visible.
 *   • All 303 descriptions were byte-identical boilerplate. Repeated across a whole catalogue that
 *     gives Google nothing to tell one product page from another, and it wasted the one natural
 *     place to state the category term people search ("créatine", "mass gainer", "pré-workout").
 *
 * ProductSeoDefaults now recognises those exact legacy strings and replaces them; anything that
 * differs by even one character is treated as human-authored and left alone.
 *
 * Measured over the live catalogue before shipping:
 *   distinct descriptions  1/303  ->  303/303
 *   median title length    ~88    ->  55 characters
 *
 * saveQuietly (no ~300 IndexNow pings mid-deploy), idempotent, wrapped so it cannot break a deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        try {
            $scanned = 0;
            $updated = 0;

            Product::with(['brand:id,designation_fr', 'sousCategorie:id,designation_fr'])
                ->chunkById(200, function ($products) use (&$scanned, &$updated) {
                    foreach ($products as $product) {
                        $scanned++;
                        if (ProductSeoDefaults::apply($product)) {
                            $product->saveQuietly();
                            $updated++;
                        }
                    }
                });

            echo sprintf("[product-seo-upgrade] updated %d of %d product(s)\n", $updated, $scanned);
        } catch (\Throwable $e) {
            echo '[product-seo-upgrade] skipped: ' . $e->getMessage() . "\n";
        }
    }

    public function down(): void
    {
        // Not reversible: the previous values were the ones being corrected.
    }
};
