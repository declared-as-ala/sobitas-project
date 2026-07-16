<?php

namespace App\Observers;

use App\Models\Product;

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
        $name = trim((string) $product->designation_fr);
        if ($name === '') {
            return; // nothing factual to build from
        }

        $brand = trim((string) ($product->brand?->designation_fr ?? ''));
        $withBrand = $brand !== '' && ! str_contains(mb_strtolower($name), mb_strtolower($brand))
            ? "{$name} – {$brand}"
            : $name;

        if (trim((string) $product->meta_title) === '') {
            // Mirrors the storefront's CTR template so DB + frontend fallback agree.
            $product->meta_title = mb_substr("{$withBrand} – Prix Tunisie & Livraison Rapide | Protéine Tunisie", 0, 255);
        }

        if (trim((string) $product->meta_description) === '') {
            $product->meta_description = mb_substr(
                "Achetez {$withBrand} en Tunisie au meilleur prix. Produit 100% authentique, livraison rapide 24-72h à Sousse, Tunis et partout en Tunisie, paiement à la livraison.",
                0,
                500
            );
        }

        if (trim((string) $product->alt_cover) === '') {
            // Image alt for Google Images: name + brand + locality, no keyword stuffing.
            $product->alt_cover = mb_substr($brand !== '' ? "{$name} — {$brand} — Tunisie" : "{$name} — Tunisie", 0, 255);
        }
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
