<?php

namespace App\Services\Seo;

use App\Models\Product;

/**
 * The single definition of a product's default SEO fields.
 *
 * ProductSeoObserver has always filled these on save, which covers every product touched from the
 * admin, an import or the API — but ONLY on save. A catalogue audit found 279 of 303 products
 * (92%) with meta_title, meta_description and alt_cover all empty: they simply had not been
 * re-saved since the observer shipped. "Self-healing" only heals what you touch.
 *
 * The templates therefore live here, used by BOTH the observer (new/edited products) and
 * seo:backfill-product-meta (everything already in the catalogue), so the two can never drift —
 * the same duplication that has caused several bugs in this codebase already.
 *
 * Rules, unchanged from the observer:
 *   • NEVER overwrite anything already written. Blanks only.
 *   • Only factual, deterministic templates built from name / brand. No invented claims, no
 *     fabricated ratings, no promises the store does not make.
 */
class ProductSeoDefaults
{
    /**
     * Fill blank SEO fields in place. Returns true when something changed, so callers can skip
     * writing rows that need nothing.
     */
    public static function apply(Product $product): bool
    {
        $name = trim((string) $product->designation_fr);
        if ($name === '') {
            return false; // nothing factual to build from
        }

        $brand = trim((string) ($product->brand?->designation_fr ?? ''));
        $withBrand = $brand !== '' && ! str_contains(mb_strtolower($name), mb_strtolower($brand))
            ? "{$name} – {$brand}"
            : $name;

        $changed = false;

        if (trim((string) $product->meta_title) === '') {
            // Mirrors the storefront's CTR template so DB + frontend fallback agree.
            $product->meta_title = mb_substr("{$withBrand} – Prix Tunisie & Livraison Rapide | Protéine Tunisie", 0, 255);
            $changed = true;
        }

        if (trim((string) $product->meta_description) === '') {
            $product->meta_description = mb_substr(
                "Achetez {$withBrand} en Tunisie au meilleur prix. Produit 100% authentique, livraison rapide 24-72h à Sousse, Tunis et partout en Tunisie, paiement à la livraison.",
                0,
                500
            );
            $changed = true;
        }

        if (trim((string) $product->alt_cover) === '') {
            // Image alt is the strongest signal Google Images has for a product photo. Name +
            // brand + one locality token — descriptive, not stuffed. Matches buildProductAlt() on
            // the storefront, which is the fallback when this column is empty.
            $product->alt_cover = mb_substr($brand !== '' ? "{$name} — {$brand} — Tunisie" : "{$name} — Tunisie", 0, 255);
            $changed = true;
        }

        return $changed;
    }
}
