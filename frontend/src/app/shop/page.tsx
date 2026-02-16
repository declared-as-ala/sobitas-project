import { Metadata } from 'next';
import { getAllProducts, getCategories, getAllBrands } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { ShopPageClient } from './ShopPageClient';

type ShopSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(props: { searchParams?: ShopSearchParams }): Promise<Metadata> {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const pageNum = Math.max(1, parseInt(String(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page || '1'), 10) || 1);
  const search = stripTrackingFromSearch(searchParams);
  const path = '/shop';
  const canonical = buildCanonicalUrl(path, search ? `?${search}` : undefined);
  const totalPages = await getShopTotalPages();
  const { prev, next } = getPrevNext(path, search, pageNum, totalPages);

  return {
    title: 'Boutique Protéines & Compléments Alimentaires Tunisie | SOBITAS',
    description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide. Filtrez par marque et catégorie.',
    alternates: {
      canonical,
      ...(prev && { prev }),
      ...(next && { next }),
    },
  };
}

function stripTrackingFromSearch(searchParams: Record<string, string | string[] | undefined>): string {
  const p = new URLSearchParams();
  const skip = /^(utm_[a-z_]*|fbclid|gclid|srsltid|msclkid|mc_[a-z_]*|ref|source)$/i;
  Object.entries(searchParams).forEach(([key, value]) => {
    if (skip.test(key)) return;
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && v !== '') p.set(key, v);
  });
  return p.toString();
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

  return <ShopPageClient productsData={productsData} categories={categories} brands={brands} />;
}
