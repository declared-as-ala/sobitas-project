import { Metadata } from 'next';
import { getAllProducts, getCategories, getAllBrands } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildItemListSchema } from '@/util/structuredData';
import { getProductLink } from '@/util/productUrl';
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
  const totalPages = await getShopTotalPages();
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
  };
}

async function getShopTotalPages(): Promise<number> {
  try {
    const r = await getAllProducts({ perPage: 12, page: 1 });
    const total = (r as { pagination?: { total?: number } })?.pagination?.total ?? 0;
    return Math.max(1, Math.ceil(total / 12));
  } catch {
    return 1;
  }
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

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getShopData() {
  try {
    const [productsResponse, categories, brands] = await Promise.all([
      getAllProducts({ perPage: 24, page: 1 }),
      getCategories(),
      getAllBrands(),
    ]);
    const productsData = {
      products: productsResponse.products,
      brands: productsResponse.brands,
      categories: productsResponse.categories,
      pagination: productsResponse.pagination,
    };
    return { productsData, categories, brands };
  } catch (error) {
    console.error('Error fetching shop data:', error);
    return {
      productsData: { products: [], brands: [], categories: [] },
      categories: [],
      brands: [],
    };
  }
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
  const itemListSchema = products.length > 0
    ? buildItemListSchema(
        products.slice(0, 20).map((p: { designation_fr?: string }) => ({
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
