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
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import { getProductsByBrand } from '@/services/api';
// Request-scoped cache. A single bot request used to resolve the same category up to THREE times
// (hasCategoryOrSubCategory here, generateCategoryMetadata's own fetch, then the page body) and
// look up brands/CMS pages twice — all separate HTTP calls against the shared per-IP bucket,
// and all able to fail independently of one another.
import {
  getCachedCategoryOrSubCategory as fetchCategoryOrSubCategory,
  getCachedAllBrands as getAllBrands,
  getCachedPageBySlug as getPageBySlug,
  getCachedProductsByBrand,
} from '@/services/getCachedProductDetails';
import { ApiError } from '@/services/http';
import { loadForCache } from '@/util/loadForCache';
import { getErrorStatus } from '@/util/errorStatus';
import { retiredSlugDestination } from '@/util/retiredSlug';
import {
  generateMetadata as generateCategoryMetadata,
  loadListingPage,
} from '@/app/(shop)/category/[slug]/page';
import { PageContentClient } from '@/app/(shop)/page/[slug]/PageContentClient';
import { getCategorySeoContent } from '@/util/categorySeoContent';
import { mergeCategorySeo } from '@/util/resolveCategorySeo';
import { buildCanonicalUrl, getBaseUrl, resolveCanonicalUrl } from '@/util/canonical';
import { isReservedRouteSlug, getProductLink } from '@/util/productUrl';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildFAQPageSchemaFromQA, buildItemListSchema, buildWebPageSchema } from '@/util/structuredData';
import { sanitizeProductHtml } from '@/util/sanitizeProductHtml';
import { CrawlerCategoryView, type CrawlerListLink } from '@/app/components/crawler/CrawlerCategoryView';
import type { Brand, Page, Product } from '@/types';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';
import { buildBrandMetaTitle, buildBrandMetaDescription } from '@/util/brandMeta';
import { buildBrandIntroHtml } from '@/util/brandIntro';
import { buildShopUrl, parseShopQuery, type RawSearchParams } from '@/util/shopQuery';

// Own ISR cache namespace, keyed by /x-crawler/category/{slug}.
export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<RawSearchParams>;
};

function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404;
  const maybe = error as { response?: { status?: number }; status?: number };
  return maybe?.response?.status === 404 || maybe?.status === 404;
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

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) {
    return { robots: { index: false, follow: true } };
  }
  try {
    if (await hasCategoryOrSubCategory(cleanSlug)) {
      // Reuse the human category page's metadata (same title/description, canonical → /{slug}).
      return generateCategoryMetadata({ params, searchParams });
    }
    const brand = await findBrandBySlug(cleanSlug);
    if (brand) {
      const canonical = buildCanonicalUrl(`/${encodeURIComponent(cleanSlug)}`);
      // Shared with the human /{slug} route: same URL must not have two different titles.
      const title = buildBrandMetaTitle(brand.designation_fr);

      /**
       * A brand with NO products is a heading, a breadcrumb and nothing to buy. Google reads that
       * as a soft 404, and asking it to index one is asking for a thin-content signal against the
       * whole site. 13 of 55 brands are currently in that state (API, MYPROTEIN, MONSTER,
       * MUTANT, BSN…). They are already out of the sitemap; this stops the ones Google has
       * already discovered from staying indexed.
       *
       * Self-correcting and deliberately not a redirect or a 404: the page still resolves for
       * anyone who follows a link, and the day the brand gets its first product it becomes
       * indexable again with no intervention. Cached fetch, so this costs no extra API call.
       */
      let brandProductCount = 0;
      try {
        const listing = await getCachedProductsByBrand(brand.id);
        brandProductCount = (listing?.products ?? []).length;
      } catch {
        // Never let a transient listing failure flip a healthy brand to noindex — assume it has
        // products and stay indexable. A wrong noindex is far more expensive than a wrong index.
        brandProductCount = 1;
      }

      return {
        title: { absolute: title },
        description: buildBrandMetaDescription(brand.designation_fr),
        alternates: { canonical },
        robots: { index: brandProductCount > 0, follow: true },
      };
    }
    const page = await findPageBySlug(cleanSlug);
    if (page) {
      // Bots are rewritten here by middleware, so this route — NOT the human /{slug} route — is what
      // Googlebot's canonical actually comes from. Emitting page.canonical_url raw is why 4 CMS pages
      // told Google that sobitas.tn owns their content while a browser saw the correct self canonical.
      const canonical = await resolveCanonicalUrl(page.canonical_url, `/${encodeURIComponent(cleanSlug)}`);
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
  } catch (e) {
    unstable_rethrow(e);
    // hasCategoryOrSubCategory / findBrandBySlug / findPageBySlug above already convert a GENUINE
    // 404 into false/null, so anything landing here is TRANSIENT (429 from the shared per-IP
    // bucket, 5xx, timeout). The old `/* fall through to noindex */` therefore served Googlebot —
    // the only visitor this route has — a 200 carrying robots:noindex and no canonical for a LIVE
    // category. Rethrow: an uncached 5xx is retried by the crawler; a noindex is obeyed by it.
    throw e;
  }
  // Genuinely unresolvable slug: the page body below redirects (legacy -N suffix) or notFound()s.
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

export default async function CrawlerCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug?.trim();
  if (!cleanSlug || isReservedRouteSlug(cleanSlug)) notFound();

  const baseUrl = getBaseUrl();
  const listingQuery = parseShopQuery(searchParams ? await searchParams : undefined);

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
    // The taxonomy endpoint always embeds page 1. Use the same cached listing loader as the human
    // category route so Googlebot receives the requested ?page=N, not twelve page-1 products at
    // every paginated URL.
    const { productsData, serverPagination } = await loadListingPage(
      listingQuery,
      isSub
        ? { subcategories: [cleanSlug], categories: [] }
        : { categories: [cleanSlug], subcategories: [] }
    );
    const products: Product[] = (productsData.products ?? []) as Product[];
    const subCats: CrawlerListLink[] = !isSub
      ? (((data as { sous_categories?: Array<{ slug?: string; designation_fr?: string }> }).sous_categories) ?? [])
          .filter((sc) => sc?.slug && sc?.designation_fr)
          .map((sc) => ({ name: sc.designation_fr as string, url: `/${sc.slug}` }))
      : [];

    // Parent category in the trail for a SUBcategory. Without it the crawler breadcrumb jumped
    // Accueil > Boutique > Créatine, losing the only structural link from a subcategory up to its
    // parent — 41 of 47 category pages were handing Googlebot ZERO links to any other category.
    const parentCat = isSub
      ? (data as { category?: { slug?: string; designation_fr?: string } }).category
      : undefined;
    const breadcrumbs: CrawlerListLink[] = [
      { name: 'Accueil', url: '/' },
      { name: 'Boutique', url: '/shop' },
      ...(parentCat?.slug && parentCat?.designation_fr
        ? [{ name: parentCat.designation_fr, url: `/${parentCat.slug}` }]
        : []),
      { name: title, url: `/${cleanSlug}` },
    ];

    // Related categories — the same list the human page renders. The prop already existed on
    // CrawlerCategoryView and was simply never passed, so topical link equity stopped dead at the
    // crawler boundary.
    const relatedCategories: CrawlerListLink[] = (merged.relatedCategorySlugs ?? [])
      .map((s) => String(s ?? '').trim())
      .filter((s) => s && s.toLowerCase() !== cleanSlug.toLowerCase())
      .map((s) => ({ name: s.replace(/-/g, ' '), url: `/${s}` }));
    const productListItems = products
      .filter((p) => p && p.designation_fr)
      .map((p) => ({ name: p.designation_fr as string, url: getProductLink(p) }))
      .filter((p) => p.url && p.url !== '/shop/');

    const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbs, baseUrl);
    const collectionPath = buildShopUrl(
      { ...listingQuery, page: serverPagination.currentPage },
      `/${cleanSlug}`
    );
    const collectionSchema = buildCollectionPageSchema(title, collectionPath, baseUrl, {
      description: merged.metaDescription?.trim() || undefined,
    });
    const itemListSchema = productListItems.length > 0
      ? buildItemListSchema(productListItems, baseUrl, { name: title })
      : null;
    // FAQPage was emitted on the human page only, so the rich-result eligibility never reached
    // the crawler — Google saw zero FAQ markup on these pages. Safe to emit here because the same
    // Q&A is now rendered as visible text in CrawlerCategoryView; FAQ schema without matching
    // on-page content is a structured-data violation, not a shortcut.
    const faqs = merged.faqs ?? [];
    const faqSchema = faqs.length ? buildFAQPageSchemaFromQA(faqs) : null;

    return (
      <>
        {ldScript(breadcrumbSchema, 'bc')}
        {ldScript(collectionSchema, 'cp')}
        {itemListSchema && ldScript(itemListSchema, 'il')}
        {faqSchema && ldScript(faqSchema, 'faq')}
        <CrawlerCategoryView
          title={title}
          introHtml={introHtml}
          howToChooseTitle={merged.howToChooseTitle?.trim() || null}
          howToChooseBody={merged.howToChooseBody?.trim() ? sanitizeProductHtml(merged.howToChooseBody) : null}
          longBottomHtml={merged.longBottomHtml?.trim() ? sanitizeProductHtml(merged.longBottomHtml) : null}
          faqs={faqs}
          breadcrumbs={breadcrumbs}
          products={products}
          subCategories={subCats}
          relatedCategories={relatedCategories}
          pagination={{
            currentPage: serverPagination.currentPage,
            totalPages: serverPagination.totalPages,
            buildHref: (page) => buildShopUrl({ ...listingQuery, page }, `/${cleanSlug}`),
          }}
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
    // rethrow: on a route whose ONLY visitor is a crawler, noStore() is not enough. It keeps the
    // empty render out of the Full Route Cache but still hands Googlebot a 200 with an empty
    // product list — a soft-404 it records immediately. A 5xx is retried; an empty 200 is not.
    const result = await loadForCache(
      () => getProductsByBrand(brand.id),
      { products: [] as Product[] } as Awaited<ReturnType<typeof getProductsByBrand>>,
      { rethrow: true },
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
          // Factual intro from the brand's own catalogue. These 55 pages were a median of 39
          // words for Googlebot — an H1, a breadcrumb and a bare product list — which is the thin,
          // near-identical "scaled content" pattern Google discounts, on exactly the brand+geo
          // queries ("dymatize tunisie") they exist to win.
          introHtml={buildBrandIntroHtml(title, products)}
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
    // Same guard as generateMetadata above — the WebPage @id and <link rel="canonical"> in the
    // bot-facing HTML must never disagree.
    const canonical = await resolveCanonicalUrl(page.canonical_url, `/${encodeURIComponent(cleanSlug)}`);
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

  /**
   * THE DEAD END, RESOLVED HERE TOO — because this is the route Googlebot reaches.
   *
   * Middleware rewrites bot traffic for /{slug} to this crawler view, so the recovery in
   * app/(shop)/[slug]/page.tsx never runs for the one visitor whose result appears in Search
   * Console. That was already the reason the legacy `-N` strip was duplicated into this file; both
   * halves now come from the shared resolver instead, so the two can no longer drift apart —
   * which they had, in the direction that mattered.
   *
   * See util/retiredSlug.ts for the order. Two things changed with it: a root-level PRODUCT slug
   * is resolved to the product rather than 404'd, and the `-N` base is verified before the hop is
   * spent (it used to fire unconditionally, so `/zzz-fake-thing-2` 308'd into a 404).
   */
  const retired = await retiredSlugDestination(cleanSlug, {
    product: true,
    // This route's own resolvers, for the same reason as the (shop) twin: middleware's taxonomy
    // set knows categories but not brands or CMS pages, and /optimum-nutrition-2 strips to a BRAND.
    listing: async (candidate) =>
      (await hasCategoryOrSubCategory(candidate)) ||
      (await findBrandBySlug(candidate)) !== null ||
      (await findPageBySlug(candidate)) !== null,
  });
  if (retired) {
    permanentRedirect(retired);
  }

  notFound();
}


/**
 * Opt this route into the Full Route Cache. See the long note in app/(shop)/[slug]/page.tsx —
 * Next only registers a dynamic segment in prerenderManifest.dynamicRoutes when the route exports
 * generateStaticParams, and without that entry `export const revalidate` is inert and every
 * request re-renders. An EMPTY array is sufficient: on-demand ISR then covers every path.
 * Deliberately NOT enumerating the catalogue — `next build` runs in CI where Cloudflare 403s the
 * runner, so a fetched list would come back empty or partial and bake bad pages.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}
