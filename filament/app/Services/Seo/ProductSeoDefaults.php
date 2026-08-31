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

        if (trim((string) $product->meta_title) === '' || self::isLegacyTitle($product, $withBrand)) {
            $product->meta_title = self::buildTitle($name);
            $changed = true;
        }

        if (trim((string) $product->meta_description) === '' || self::isLegacyDescription($product, $withBrand)) {
            $product->meta_description = mb_substr(self::buildDescription($name, $product), 0, 500);
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

    /**
     * Title, built to survive Google's ~60-character truncation.
     *
     * The previous template was "{name} – {brand} – Prix Tunisie & Livraison Rapide | Protéine
     * Tunisie": 88 characters for a typical product, so everything from "Prix" onwards was cut
     * off in the SERP. The geo token "Tunisie" — the exact thing these pages need to rank for —
     * was never actually visible. The suffix is now short enough to survive, and the brand is
     * dropped from the title when the name alone already fills the budget (it stays in the
     * description and in the H1 either way).
     */
    private static function buildTitle(string $name): string
    {
        $short = $name . ' – Prix Tunisie | Protein.tn';
        if (mb_strlen($short) <= 65) {
            return mb_substr($short, 0, 255);
        }

        return mb_substr($name . ' – Prix Tunisie', 0, 255);
    }

    /**
     * Description including the product's own CATEGORY.
     *
     * Every one of the 303 products previously carried a byte-identical description. Boilerplate
     * repeated across a whole catalogue gives Google nothing to distinguish one page from another,
     * and it wastes the one place we can naturally state the category term people actually search
     * ("créatine", "whey protéine", "mass gainer"). Naming the category makes each description
     * distinct AND puts the head keyword on the product page that sits under it.
     */
    private static function buildDescription(string $name, Product $product): string
    {
        $category = trim((string) ($product->sousCategorie?->designation_fr ?? ''));

        // The category clause is skipped when the name already contains the term — repeating
        // "Créatine" in "CREATINE MONOHYDRATE OSTROVIT — Créatine en Tunisie" is stuffing, not
        // information.
        $lead = $category !== '' && ! str_contains(mb_strtolower($name), mb_strtolower($category))
            ? "{$name} — {$category} en Tunisie."
            : "{$name} — en vente en Tunisie.";

        // Built from whole sentences and fitted by DROPPING trailing ones, never by cutting.
        // A hard character trim produced "… Produit 100%." — a sentence severed at its most
        // meaningless point, which looks broken in the SERP and reads as a truncated promise.
        // Short sentences on purpose: fitting works by dropping whole ones, so finer granularity
        // fills the ~155 char budget instead of leaving 30 characters unused because the next
        // clause was one word too long.
        return self::fitSentences([
            $lead,
            'Livraison 24-72h partout en Tunisie.',
            'Paiement à la livraison.',
            'Produit 100% authentique.',
        ], 155);
    }

    /**
     * Join as many leading sentences as fit within $limit. The first is always kept (trimmed on a
     * word boundary if it alone is too long), so the result is never empty.
     *
     * @param  list<string>  $sentences
     */
    private static function fitSentences(array $sentences, int $limit): string
    {
        $out = array_shift($sentences) ?? '';
        if (mb_strlen($out) > $limit) {
            $cut = mb_substr($out, 0, $limit - 1);
            $space = mb_strrpos($cut, ' ');

            return rtrim($space ? mb_substr($cut, 0, $space) : $cut, " ,.;–—") . '.';
        }

        foreach ($sentences as $sentence) {
            if (mb_strlen($out) + 1 + mb_strlen($sentence) > $limit) {
                break;
            }
            $out .= ' ' . $sentence;
        }

        return $out;
    }

    /**
     * Was this value written by the PREVIOUS version of this class rather than by a human?
     *
     * The backfill in #158 stamped an auto-generated title/description onto 279 products. Those
     * are ours to improve; anything a person typed is not. Matching the old template exactly is
     * the only honest way to tell the two apart after the fact — if it differs by a single
     * character, we treat it as authored and leave it alone.
     */
    private static function isLegacyTitle(Product $product, string $withBrand): bool
    {
        return trim((string) $product->meta_title)
            === "{$withBrand} – Prix Tunisie & Livraison Rapide | Protéine Tunisie";
    }

    private static function isLegacyDescription(Product $product, string $withBrand): bool
    {
        $current = trim((string) $product->meta_description);
        if ($current === '') {
            return false;
        }

        if ($current === "Achetez {$withBrand} en Tunisie au meilleur prix. Produit 100% authentique, livraison rapide 24-72h à Sousse, Tunis et partout en Tunisie, paiement à la livraison.") {
            return true;
        }

        /*
         * ── OUR OWN TEMPLATE, GENERATED WITHOUT THE PRODUCT NAME ────────────────────────────────
         *
         * The blanks-only rule means a bad value written by an earlier version of this class is
         * permanent: it is not blank, and the one legacy string above is the only shape that was
         * ever detected. So a defect fixed in the template stays live on every row that already
         * carried it, for as long as the catalogue exists.
         *
         * There is such a shape, and it is on the highest-impression product page on the site.
         * /omega-3/omega-3-fish-oil-240-softgel-weightworld — 3,475 impressions, position 7.4,
         * CTR 0.75% — serves:
         *
         *     "Oméga 3 en Tunisie. Livraison 24-72h partout en Tunisie. Paiement à la livraison.
         *      Produit 100% authentique."
         *
         * That is `buildDescription` output with `$lead` missing its `{$name} — ` prefix: the
         * snippet names the CATEGORY and never the product. A searcher on "omega 3 fish oil" is
         * shown a line that could belong to any of ninety products, from a page ranked seventh.
         *
         * ── WHY THIS IS SAFE TO OVERWRITE AND ADMIN COPY IS NOT ────────────────────────────────
         * Both trailing sentences are ours verbatim, and they are specific enough that hand-written
         * copy does not land on them by accident. Requiring BOTH, and requiring the description NOT
         * to open with the product's own name, identifies a row this class generated badly — not a
         * row somebody wrote. Anything a human authored fails the first test and is left alone.
         */
        $name = trim((string) $product->designation_fr);
        if ($name === '') {
            return false;
        }

        $isOwnTemplate = str_contains($current, 'Livraison 24-72h partout en Tunisie.')
            && str_contains($current, 'Produit 100% authentique.');
        if (! $isOwnTemplate) {
            return false;
        }

        // Compared on a PREFIX of the name: `fitSentences` can trim the lead on a word boundary
        // when the name alone overruns the budget, so a full-string comparison would call a
        // correctly-generated long-name description legacy and rewrite it on every save.
        $head = mb_strtolower(mb_substr($name, 0, 12));

        return ! str_starts_with(mb_strtolower($current), $head);
    }
}
