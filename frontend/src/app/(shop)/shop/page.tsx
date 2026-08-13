import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { getShopPage, getShopFacets, getCategories, getAllBrands } from '@/services/api';
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
    ['shop-page', buildShopUrl(query)],
    { revalidate: 300, tags: ['shop', 'products'] }
  );

  const [productsResponse, facets, categories, brands] = await Promise.all([
    loadForCache(
      cachedShopPage,
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getShopPage>>
    ),
    getShopFacets(),
    getCategories().catch(() => [] as Awaited<ReturnType<typeof getCategories>>),
    getAllBrands().catch(() => [] as Awaited<ReturnType<typeof getAllBrands>>),
  ]);

  return {
    productsData: {
      products: productsResponse.products,
      brands: productsResponse.brands,
      categories: productsResponse.categories,
      pagination: productsResponse.pagination,
    },
    facets,
    categories,
    brands,
  };
}

export default async function ShopPage({ searchParams }: PageProps) {
  const query = parseShopQuery(await searchParams);
  const { productsData, facets, categories, brands } = await getShopData(query);

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
        serverPagination={{ total, totalPages, currentPage, perPage: SHOP_PER_PAGE }}
      />
    </>
  );
}
