import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryPage, { generateMetadata as generateCategoryMetadata } from '@/app/category/[slug]/page';
import { PageContentClient } from '@/app/page/[slug]/PageContentClient';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import { fetchCategoryOrSubCategory, getAllBrands, getCategories, getPageBySlug, getProductsByBrand, getStorageUrl } from '@/services/api';
import { ApiError } from '@/services/http';
import { buildCanonicalUrl } from '@/util/canonical';
import { isReservedRouteSlug } from '@/util/productUrl';
import type { Brand, Page } from '@/types';

export type RootSlugPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// ISR instead of force-dynamic: category/brand/CMS pages are the primary ranking
// targets, so their HTML must be cacheable. force-dynamic + revalidate:0 forced a
// live multi-call Laravel render on EVERY crawl — a direct cause of the fleet-wide
// "needs improvement" Core Web Vitals (slow TTFB, 0 "good" URLs). 10-min ISR keeps
// content fresh enough for a catalog while serving cached HTML to bots and users.
export const revalidate = 600;

function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404;
  const maybeAxios = error as { response?: { status?: number }; status?: number };
  return maybeAxios?.response?.status === 404 || maybeAxios?.status === 404;
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

async function hasCategoryOrSubCategory(slug: string): Promise<boolean> {
  try {
    await fetchCategoryOrSubCategory(slug);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

async function findBrandBySlug(slug: string): Promise<Brand | null> {
  const brands = await getAllBrands();
  return brands.find((brand) => nameToSlug(brand.designation_fr) === slug) ?? null;
}

async function findPageBySlug(slug: string): Promise<Page | null> {
  try {
    return await getPageBySlug(slug);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

function metadataForPage(page: Page, slug: string): Metadata {
  const title = page.meta_title?.trim() || page.title || 'Page | Proteine Tunisie';
  const description =
    page.meta_description?.trim() ||
    page.excerpt?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
    `Decouvrez ${page.title} sur Proteine Tunisie`;
  const canonical = page.canonical_url?.trim() || buildCanonicalUrl(`/${encodeURIComponent(slug)}`);
  const ogImage = page.og_image ? getStorageUrl(page.og_image) : undefined;

  return {
    title: { absolute: title },
    description: description.slice(0, 155),
    keywords: page.meta_keywords || undefined,
    alternates: { canonical },
    robots: {
      index: page.robots_index ?? true,
      follow: page.robots_follow ?? true,
    },
    openGraph: {
      title: page.og_title?.trim() || title,
      description: (page.og_description?.trim() || description).slice(0, 200),
      url: canonical,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

function metadataForBrand(brand: Brand, slug: string): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  const canonical = `${baseUrl}/${slug}`;
  const title = `${brand.designation_fr} - Proteines & Complements Tunisie | Proteine Tunisie`;
  const description = `Decouvrez tous les produits ${brand.designation_fr} en Tunisie. Qualite premium, livraison rapide.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
  };
}

export async function generateMetadata({ params }: RootSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) {
    return { title: 'Proteine Tunisie' };
  }

  if (await hasCategoryOrSubCategory(cleanSlug)) {
    return generateCategoryMetadata({ params });
  }

  const brand = await findBrandBySlug(cleanSlug);
  if (brand) {
    return metadataForBrand(brand, cleanSlug);
  }

  const page = await findPageBySlug(cleanSlug);
  if (page) {
    return metadataForPage(page, cleanSlug);
  }

  return { title: 'Page introuvable | Proteine Tunisie' };
}

export default async function RootSlugPage({ params }: RootSlugPageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();

  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) {
    notFound();
  }

  if (await hasCategoryOrSubCategory(cleanSlug)) {
    return <CategoryPage params={params} />;
  }

  const brand = await findBrandBySlug(cleanSlug);
  if (brand?.id) {
    const result = await getProductsByBrand(brand.id);
    const categories = result.categories || await getCategories();
    const productsData = {
      products: result.products,
      brands: result.brands,
      categories,
    };
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'Boutique', item: `${baseUrl}/shop` },
        { '@type': 'ListItem', position: 3, name: brand.designation_fr, item: `${baseUrl}/${cleanSlug}` },
      ],
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <ShopPageClient
          productsData={productsData}
          categories={categories}
          brands={result.brands}
          initialBrand={brand.id}
        />
      </>
    );
  }

  const page = await findPageBySlug(cleanSlug);
  if (page) {
    return <PageContentClient page={page} />;
  }

  notFound();
}
