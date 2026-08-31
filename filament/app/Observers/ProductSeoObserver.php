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
     * After an SEO-relevant change (or first publish), refresh the product page and the sitemap, and
     * — only when the URL is genuinely indexable — submit it to IndexNow. Gated by wasChanged so a
     * plain stock tick doesn't storm; drafts never fire.
     * (Invoice/BL stock writes use query-builder decrement — no model event — so they don't reach here.)
     *
     * ── WHY `seo_robots_index` IS IN THE CHANGE LIST ──────────────────────────────────────────
     * It was not, and that made the noindex→indexable transition the one SEO-relevant change on a
     * product that notified nobody. Flipping that flag adds the URL to the sitemap and removes
     * `<meta robots="noindex">` from the page — i.e. it is the exact moment a page becomes worth
     * crawling — and until the next unrelated save the storefront kept serving the cached noindex
     * HTML and the sitemap kept its stale cached copy for up to an hour. That transition is what
     * `catalog:iherb:reindex` performs in bulk, so it had to start firing before that command could
     * mean anything.
     *
     * The reverse transition matters too and is handled by the same line: going indexable→noindex
     * must bust the sitemap so the URL drops out promptly, which it now does.
     *
     * The gate is still `publier`, and deliberately: an unpublished product is not on the storefront
     * at all, so there is nothing to revalidate and nothing to submit. What must NOT be gated here is
     * indexability — a published-but-noindexed product still needs its page revalidated when its
     * price or stock changes. That distinction lives in SeoNotifier::shouldSubmitToIndexNow(), which
     * suppresses the submission alone.
     */
    public function saved(Product $product): void
    {
        $relevant = $product->wasRecentlyCreated
            || $product->wasChanged([
                'prix', 'promo', 'qte', 'rupture', 'force_out_of_stock', 'publier', 'slug',
                'designation_fr', 'seo_robots_index',
            ]);
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
