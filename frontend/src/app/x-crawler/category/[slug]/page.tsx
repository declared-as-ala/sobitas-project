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
import { unstable_cache } from 'next/cache';
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import { getCategories } from '@/services/api';
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
import { mergeCategorySeoForSlug, canonicalCategoryPath } from '@/util/resolveCategorySeo';
import { buildCanonicalUrl, getBaseUrl, resolveCanonicalUrl } from '@/util/canonical';
import { isReservedRouteSlug, getProductLink } from '@/util/productUrl';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildFAQPageSchemaFromQA, buildItemListSchema, buildProductSchema, buildWebPageSchema } from '@/util/structuredData';
import { buildBrandLandingSchemas } from '@/util/brandJsonLd';
import { sanitizeProductHtml, truncateAtWord } from '@/util/sanitizeProductHtml';
import { CrawlerCategoryView, type CrawlerListLink } from '@/app/components/crawler/CrawlerCategoryView';
import { categoryAnchor } from '@/util/categoryAnchor';
import type { Brand, Category, Page, Product, SubCategory } from '@/types';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';
import { buildBrandMetaTitle, buildBrandMetaDescription, buildBrandSocialMetadata } from '@/util/brandMeta';
import { buildBrandIntroHtml } from '@/util/brandIntro';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';
import { getCmsPageTitleOverride } from '@/config/cmsPageSeoConfig';
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

/**
 * The taxonomy, on the SAME cache key, TTL and tag as the human category route
 * (loadCategoryListingSupport in app/(shop)/category/[slug]/page.tsx): a bot request warms the
 * entry a shopper hits and vice versa, so the lateral-link fix below costs no extra origin call
 * in steady state.
 */
const getCachedCategories = unstable_cache(() => getCategories(), ['shop-categories'], {
  revalidate: 3600,
  tags: ['categories'],
});

/**
 * Resolve related slugs to real links — the crawler half of `resolveRelatedCategories()` in
 * app/(shop)/category/[slug]/page.tsx, which that module does not export.
 *
 * Three rules, and all three are why the raw `slug.replace(/-/g, ' ')` it replaces was wrong:
 * a slug absent from the taxonomy is DROPPED rather than linked (/materiel-de-musculation was
 * linking /equipement-cardio-fitness and /bandes-de-soutien-musculaire, both 308s, the second one
 * back to itself), the anchor is the real `designation_fr` through categoryAnchor() instead of
 * "gainers proteines" / "sante vitalite", and the href goes through canonicalCategoryPath() so an
 * aliased slug never links a redirect.
 */
function resolveRelatedCategoryLinks(slugs: string[], categories: Category[]): CrawlerListLink[] {
  const out: CrawlerListLink[] = [];
  for (const s of slugs.slice(0, 6)) {
    const cat = categories.find((c) => c.slug === s);
    if (cat) {
      out.push({ name: categoryAnchor(cat.slug, cat.designation_fr), url: canonicalCategoryPath(cat.slug) });
      continue;
    }
    for (const c of categories) {
      const sub = (c.sous_categories ?? []).find((sc: SubCategory) => sc.slug === s);
      if (sub) {
        out.push({ name: categoryAnchor(sub.slug, sub.designation_fr), url: canonicalCategoryPath(sub.slug) });
        break;
      }
    }
  }
  return out;
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
      /*
       * Reuse the human category page's metadata (same title/description, canonical → /{slug}).
       *
       * THIS DELEGATION IS ALSO WHERE THE OUT-OF-RANGE ?page=N FIX COMES FROM — do not
       * re-implement it here. app/(shop)/category/[slug] now detects `page > totalPages` (guarded
       * on `total > 0`, so an outage cannot collapse every paginated listing onto page 1) and
       * canonicalises the overflow to the LAST REAL page, on top of the `noindex, follow` it
       * already emitted for page > 1 and the per-page title/description suffix. `searchParams` is
       * forwarded above, so a bot rewritten to /x-crawler/category/creatine?page=99999 receives
       * byte-identical head directives to a shopper on /creatine?page=99999.
       *
       * The body agrees with it by construction: `loadListingPage` clamps `currentPage` down to
       * `totalPages`, so the CollectionPage/ItemList @id and the pager this route renders for an
       * overflowed page already point at the same last real page the canonical names. A crawler
       * route cannot mirror the other half of a "status" fix — it is reached by an internal
       * middleware REWRITE of /{slug}, so redirecting from here would move the bot off the URL it
       * is indexing; the head is the whole lever this route has, and it is pulled above.
       */
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
        // This route declared no openGraph at all, so every brand page handed crawlers and link
        // unfurlers the site-wide /og-banner.jpg while a browser got the reviewed hero image.
        // Shared with the human route now — see buildBrandSocialMetadata.
        ...buildBrandSocialMetadata(brand.designation_fr, canonical),
      };
    }
    const page = await findPageBySlug(cleanSlug);
    if (page) {
      // Bots are rewritten here by middleware, so this route — NOT the human /{slug} route — is what
      // Googlebot's canonical actually comes from. Emitting page.canonical_url raw is why 4 CMS pages
      // told Google that sobitas.tn owns their content while a browser saw the correct self canonical.
      const canonical = await resolveCanonicalUrl(page.canonical_url, `/${encodeURIComponent(cleanSlug)}`);
      // Same helper and same budget as the human route's CMS branch. These two must agree:
      // divergent descriptions on one URL is the class check-crawler-parity exists to catch.
      const description = truncateAtWord(
        (page.meta_description ?? page.excerpt ?? '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        155
      );
      return {
        title: { absolute: getCmsPageTitleOverride(cleanSlug) || page.meta_title?.trim() || page.title || 'Page' },
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
    const merged = mergeCategorySeoForSlug(cleanSlug, seoJson, (data as { seo?: unknown }).seo as never);
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
    /*
     * ── PAGE 2+ CARRIES THE PRODUCTS AND NOTHING ELSE ─────────────────────────────────────────
     *
     * Measured live as Googlebot on 22/09/2026: /creatine?page=2 was 183 KB and shipped the SAME
     * H1, the SAME nine <h2>, the same intro, the same buying guide, the same closing copy and a
     * SECOND FAQPage node as page 1 — on every page of a ten-page series, on 55 listings. This
     * route passed the editorial props unconditionally, so the one render Google reads repeated
     * page 1's whole body ten times over.
     *
     * Google's FAQPage guidance is one marked-up instance per page, for Q&A that is visible on
     * THAT page. Reprinting page 1's Q&A on ten URLs and marking all ten up is the misuse the
     * guidance names, not a rich-result multiplier.
     *
     * Page 1 is untouched, byte for byte, including the frozen categories. Page N keeps its H1,
     * its breadcrumb, its twelve products (with image, price and stock label), its Product +
     * ItemList + CollectionPage + BreadcrumbList markup, its subcategory and lateral links and
     * its pager — everything that makes it a crawl path — and drops only the copy that belongs to
     * page 1. The human route already tells Google the same thing from the other side: its
     * generateMetadata (which this route delegates to, above) gives page N its own title, its own
     * description and `noindex, follow`.
     *
     * Derived from the REQUESTED page as well as the resolved one: loadListingPage clamps
     * `currentPage` down to `totalPages`, so ?page=5 on a one-page category resolves to 1 and
     * would otherwise re-print the whole editorial block at a second URL.
     */
    const isPaged = listingQuery.page > 1 || serverPagination.currentPage > 1;
    // Built exactly as before; `isPaged` decides at the render site below whether they are passed.
    const howToChooseTitle = merged.howToChooseTitle?.trim() || null;
    const howToChooseBody = merged.howToChooseBody?.trim()
      ? sanitizeProductHtml(merged.howToChooseBody)
      : null;
    const longBottomHtml = merged.longBottomHtml?.trim()
      ? sanitizeProductHtml(merged.longBottomHtml)
      : null;
    const subCats: CrawlerListLink[] = !isSub
      ? (((data as { sous_categories?: Array<{ slug?: string; designation_fr?: string }> }).sous_categories) ?? [])
          .filter((sc) => sc?.slug && sc?.designation_fr)
          .map((sc) => ({ name: sc.designation_fr as string, url: canonicalCategoryPath(sc.slug) }))
      : [];

    // Parent category in the trail for a SUBcategory. Without it the crawler breadcrumb jumped
    // Accueil > Boutique > Créatine, losing the only structural link from a subcategory up to its
    // parent — 41 of 47 category pages were handing Googlebot ZERO links to any other category.
    //
    // READ THE KEY THE PAYLOAD ACTUALLY CARRIES. This was `data.category`, which
    // productsBySubCategoryId never sends (its top-level keys are sous_category, seo, breadcrumb,
    // products, brands, sous_categories); the parent is eager-loaded at `sous_category.categorie`,
    // which is what the human route reads. So the fix above shipped 08/09 and was dead code until
    // 22/09: live bot HTML of /creatine, /bcaa and /vitamines contained no /performance,
    // /sante-vitalite link at all while the browser render showed the parent crumb.
    const parentCat = isSub
      ? (data as { sous_category?: { categorie?: { slug?: string; designation_fr?: string } } })
          .sous_category?.categorie
      : undefined;
    const breadcrumbs: CrawlerListLink[] = [
      { name: 'Accueil', url: '/' },
      { name: 'Boutique', url: '/shop' },
      ...(parentCat?.slug && parentCat?.designation_fr
        ? // .trim(): the stored value is "PROTÉINES " with a trailing space.
          [{ name: parentCat.designation_fr.trim(), url: canonicalCategoryPath(parentCat.slug) }]
        : []),
      // Same precedence as the human route: the short taxonomy label, not the 50-character H1.
      // A breadcrumb rich result showing "Créatine monohydrate en Tunisie : prix et formats"
      // where the browser render says "Créatine" is two entities for one URL.
      { name: merged.breadcrumbLabel?.trim() || title, url: `/${cleanSlug}` },
    ];

    // Related categories — the same list, with the same anchors and the same fallbacks, as the
    // human page. Two things were missing and both cost link equity on the only render Google
    // reads: the anchors were slug words ("gainers proteines", "sante vitalite") instead of the
    // category names, and an UNCURATED subcategory (21 under /sante-vitalite alone) got no list at
    // all — so with the dead parent crumb above it linked to no category whatsoever.
    const categories = await getCachedCategories().catch(() => [] as Category[]);
    const curatedSlugs = (merged.relatedCategorySlugs ?? [])
      .map((s) => String(s ?? '').trim())
      .filter((s) => s && s.toLowerCase() !== cleanSlug.toLowerCase());
    // Mirrors app/(shop)/category/[slug]/page.tsx: siblings + parent for a subcategory, the other
    // top categories for a category.
    const relatedSlugs = curatedSlugs.length
      ? curatedSlugs
      : isSub
        ? (() => {
            const parentSlug = parentCat?.slug;
            const parent = parentSlug ? categories.find((c) => c.slug === parentSlug) : undefined;
            const siblingSlugs = (parent?.sous_categories ?? [])
              .map((sc: SubCategory) => sc.slug)
              .filter((s): s is string => Boolean(s) && s.toLowerCase() !== cleanSlug.toLowerCase());
            return (parentSlug ? [...siblingSlugs, parentSlug] : siblingSlugs).slice(0, 6);
          })()
        : categories.filter((c) => c.slug !== cleanSlug).slice(0, 6).map((c) => c.slug);
    // A transient taxonomy failure (429 on the shared per-IP bucket, 5xx) must not delete the
    // lateral links; fall back to the previous slug-derived anchors rather than to nothing.
    const relatedCategories: CrawlerListLink[] = categories.length
      ? resolveRelatedCategoryLinks(relatedSlugs, categories)
      : curatedSlugs.map((s) => ({ name: s.replace(/-/g, ' '), url: canonicalCategoryPath(s) }));
    const productListItems = products
      .filter((p) => p && p.designation_fr)
      .map((p) => ({ name: p.designation_fr as string, url: getProductLink(p) }))
      .filter((p) => p.url && p.url !== '/shop/');

    const collectionPath = buildShopUrl(
      { ...listingQuery, page: serverPagination.currentPage },
      `/${cleanSlug}`
    );
    const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbs, baseUrl, { pageUrl: collectionPath });
    const collectionSchema = buildCollectionPageSchema(title, collectionPath, baseUrl, {
      description: merged.metaDescription?.trim() || undefined,
      withBreadcrumb: true,
      withItemList: productListItems.length > 0,
    });
    const itemListSchema = productListItems.length > 0
      ? buildItemListSchema(productListItems, baseUrl, { name: title, pageUrl: collectionPath })
      : null;
    // FAQPage was emitted on the human page only, so the rich-result eligibility never reached
    // the crawler — Google saw zero FAQ markup on these pages. Safe to emit here because the same
    // Q&A is now rendered as visible text in CrawlerCategoryView; FAQ schema without matching
    // on-page content is a structured-data violation, not a shortcut.
    // Empty on page 2+ — see the isPaged note above. The schema follows the visible text on the
    // same line, because that is the only thing that makes emitting it legitimate at all.
    const faqs = isPaged ? [] : (merged.faqs ?? []);
    const faqSchema = faqs.length ? buildFAQPageSchemaFromQA(faqs) : null;
    /*
     * ── THE PRODUCT NODES WERE ON THE HUMAN PAGE ONLY ─────────────────────────────────────────
     * app/(shop)/category/[slug] emits full Product markup for the first six products of the grid;
     * this route emitted none. Measured on production 08/09/2026 (`?__crawler=1` forces this route
     * past the CDN's URL-keyed cache):
     *
     *     /whey-proteine                 8 blobs + 6 Product   (browser)
     *     /whey-proteine?__crawler=1     8 blobs, 0 Product    (Googlebot)
     *     /creatine                      same, both
     *
     * So the one view Google reads carried the least. Same builder, same slice, same six products
     * CrawlerCategoryView renders — each with its cover image, its price and its stock label since
     * 22/09/2026. Until then this comment was false and the Offer prices marked up here appeared
     * nowhere on the page, which is the structured-data rule ("mark up what the user sees") that
     * merchant-listing eligibility turns on — Google's merchant listing guidance covers exactly
     * this case, and the nodes' canonical URLs point at the PDPs
     * rather than at this page, so they consolidate to the product rather than competing with it.
     */
    const productSchemas = products
      .slice(0, 6)
      .map((p) => buildProductSchema(p, baseUrl))
      .filter(Boolean) as object[];

    return (
      <>
        {ldScript(breadcrumbSchema, 'bc')}
        {ldScript(collectionSchema, 'cp')}
        {itemListSchema && ldScript(itemListSchema, 'il')}
        {faqSchema && ldScript(faqSchema, 'faq')}
        {productSchemas.map((schema, i) => ldScript(schema, `product-ld-${i}`))}
        <CrawlerCategoryView
          title={title}
          introHtml={isPaged ? null : introHtml}
          howToChooseTitle={isPaged ? null : howToChooseTitle}
          howToChooseBody={isPaged ? null : howToChooseBody}
          longBottomHtml={isPaged ? null : longBottomHtml}
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
    // loadForCache: a failed brand listing fetch during `next build` must not bake an empty brand
    // listing for the crawler — noStore() defers the render to runtime where the API is reachable.
    // rethrow: on a route whose ONLY visitor is a crawler, noStore() is not enough. It keeps the
    // empty render out of the Full Route Cache but still hands Googlebot a 200 with an empty
    // product list — a soft-404 it records immediately. A 5xx is retried; an empty 200 is not.
    //
    // Cached, not raw. generateMetadata above already fetched this exact listing through
    // getCachedProductsByBrand (it is what decides `index: brandProductCount > 0`), and the raw
    // call made the body fetch it a SECOND time — two identical requests against the shared per-IP
    // bucket on every brand render, and the bot is the only visitor this route has, so the bot is
    // exactly who paid for it. The request-scoped cache() wrapper exists for this; the human brand
    // route at app/(shop)/[slug]/page.tsx was switched to the same helper for the same reason.
    const result = await loadForCache(
      () => getCachedProductsByBrand(brand.id),
      { products: [] as Product[] } as Awaited<ReturnType<typeof getCachedProductsByBrand>>,
      { rethrow: true },
    );
    const products: Product[] = (result as { products?: Product[] }).products ?? [];
    const title = brand.designation_fr;
    const breadcrumbs: CrawlerListLink[] = [
      { name: 'Accueil', url: '/' },
      { name: 'Boutique', url: '/shop' },
      { name: title, url: `/${cleanSlug}` },
    ];
    const brandSeo = getBrandSeoEntry(cleanSlug);
    /* Shared with app/(shop)/[slug], which serves this same URL to humans. This route used to
       build its own CollectionPage as `Produits ${title}` with no description, while the human
       route used the curated title and the brandSeoConfig description — so the copy written for
       search engines was the one thing the search engine never saw. See util/brandJsonLd.ts. */
    const brandSchemas = buildBrandLandingSchemas({ brand, products, slug: cleanSlug, baseUrl });

    return (
      <>
        {brandSchemas.map((schema, i) => ldScript(schema, `brand-ld-${i}`))}
        <CrawlerCategoryView
          title={title}
          headingOverride={brandSeo?.h1}
          // Factual intro from the brand's own catalogue. These 55 pages were a median of 39
          // words for Googlebot — an H1, a breadcrumb and a bare product list — which is the thin,
          // near-identical "scaled content" pattern Google discounts, on exactly the brand+geo
          // queries ("dymatize tunisie") they exist to win.
          introHtml={brandSeo?.introHtml ?? buildBrandIntroHtml(title, products)}
          howToChooseTitle={brandSeo?.howToChooseTitle ?? null}
          howToChooseBody={brandSeo?.howToChooseBody ?? null}
          faqs={brandSeo?.faqs ?? []}
          breadcrumbs={breadcrumbs}
          products={products}
          relatedCategories={brandSeo?.relatedCategories.map((item) => ({ name: item.name, url: item.url })) ?? []}
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
    const webPageSchema = buildWebPageSchema(page.title || 'Page', canonical, baseUrl, { description, withBreadcrumb: true });
    const breadcrumbSchema = buildBreadcrumbListSchema(
      [{ name: 'Accueil', url: '/' }, { name: page.title || 'Page', url: `/${page.slug || cleanSlug}` }],
      baseUrl,
      { pageUrl: canonical }
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
