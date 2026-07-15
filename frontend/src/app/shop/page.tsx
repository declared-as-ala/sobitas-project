import { Metadata } from 'next';
import { getAllProducts, getCategories, getAllBrands } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildItemListSchema } from '@/util/structuredData';
import { getProductLink } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { loadForCache } from '@/util/loadForCache';
import { ShopPageClient } from './ShopPageClient';

type ShopSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(props: { searchParams?: ShopSearchParams }): Promise<Metadata> {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const pageNum = Math.max(1, parseInt(String(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page || '1'), 10) || 1);
  const path = '/shop';

  // A "filtered" view = any faceting param (search/brand/category/orderby/sort…) beyond pure pagination.
  // These must NOT self-canonicalize with their query string — that is what let
  // /shop?search=WHEY%20PROTEIN, /shop?brand=9 and /shop?search={search_term_string}
  // get indexed as duplicates. Filtered views are noindex,follow and canonicalise to
  // the clean paginated URL so Google consolidates on the real listing.
  const FACET_KEYS = new Set(['search', 'brand', 'category', 'orderby', 'sort', 'min_price', 'max_price', 'filter']);
  const isFiltered = Object.keys(searchParams).some((k) => FACET_KEYS.has(k.toLowerCase()));

  // Canonical carries ONLY pagination (page>1), never facets.
  const canonicalQuery = pageNum > 1 ? `?page=${pageNum}` : undefined;
  const canonical = buildCanonicalUrl(path, canonicalQuery);
  // The backend /all_products endpoint ignores per_page and returns the WHOLE catalog with no
  // `pagination` object, so getShopTotalPages() always resolved to 1 (→ rel prev/next never emitted)
  // while downloading the entire catalog a second time per request. Drop that fetch: totalPages = 1.
  const totalPages = 1;
  const { prev, next } = getPrevNext(path, '', pageNum, totalPages);

  return {
    title: { absolute: 'Boutique Protéines & Compléments en Tunisie | Protéine Tunisie' },
    description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide. Filtrez par marque et catégorie.',
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical,
      ...(prev && { prev }),
      ...(next && { next }),
    },
    openGraph: {
      title: { absolute: 'Boutique Protéines & Compléments en Tunisie | Protéine Tunisie' },
      description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide. Filtrez par marque et catégorie.',
      type: 'website',
      url: canonical,
      images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Boutique Protéines & Compléments en Tunisie' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Boutique Protéines & Compléments en Tunisie',
      description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide.',
      images: ['/og-banner.jpg'],
    },
  };
}

function getPrevNext(path: string, search: string, page: number, totalPages: number): { prev?: string; next?: string } {
  const params = new URLSearchParams(search || '');
  const prevParams = new URLSearchParams(params);
  if (page > 1) {
    if (page === 2) prevParams.delete('page');
    else prevParams.set('page', String(page - 1));
  }
  const nextParams = new URLSearchParams(params);
  nextParams.set('page', String(page + 1));
  const prev = page > 1 ? buildCanonicalUrl(path, prevParams.toString() ? `?${prevParams.toString()}` : undefined) : undefined;
  const next = page < totalPages ? buildCanonicalUrl(path, `?${nextParams.toString()}`) : undefined;
  return { prev, next };
}

// ISR (was force-dynamic → a full whole-catalog fetch + RSC render on EVERY request; the page body
// reads no searchParams so its output is identical per visitor, and faceting/pagination run
// client-side in ShopPageClient). Caching the boutique shell and revalidating in the background
// ships it instantly. Mirrors /offres (300) and /packs (600).
export const revalidate = 300;

async function getShopData() {
  // Products are the primary content. getAllProducts rethrows on the server, so we wrap it in
  // loadForCache: a transient failure (notably the build runner getting Cloudflare-403'd) renders
  // empty but is NOT baked into the ISR cache — the route re-renders next request instead of serving
  // an empty catalog for the whole revalidate window (the PR #77 empty-bake risk). Categories/brands
  // are incidental facets — they fail soft so a hiccup on them doesn't blank the whole boutique.
  const [productsResponse, categories, brands] = await Promise.all([
    loadForCache(
      () => getAllProducts({ perPage: 24, page: 1 }),
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getAllProducts>>
    ),
    getCategories().catch(() => [] as Awaited<ReturnType<typeof getCategories>>),
    getAllBrands().catch(() => [] as Awaited<ReturnType<typeof getAllBrands>>),
  ]);
  const productsData = {
    products: productsResponse.products,
    brands: productsResponse.brands,
    categories: productsResponse.categories,
    pagination: productsResponse.pagination,
  };
  return { productsData, categories, brands };
}

export default async function ShopPage() {
  const { productsData, categories, brands } = await getShopData();
  const baseUrl = getBaseUrl();
  const products = Array.isArray(productsData.products) ? productsData.products : [];

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
      <ShopPageClient productsData={productsData} categories={categories} brands={brands} />
    </>
  );
}
