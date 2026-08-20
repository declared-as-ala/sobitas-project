import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
} from '@/util/structuredData';
import { getProductLink } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { SHOP_PER_PAGE, buildShopUrl, isShopFiltered, type ShopQuery } from '@/util/shopQuery';

/**
 * The boutique's structured data, in ONE place, because it has to be emitted from TWO routes.
 *
 * ── GOOGLEBOT WAS GETTING NONE OF IT ────────────────────────────────────────────────────────
 * `middleware.ts` rewrites every crawler user-agent on `/shop` to `/x-crawler/shop`. That route
 * rendered `<CrawlerCategoryView>` and nothing else — no `application/ld+json` anywhere in it, and
 * no `x-crawler/layout.tsx` to inject any. Meanwhile the human route emitted BreadcrumbList,
 * CollectionPage and ItemList inline.
 *
 * So the three schemas the boutique publishes were visible to every visitor and to no search
 * engine — on the page they exist for. The crawler route's own docblock states that "divergence
 * between the two views is what makes dynamic rendering indefensible"; this was that divergence,
 * in the one direction that costs rankings rather than merely looking inconsistent.
 *
 * A shared module rather than a copied block, deliberately: two inline copies is how the h1s on
 * these same two routes drifted apart once already, and a divergence between a crawler view and a
 * human view is cloaking, not an inconsistency.
 *
 * ── TWO BUGS FIXED WHILE EXTRACTING ─────────────────────────────────────────────────────────
 * 1. The CollectionPage url was the literal '/shop' regardless of the page number, so on
 *    `/shop?page=7` the <link rel=canonical> said `?page=7` and the JSON-LD said `/shop`. Two
 *    contradictory statements about the same document, in the same <head>.
 * 2. The caller sliced products to 20 and `buildItemListSchema` sliced to 20 again, so products
 *    21-24 of every page were never listed — 1,880 products across the 470-page series, on the
 *    only listing markup they appear in.
 */
export function buildShopSchemas({
  products,
  categories,
  currentPage,
  canonicalPath,
  baseUrl,
}: {
  products: unknown[];
  categories: unknown[];
  currentPage: number;
  /** The SAME path `generateMetadata` puts in rel=canonical — see bug 1 above. */
  canonicalPath: string;
  baseUrl: string;
}): object[] {
  const breadcrumb = buildBreadcrumbListSchema(
    [
      { name: 'Accueil', url: '/' },
      { name: 'Boutique', url: '/shop' },
    ],
    baseUrl
  );

  // The page number belongs in the NAME as well as the url: two CollectionPages with identical
  // names and different urls is exactly the duplicate signal self-canonicalising pagination is
  // meant to avoid sending.
  const pageSuffix = currentPage > 1 ? ` — Page ${currentPage}` : '';
  const collection = buildCollectionPageSchema(
    `Boutique Protéines & Compléments en Tunisie${pageSuffix}`,
    canonicalPath,
    baseUrl,
    {
      description:
        'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide.',
    }
  );

  const enriched = enrichProductsWithSubcategory(
    products as never,
    categories as never
  ) as Array<{ designation_fr?: string }>;

  /*
   * No `offers` and no per-item price.
   *
   * /shop is a summary page whose items link out to PDPs that already carry full Product markup
   * with offers. Repeating price here duplicates that markup and creates a second place for it to
   * go stale against the catalogue — and a price mismatch between a listing and its product page
   * is a Merchant Center disapproval, not a cosmetic issue.
   */
  const itemList =
    enriched.length > 0
      ? buildItemListSchema(
          enriched.slice(0, SHOP_PER_PAGE).map((p) => ({
            name: p.designation_fr || 'Produit',
            url: getProductLink(p as never),
          })),
          baseUrl,
          { name: `Boutique${pageSuffix}` }
        )
      : null;

  return itemList ? [breadcrumb, collection, itemList] : [breadcrumb, collection];
}

/**
 * The canonical path for a shop query, shared by `generateMetadata`, the JSON-LD above and the
 * crawler route so the three cannot disagree.
 *
 * A FACETED view (?brand=72, ?search=whey) is a filtered slice: it carries noindex,follow and
 * points at /shop so it consolidates instead of competing. A PAGED view is not a duplicate — it
 * holds products that appear on no other URL — so it points at itself. Google retired rel=prev/next
 * in 2019 and its guidance since is that paginated pages self-canonicalise.
 */
export function shopCanonicalPath(query: ShopQuery): string {
  if (query.page > 1 && !isShopFiltered(query)) {
    return buildShopUrl({ ...query, search: '', categories: [], brands: [], flavors: [] });
  }
  return '/shop';
}
