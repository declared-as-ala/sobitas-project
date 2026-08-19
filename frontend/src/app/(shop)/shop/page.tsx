import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { getShopPage, getShopFacets, getCategories, getInStockCount } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildItemListSchema } from '@/util/structuredData';
import { getProductLink } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { loadForCache } from '@/util/loadForCache';
import {
  parseShopQuery,
  isShopFiltered,
  buildShopUrl,
  SHOP_PER_PAGE,
  type RawSearchParams,
  type ShopQuery,
} from '@/util/shopQuery';
import { ShopPageClient } from './ShopPageClient';

/**
 * ── /shop NOW READS searchParams, WHICH REVERSES AN EARLIER DECISION. READ THIS BEFORE UNDOING IT ─
 *
 * This file used to carry a long note explaining that it deliberately did NOT read `searchParams`,
 * because doing so is a dynamic API: it opts the whole route out of static rendering, so
 * `revalidate = 300` never took effect and the live page answered `Cache-Control: no-store` to every
 * visitor with `cf-cache-status: DYNAMIC`. All of that was true and none of it has changed.
 *
 * What changed is what the alternative costs. Filtering in the browser requires the browser to HAVE
 * the catalogue, and getAllProductsComplete() stops at 3,000 rows:
 *
 *     10,669 published products.  3,097 reachable.  71% of the shop did not exist.
 *
 * And it was worse than a missing tail, because every facet — brand, price, flavour, availability —
 * was computed over that truncated third. The pager counted pages of a number that was already
 * wrong. Nothing 500'd; the grid looked full.
 *
 * A cacheable page that shows a third of the catalogue is not better than an uncached page that
 * shows all of it. So the trade is taken deliberately, and the cost is paid down rather than
 * ignored:
 *
 *   • The render is now 12 products, not 3,000 — the payload went from 3.35 MB to roughly 120 KB.
 *   • The data fetch is ONE API call, not a ~30-page sequential walk at ~5s a page. That walk was
 *     also competing with the sitemap crawler for the API's per-IP budget, which is how
 *     /sitemap.xml ended up in its 503 fallback.
 *   • getShopFacets() is cached for 10 minutes server-side (Laravel) so the sidebar costs one query
 *     set per ten minutes across all visitors, not one per render.
 *
 * The facet noindex rules stay where they are — `X-Robots-Tag: noindex, follow` in next.config.js,
 * matched per query key. They are evaluated per request and work regardless of how this renders.
 */

type PageProps = {
  // Next 15: searchParams is a Promise. Awaiting it is what makes the route dynamic.
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = parseShopQuery(await searchParams);

  /*
   * ── CANONICAL: SELF ON PAGED VIEWS, /shop ON FACETED ONES ──────────────────────────────────
   * These are two different situations and collapsing them is a real indexing mistake.
   *
   * A FACETED view (?brand=72, ?search=whey) is a filtered slice of the boutique. It carries
   * noindex,follow and canonicalises to /shop so it consolidates rather than competing.
   *
   * A PAGED view (?page=7) is NOT a duplicate — it holds twelve products that appear on no other
   * URL. Canonicalising ?page=7 to /shop tells Google those twelve products' listing does not
   * exist, and with 890 pages of catalogue that is the difference between a crawl path to product
   * 10,669 and no path at all. Google's own guidance since rel=prev/next was retired is that
   * paginated pages should self-canonicalise. So page N points at page N.
   */
  const isPaged = query.page > 1;
  const canonicalPath = isPaged && !isShopFiltered(query)
    ? buildShopUrl({ ...query, search: '', categories: [], brands: [], flavors: [] })
    : '/shop';
  const canonical = buildCanonicalUrl(canonicalPath);

  const suffix = isPaged ? ` — Page ${query.page}` : '';
  const title = `Boutique Protéines & Compléments en Tunisie${suffix} | Protéine Tunisie`;
  const description =
    'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide. Filtrez par marque et catégorie.';

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title: { absolute: title },
      description,
      type: 'website',
      url: canonical,
      images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Boutique Protéines & Compléments en Tunisie' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Boutique Protéines & Compléments en Tunisie${suffix}`,
      description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide.',
      images: ['/og-banner.jpg'],
    },
  };
}

/**
 * Fetch one page of the boutique plus the sidebar's description of the whole catalogue.
 *
 * Products use loadForCache for the reason it has always been used here: getShopPage rethrows on the
 * server, and a transient upstream failure (the known one is the runner getting Cloudflare-403'd)
 * must render empty WITHOUT that emptiness being cached. Facets, categories and brands are
 * incidental — they fail soft, because a sidebar missing its counts is a smaller problem than a
 * boutique with no products in it.
 */
// NOT exported: a Next App Router page module may only export the fields the framework knows
// (default, generateMetadata, revalidate, …). Any other export fails the build's route-type check.
async function getShopData(query: ShopQuery) {
  /*
   * ── unstable_cache IS WHAT PAYS FOR GOING DYNAMIC ─────────────────────────────────────────
   * Reading searchParams costs this route its ISR entry (see the note at the top). Without a data
   * cache that would mean one API call per visitor on the busiest page on the site, and — the part
   * that actually matters — no protection at all when the origin is unwell. The API has been
   * observed answering 504 on every endpoint; today's ISR page keeps serving its last good render
   * through that, and a naively dynamic page would answer with an empty boutique instead.
   *
   * Keyed on the serialised query, so /shop, /shop?page=2 and /shop?brand=72 are three entries
   * rather than one wrong one. 300s to mirror the ISR window this replaces.
   *
   * loadForCache stays OUTSIDE: it converts a throw into an empty render, and if it were inside,
   * that empty render is what would be cached — the PR #77 empty-bake, moved rather than avoided.
   * Inside, the throw propagates, unstable_cache stores nothing, and the previous good page keeps
   * being served for the rest of the window.
   */
  const cachedShopPage = unstable_cache(
    () => getShopPage(query),
    /*
     * THE PAGE SIZE IS PART OF THE KEY, and leaving it out is a bug I shipped and then measured.
     *
     * The key was `['shop-page', buildShopUrl(query)]`, which describes the QUERY but not the
     * shape of the answer. When SHOP_PER_PAGE went 12 -> 24, every cached entry still held twelve
     * rows, and Next's file-system cache handler persists these to disk — so `/shop?in_stock=1`
     * kept rendering 12 products under a pager that had been recalculated for 24, through a
     * rebuild and a restart. Nothing errored; the grid was just short, on exactly the queries a
     * visitor had already warmed.
     *
     * Any value that changes what the fetch RETURNS for a given URL has to be in the key.
     */
    ['shop-page', String(SHOP_PER_PAGE), buildShopUrl(query)],
    { revalidate: 300, tags: ['shop', 'products'] }
  );

  const [productsResponse, facets, categories, inStockCount] = await Promise.all([
    loadForCache(
      cachedShopPage,
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getShopPage>>
    ),
    getShopFacets(),
    getCategories().catch(() => [] as Awaited<ReturnType<typeof getCategories>>),
    // See getInStockCount: 133 of 11,263 products are shippable, and the availability checkbox is
    // unreadable without that number printed next to it.
    getInStockCount(),
  ]);

  /*
   * ── getAllBrands() IS GONE FROM THIS PAGE, AND IT WAS COSTING MORE THAN IT LOOKED ────────
   *
   * It supplied the sidebar's brand checkboxes, and to do that it:
   *   • made SIX sequential API calls per render, because /api/all_brands is walked 100 rows at a
   *     time and there are 589 brands — on the busiest page on the site, against the origin whose
   *     php-fpm pool ran out earlier today;
   *   • put ~100 KB in the page, because each row carries logo, alt_cover, created_at and
   *     updated_at, and a filter checkbox renders none of those.
   *
   * /api/shop_facets already had to compute `brand_counts` for the numbers beside those checkboxes,
   * so it now returns the id/name/slug alongside them. One query it was already making, no extra
   * round trip, and the list is restricted to brands that HAVE a published product — 23 of the 589
   * do not, and a filter offering a value that can only ever return zero results is a dead end the
   * shopper has to discover by clicking it.
   *
   * The Brand type declares everything except id and designation_fr optional, so this is a
   * narrowing rather than a cast: what is dropped is what was never read.
   */
  const brands = facets.brands.map((b) => ({ id: b.id, designation_fr: b.designation_fr }));

  /*
   * ── THE BRAND LIST WAS BEING SERIALISED TWICE ───────────────────────────────────────────
   *
   * Measured on the live page: `designation_fr` appeared 1,269 times in the HTML, 1,212 of them in
   * a single RSC flight chunk. 566 of those are the brand rail above — and the other 566 were the
   * SAME brands travelling again inside `facets`, because the whole facets object was handed to the
   * client and it carries `brands` for this page to derive the rail from.
   *
   * Deriving and then also shipping the source is a bug that only ever shows up on a scale: at 84
   * brands it was 5 KB nobody would notice, and at 566 it is 36 KB of pure duplicate.
   *
   * `subcategories` goes the same way and for a blunter reason — the memo that read it was dead
   * code, computed on every render and consumed by nothing (see the note where it used to live).
   *
   * The fields are emptied rather than the type loosened: ShopFacets still describes what the
   * ENDPOINT returns, which is what a future consumer needs to know. What changes is only what this
   * page forwards, and it forwards exactly what it uses — price bounds, flavours and the two count
   * maps.
   */
  const facetsForClient = { ...facets, brands: [], subcategories: [] };

  return {
    inStockCount,
    productsData: {
      products: productsResponse.products,
      brands: productsResponse.brands,
      categories: productsResponse.categories,
      pagination: productsResponse.pagination,
    },
    // facetsForClient, not facets: the brand list is already travelling as `brands` above, and
    // shipping the source it was derived from as well put 566 duplicate brand records in the page.
    facets: facetsForClient,
    categories,
    brands,
  };
}

export default async function ShopPage({ searchParams }: PageProps) {
  const query = parseShopQuery(await searchParams);
  const { productsData, facets, categories, brands, inStockCount } = await getShopData(query);

  const baseUrl = getBaseUrl();
  const products = Array.isArray(productsData.products) ? productsData.products : [];

  const total = productsData.pagination?.total ?? products.length;
  const totalPages = Math.max(1, productsData.pagination?.last_page ?? 1);
  // Clamp: ?page=99999 must not render an empty grid and claim to be page 99999.
  const currentPage = Math.min(Math.max(1, productsData.pagination?.current_page ?? query.page), totalPages);

  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Boutique', url: '/shop' }],
    baseUrl
  );
  const collectionSchema = buildCollectionPageSchema(
    'Boutique Protéines & Compléments en Tunisie',
    '/shop',
    baseUrl,
    { description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide.' }
  );
  const itemListProducts = enrichProductsWithSubcategory(products, categories);
  const itemListSchema = itemListProducts.length > 0
    ? buildItemListSchema(
        itemListProducts.slice(0, 20).map((p: { designation_fr?: string }) => ({
          name: p.designation_fr || 'Produit',
          url: getProductLink(p as never),
        })),
        baseUrl,
        { name: 'Boutique' }
      )
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <ShopPageClient
        productsData={productsData}
        categories={categories}
        brands={brands}
        serverQuery={{ ...query, page: currentPage }}
        facets={facets}
        inStockCount={inStockCount}
        serverPagination={{ total, totalPages, currentPage, perPage: SHOP_PER_PAGE }}
      />
    </>
  );
}
