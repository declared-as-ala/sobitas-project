<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\Seo\ProductSeoDefaults;

/**
 * Self-healing SEO: whenever a product is created or edited (admin, import, API — any path that
 * saves the model), empty SEO fields are auto-filled from factual product data. This is the
 * "keeps ranking automatically" layer: no product can ship without a meta title, meta description
 * and image alt, and GSC "missing description / missing image alt" issues can't regrow.
 *
 * Rules:
 * - NEVER overwrites anything an admin wrote — only fills blanks.
 * - Only factual, deterministic templates (name / brand / category / delivery facts). No invented
 *   claims, no fabricated ratings.
 */
class ProductSeoObserver
{
    public function saving(Product $product): void
    {
        // Templates live in ProductSeoDefaults so this observer and seo:backfill-product-meta
        // cannot drift apart — the backfill exists because this hook only ever fired for products
        // someone happened to save (92% of the catalogue had never been touched).
        ProductSeoDefaults::apply($product);
    }

    /**
     * After an SEO-relevant change (or first publish), ping IndexNow + refresh the product page and
     * the sitemap. Gated by wasChanged so a plain stock tick doesn't storm; drafts never fire.
     * (Invoice/BL stock writes use query-builder decrement — no model event — so they don't reach here.)
     */
    public function saved(Product $product): void
    {
        $relevant = $product->wasRecentlyCreated
            || $product->wasChanged(['prix', 'promo', 'qte', 'rupture', 'force_out_of_stock', 'publier', 'slug', 'designation_fr']);
        if (! $relevant || ! $product->publier) {
            return;
        }
        app(\App\Services\Seo\SeoNotifier::class)->productChanged($product);
    }

    /**
     * On delete, submit the (now-gone) URL for recrawl + refresh the sitemap so it drops out fast.
     */
    public function deleted(Product $product): void
    {
        app(\App\Services\Seo\SeoNotifier::class)->productChanged($product);
    }
}
