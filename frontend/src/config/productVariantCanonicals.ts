/**
 * Back-order FLAVOUR imports that are the same product, the same size and the same brand as a page
 * the shop already has — canonicalised to that page so Google consolidates one URL per format.
 *
 * ── WHY AN EXPLICIT LIST AND NOT A RULE ─────────────────────────────────────────────────────────
 * The PDP never trusts `products.seo_canonical_url` (the C3 fix in [slug]/[productSlug]/page.tsx:
 * legacy values pointed at /shop/… and split the sitemap from the canonical). A canonical to a
 * DIFFERENT URL is a strong statement, so each entry here was checked by hand: same line, same
 * tub format (Optimum Nutrition fills its "5 lb" tub with 2,1–2,29 kg and its "2 lb" tub with
 * 837–907 g depending on the flavour), same brand, the source is Sur commande and the target
 * answers 200 self-canonical.
 *
 * ── THE EVIDENCE (28/09/2026) ───────────────────────────────────────────────────────────────────
 * 24 indexable "Gold Standard" PDPs answered one query family. Google's result for "gold standard
 * whey prix tunisie" was our BLOG post (8.4), not the in-stock 2,27 kg PDP (379 DT, qte 63), while
 * 11 iHerb flavour imports at 587 DT and 7 at 332 DT — all Sur commande — sat beside it in the
 * listing and in the index. Six competitors rank one PDP each at ~360 DT.
 *
 * The pages stay live, indexable and orderable on request; only their canonical and their sitemap
 * entry change. Removing an entry reverts that product to a self-canonical on the next render.
 */
const GOLD_STANDARD_227 = '/whey-proteine/100-whey-gold-standard-2-27kg';
const GOLD_STANDARD_908 = '/whey-proteine/whey-gold-standard-908g';

const VARIANT_CANONICAL_PATHS: ReadonlyMap<string, string> = new Map([
  // Gold Standard 100% Whey, 2,1–2,29 kg flavour imports → the in-stock 2,27 kg.
  ['optimum-nutrition-gold-standard-100-whey-chocolate-mint-224-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-vanilla-ice-cream-226-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-strawberry-banana-227-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-rocky-road-227-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-protein-french-vanilla-creme-226-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-protein-extreme-milk-chocolate-227-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-protein-double-rich-chocolate-229-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-protein-delicious-strawberry-226-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-chocolate-malt-227-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-banana-cream-227-kg', GOLD_STANDARD_227],
  ['optimum-nutrition-gold-standard-100-whey-protein-cookies-cream-21-kg', GOLD_STANDARD_227],
  // Gold Standard 100% Whey, 837–907 g flavour imports → the 908 g page that owns "900g prix" (4.7).
  ['optimum-nutrition-gold-standard-100-whey-protein-vanilla-ice-cream-899-g', GOLD_STANDARD_908],
  ['optimum-nutrition-gold-standard-100-whey-protein-french-vanilla-creme-907-g', GOLD_STANDARD_908],
  ['optimum-nutrition-gold-standard-100-whey-protein-extreme-milk-chocolate-907-g', GOLD_STANDARD_908],
  ['optimum-nutrition-gold-standard-100-whey-protein-double-rich-chocolate-899-g', GOLD_STANDARD_908],
  ['optimum-nutrition-gold-standard-100-whey-protein-delicious-strawberry-907-g', GOLD_STANDARD_908],
  ['optimum-nutrition-gold-standard-100-whey-protein-strawberry-banana-907-g', GOLD_STANDARD_908],
  ['optimum-nutrition-gold-standard-100-whey-cookies-cream-837-g', GOLD_STANDARD_908],
]);

/** The canonical PATH for a product slug that is a declared variant of another page, else null. */
export function variantCanonicalPath(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return VARIANT_CANONICAL_PATHS.get(slug.toLowerCase()) ?? null;
}
