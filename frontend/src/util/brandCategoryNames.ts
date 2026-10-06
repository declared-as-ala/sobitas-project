import type { Product } from '@/types';
import { taxonomyFamilyLabel, taxonomyNode } from '@/config/catalogTaxonomy';
import { canonicalCategoryPath } from '@/util/resolveCategorySeo';
import { isInStock } from '@/util/cartStock';
import { getEffectivePrice } from '@/util/productPrice';

/**
 * A brand's product families, read off its own listing.
 *
 * ── WHY TAXONOMY LABELS, NOT THE API NAME ────────────────────────────────────────────────────
 * The listing's `sous_categorie.designation_fr` is the back-office label, and it went straight
 * into the brand <title>, H1 and description: « SCITEC NUTRITION Tunisie : Mineraux », « YAVA
 * LABS Tunisie : Eaa, Glucides, Glutamine » (live, 05/10/2026). catalogTaxonomy.ts is the
 * declared authority for every category name a link or heading uses (« Minéraux », « EAA »), so
 * the family NAME comes from taxonomyFamilyLabel() and only falls back to the API label for a slug
 * the taxonomy does not declare. A theme node names its products, not its theme: /collagene is
 * « Collagène » here, not the nav's « Articulations & bien-être » (catalogTaxonomy `familyLabel`). The URL goes through canonicalCategoryPath, so a redirecting slug
 * (`Intra-Workout`, `proteine-whey`) is counted under — and linked to — the page that serves it.
 *
 * A product is counted ONCE per family even when its single and many-to-many sub-categories
 * repeat the same slug.
 *
 * A DUPLICATE SHELF IS NOT A FAMILY. `glucides-energie` is /glucides twice over: noindex, linked
 * only from its twin, labelled « Glucides & énergie (ancien) » for the back office. Counting it
 * put that label and a link to a noindex URL in the family index of /raw-nutrition,
 * /douglas-laboratories and /prohealth-longevity. Nodes with `duplicateOf` are skipped here; the
 * products stay in the brand's grid.
 */
export type BrandFamily = {
  slug: string;
  name: string;
  url: string;
  count: number;
  inStock: number;
  priceMin: number | null;
};

export function getBrandFamilies(products: Product[]): BrandFamily[] {
  const families = new Map<string, { slug: string; fallback: string; count: number; inStock: number; prices: number[] }>();

  for (const product of Array.isArray(products) ? products : []) {
    if (!product) continue;
    const stocked = isInStock(product);
    const price = stocked ? Number(getEffectivePrice(product)) : NaN;
    const seen = new Set<string>();
    for (const category of [product.sous_categorie, ...(product.sous_categories ?? [])]) {
      const rawSlug = String(category?.slug ?? '').trim().toLowerCase();
      if (!rawSlug) continue;
      const url = canonicalCategoryPath(rawSlug);
      const slug = url.slice(1);
      if (!slug || seen.has(slug)) continue;
      if (taxonomyNode(slug)?.duplicateOf) continue;
      seen.add(slug);

      let family = families.get(slug);
      if (!family) {
        family = { slug, fallback: String(category?.designation_fr ?? '').replace(/\s+/g, ' ').trim(), count: 0, inStock: 0, prices: [] };
        families.set(slug, family);
      }
      family.count += 1;
      if (stocked) {
        family.inStock += 1;
        if (Number.isFinite(price) && price > 0) family.prices.push(price);
      }
    }
  }

  return [...families.values()]
    .map(({ slug, fallback, count, inStock, prices }) => ({
      slug,
      name: taxonomyFamilyLabel(slug, fallback || slug),
      url: `/${slug}`,
      count,
      inStock,
      priceMin: prices.length ? Math.round(Math.min(...prices)) : null,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
}

/**
 * The family ONE product row names and links to — BrandInStockTable's « Famille » cell. Same rules
 * as getBrandFamilies (canonical path, taxonomyFamilyLabel), except that a duplicate shelf is
 * resolved to its twin instead of skipped: the row must still say what the product is, and
 * `glucides-energie` IS /glucides. Linking the raw slug would print « Glucides & énergie (ancien) »
 * → the noindex twin on any brand page the day one of its 26 products is restocked (06/10/2026).
 */
export function brandFamilyLink(
  category: { slug?: string | null; designation_fr?: string | null } | null | undefined
): { url: string; name: string } | null {
  const rawSlug = String(category?.slug ?? '').trim().toLowerCase();
  if (!rawSlug) return null;
  const slug = canonicalCategoryPath(rawSlug).slice(1);
  if (!slug) return null;
  const twin = taxonomyNode(slug)?.duplicateOf;
  if (twin) {
    const twinSlug = canonicalCategoryPath(twin).slice(1) || twin;
    return { url: `/${twinSlug}`, name: taxonomyFamilyLabel(twinSlug, twinSlug) };
  }
  const fallback = String(category?.designation_fr ?? '').replace(/\s+/g, ' ').trim();
  return { url: `/${slug}`, name: taxonomyFamilyLabel(slug, fallback || slug) };
}

/** Brand family names, most products first — taxonomy-cased (« Minéraux », « EAA »). */
export function getBrandCategoryNames(products: Product[]): string[] {
  return getBrandFamilies(products).map((family) => family.name);
}
