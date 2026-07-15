/**
 * Internal crawler-serving route for category / subcategory / brand listings — the render
 * target of the single-segment "Feed the Crawler First" rewrite in middleware.ts.
 *
 * HOW IT FITS TOGETHER:
 *   1. A bot requests a real listing URL, e.g. /whey-isolate (category) or /biotech-usa (brand).
 *   2. middleware.ts detects the crawler UA and REWRITES (not redirects) to
 *      /x-crawler/category/whey-isolate. The bot keeps indexing the canonical /{slug}.
 *   3. This route resolves the slug the SAME way app/[slug]/page.tsx does
 *      (category → subcategory → brand → CMS page) and renders <CrawlerCategoryView>:
 *      a zero-JS, fully-SSR H1 + intro + complete product link list.
 *
 * WHY: the interactive listing (ShopPageClient) calls useSearchParams() inside <Suspense>,
 * which bails to client rendering — so the statically generated HTML crawlers receive is only
 * the skeleton (no H1, no product anchors). A dedicated route keeps its own ISR cache namespace
 * and never shows for real users.
 *
 * COMPLIANCE: canonical + robots point back at the real /{slug}; content is a parity projection
 * of the human page's first data page. Dynamic rendering, not cloaking. See util/isCrawler.ts.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  fetchCategoryOrSubCategory,
  getAllBrands,
  getProductsByBrand,
  getPageBySlug,
} from '@/services/api';
import { ApiError } from '@/services/http';
import { loadForCache } from '@/util/loadForCache';
import { getErrorStatus } from '@/util/errorStatus';
import { generateMetadata as generateCategoryMetadata } from '@/app/category/[slug]/page';
import { PageContentClient } from '@/app/page/[slug]/PageContentClient';
import { getCategorySeoContent } from '@/util/categorySeoContent';
import { mergeCategorySeo } from '@/util/resolveCategorySeo';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { isReservedRouteSlug, getProductLink } from '@/util/productUrl';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildItemListSchema, buildWebPageSchema } from '@/util/structuredData';
import { sanitizeProductHtml } from '@/util/sanitizeProductHtml';
import { CrawlerCategoryView, type CrawlerListLink } from '@/app/components/crawler/CrawlerCategoryView';
import type { Brand, Page, Product } from '@/types';

// Own ISR cache namespace, keyed by /x-crawler/category/{slug}.
export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404;
  const maybe = error as { response?: { status?: number }; status?: number };
  return maybe?.response?.status === 404 || maybe?.status === 404;
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

async function findBrandBySlug(slug: string): Promise<Brand | null> {
  try {
    const brands = await getAllBrands();
    return brands.find((b) => nameToSlug(b.designation_fr) === slug) ?? null;
  } catch (e) {
    // A transient getAllBrands failure must NOT masquerade as "brand not found" — that falls through
    // to notFound() and caches a 404 for the crawler on a live brand page. Only a genuine 404 means
    // no brands; anything else propagates (5xx render error the bot retries, never a cached 404).
    if (getErrorStatus(e) === 404) return null;
    throw e;
  }
}

async function findPageBySlug(slug: string): Promise<Page | null> {
  try {
    return await getPageBySlug(slug);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) {
    return { robots: { index: false, follow: true } };
  }
  try {
    if (await hasCategoryOrSubCategory(cleanSlug)) {
      // Reuse the human category page's metadata (same title/description, canonical → /{slug}).
      return generateCategoryMetadata({ params });
    }
    const brand = await findBrandBySlug(cleanSlug);
    if (brand) {
      const canonical = buildCanonicalUrl(`/${encodeURIComponent(cleanSlug)}`);
      const title = `${brand.designation_fr} - Protéines & Compléments Tunisie | Protéine Tunisie`;
      return {
        title: { absolute: title },
        description: `Découvrez tous les produits ${brand.designation_fr} en Tunisie. Qualité premium, livraison rapide.`,
        alternates: { canonical },
        robots: { index: true, follow: true },
      };
    }
    const page = await findPageBySlug(cleanSlug);
    if (page) {
      const canonical = page.canonical_url?.trim() || buildCanonicalUrl(`/${encodeURIComponent(cleanSlug)}`);
      const description = (page.meta_description ?? page.excerpt ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 155);
      return {
        title: { absolute: page.meta_title?.trim() || page.title || 'Page' },
        description,
        alternates: { canonical },
        robots: { index: page.robots_index ?? true, follow: page.robots_follow ?? true },
      };
    }
  } catch {
    /* fall through to noindex */
  }
  return { robots: { index: false, follow: true } };
}

function ldScript(schema: object, key: string) {
  return (
    <script
      key={key}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function CrawlerCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) notFound();

  const baseUrl = getBaseUrl();

  // 1. Category / subcategory listing
  let catResult: Awaited<ReturnType<typeof fetchCategoryOrSubCategory>> | null = null;
  try {
    catResult = await fetchCategoryOrSubCategory(cleanSlug);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  if (catResult) {
    const { type, data } = catResult;
    const isSub = type === 'subcategory';
    const entity = isSub ? (data as { sous_category?: { designation_fr?: string } }).sous_category
                         : (data as { category?: { designation_fr?: string } }).category;
    const seoJson = await getCategorySeoContent(cleanSlug);
    const merged = mergeCategorySeo(seoJson, (data as { seo?: unknown }).seo as never);
    const title = merged.h1?.trim() || entity?.designation_fr || cleanSlug;
    const introHtml = merged.intro?.trim() ? sanitizeProductHtml(merged.intro) : null;
    const products: Product[] = ((data as { products?: Product[] }).products) ?? [];
    const subCats: CrawlerListLink[] = !isSub
      ? (((data as { sous_categories?: Array<{ slug?: string; designation_fr?: string }> }).sous_categories) ?? [])
          .filter((sc) => sc?.slug && sc?.designation_fr)
          .map((sc) => ({ name: sc.designation_fr as string, url: `/${sc.slug}` }))
      : [];

    const breadcrumbs: CrawlerListLink[] = [
      { name: 'Accueil', url: '/' },
      { name: 'Boutique', url: '/shop' },
      { name: title, url: `/${cleanSlug}` },
    ];
    const productListItems = products
      .filter((p) => p && p.designation_fr)
      .map((p) => ({ name: p.designation_fr as string, url: getProductLink(p) }))
      .filter((p) => p.url && p.url !== '/shop/');

    const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbs, baseUrl);
    const collectionSchema = buildCollectionPageSchema(title, `/${cleanSlug}`, baseUrl, {
      description: merged.metaDescription?.trim() || undefined,
    });
    const itemListSchema = productListItems.length > 0
      ? buildItemListSchema(productListItems, baseUrl, { name: title })
      : null;

    return (
      <>
        {ldScript(breadcrumbSchema, 'bc')}
        {ldScript(collectionSchema, 'cp')}
        {itemListSchema && ldScript(itemListSchema, 'il')}
        <CrawlerCategoryView
          title={title}
          introHtml={introHtml}
          breadcrumbs={breadcrumbs}
          products={products}
          subCategories={subCats}
          kind={isSub ? 'subcategory' : 'category'}
        />
      </>
    );
  }

  // 2. Brand listing
  const brand = await findBrandBySlug(cleanSlug);
  if (brand?.id) {
    // loadForCache: a failed getProductsByBrand() during `next build` must not bake an empty brand
    // listing for the crawler — noStore() defers the render to runtime where the API is reachable.
    const result = await loadForCache(
      () => getProductsByBrand(brand.id),
      { products: [] as Product[] } as Awaited<ReturnType<typeof getProductsByBrand>>,
    );
    const products: Product[] = (result as { products?: Product[] }).products ?? [];
    const title = brand.designation_fr;
    const breadcrumbs: CrawlerListLink[] = [
      { name: 'Accueil', url: '/' },
      { name: 'Boutique', url: '/shop' },
      { name: title, url: `/${cleanSlug}` },
    ];
    const productListItems = products
      .filter((p) => p && p.designation_fr)
      .map((p) => ({ name: p.designation_fr as string, url: getProductLink(p) }))
      .filter((p) => p.url && p.url !== '/shop/');
    const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbs, baseUrl);
    const collectionSchema = buildCollectionPageSchema(`Produits ${title}`, `/${cleanSlug}`, baseUrl);
    const itemListSchema = productListItems.length > 0
      ? buildItemListSchema(productListItems, baseUrl, { name: title })
      : null;

    return (
      <>
        {ldScript(breadcrumbSchema, 'bc')}
        {ldScript(collectionSchema, 'cp')}
        {itemListSchema && ldScript(itemListSchema, 'il')}
        <CrawlerCategoryView
          title={title}
          breadcrumbs={breadcrumbs}
          products={products}
          kind="brand"
        />
      </>
    );
  }

  // 3. CMS page — already SSR-friendly on the real route; render the same so a rewritten bot
  //    request never 404s a valid page. Emit WebPage + Breadcrumb for parity with the human
  //    /{slug} CMS branch (both feed the crawler the same structured data).
  const page = await findPageBySlug(cleanSlug);
  if (page) {
    const canonical = page.canonical_url?.trim() || buildCanonicalUrl(`/${encodeURIComponent(cleanSlug)}`);
    const rawDesc = page.meta_description ?? page.excerpt ?? '';
    const description = rawDesc ? String(rawDesc).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : undefined;
    const webPageSchema = buildWebPageSchema(page.title || 'Page', canonical, baseUrl, { description });
    const breadcrumbSchema = buildBreadcrumbListSchema(
      [{ name: 'Accueil', url: '/' }, { name: page.title || 'Page', url: `/${page.slug || cleanSlug}` }],
      baseUrl
    );
    return (
      <>
        {ldScript(webPageSchema, 'wp')}
        {ldScript(breadcrumbSchema, 'bc')}
        <PageContentClient page={page} />
      </>
    );
  }

  notFound();
}
