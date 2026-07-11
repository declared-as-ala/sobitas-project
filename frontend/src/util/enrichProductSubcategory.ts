import type { Product, Category, SubCategory } from '@/types';

/**
 * Why this exists: list endpoints (`/accueil`, brand, packs, offres) return products WITHOUT their
 * `sous_categorie` relation — only a `sous_categorie_id`. `buildProductUrlPath` then can't resolve
 * the canonical `/{sousCategorySlug}/{productSlug}` and falls back to `/shop/{slug}`, which the
 * middleware 301-redirects to the canonical. The result: our own homepage/brand/pack product-card
 * links AND ItemList JSON-LD point at redirecting URLs → Google's "Page with redirect" bucket and a
 * wasted crawl hop. These payloads DO ship `categories[].sous_categories[]` (id + slug), so we can
 * rebuild the missing relation client/server-side and emit canonical links directly.
 */

/** id → subcategory (with a parent `categorie` ref for breadcrumbs) across all categories. */
export function buildSubcategoryMap(categories: Category[] | undefined | null): Map<number, SubCategory> {
  const map = new Map<number, SubCategory>();
  for (const cat of categories ?? []) {
    for (const sc of cat.sous_categories ?? []) {
      if (sc?.id != null && sc?.slug) {
        map.set(Number(sc.id), {
          ...sc,
          categorie: sc.categorie ?? ({ id: cat.id, slug: cat.slug, designation_fr: cat.designation_fr } as SubCategory['categorie']),
        });
      }
    }
  }
  return map;
}

/**
 * Attach the resolved `sous_categorie` to products that only carry `sous_categorie_id`, so
 * `getProductPrimarySubCategory` / `buildProductUrlPath` yield the canonical `/{subcat}/{slug}`.
 * Products that already carry a subcategory are returned untouched. Safe no-op if the map is empty.
 */
export function enrichProductsWithSubcategory(
  products: Product[] | undefined | null,
  categories: Category[] | undefined | null
): Product[] {
  const list = Array.isArray(products) ? products : [];
  if (list.length === 0) return list;
  const map = buildSubcategoryMap(categories);
  if (map.size === 0) return list;
  return list.map((p) => {
    const hasSub = (p?.sous_categories && p.sous_categories.length > 0) || p?.sous_categorie;
    if (hasSub) return p;
    const scId = (p as { sous_categorie_id?: number | null }).sous_categorie_id;
    const sc = scId != null ? map.get(Number(scId)) : undefined;
    return sc ? { ...p, sous_categorie: sc } : p;
  });
}
