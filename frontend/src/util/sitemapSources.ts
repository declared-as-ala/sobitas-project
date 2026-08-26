import type { MetadataRoute } from 'next';

import { getApiPage, getStorageUrl } from '@/services/api';
import type { Product, Article, Category, Brand, SubCategory, Page } from '@/types';
import { brandNameToSlug } from '@/util/brandSlug';
import { listCategorySeoSlugs } from '@/util/categorySeoContent';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { getProductPrimarySubCategory } from '@/util/productUrl';
import { crawlPaginated, describeCrawl, type PaginatedCrawl } from '@/util/sitemapCrawl';

/* ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE SITEMAP SOURCE REGISTRY — the ONE place a page type is declared.
 *
 * The owner's requirement, in his words: "put every page that we have… make Google literally index
 * the things that we will add in future." The second half is the hard part, and it is a structural
 * property, not a promise: adding a page type has to be a small, obvious change in ONE file, and
 * every source has to inherit the completeness guarantees automatically instead of having them
 * hand-written per source (which is exactly how 124 blog URLs and 15 brand URLs went missing while
 * the products crawl was defended by 130 lines of comments).
 *
 * So: every content type is a SitemapSource in SITEMAP_SOURCES below. Adding one means appending
 * one object. It then gets, for free:
 *   • a verified paginated crawl that walks to the real end (sitemapCrawl.ts),
 *   • a completeness check against the server's own reported total,
 *   • a loud failure — 503, nothing cached — when it cannot prove it saw everything,
 *   • a real <lastmod> from the row's own timestamps,
 *   • assignment to a child sitemap, so Search Console reports its coverage separately.
 *
 * ── WHAT IS IN, AND WHAT IS DELIBERATELY OUT ─────────────────────────────────────────────────
 * Enumerated from src/app/ rather than from memory (see scripts/check-sitemap-routes.mjs, which
 * fails the build when a new top-level route appears and is neither submitted nor excluded here).
 *
 *   IN
 *     /                                    static     home
 *     /shop /packs /offres /brands /blog   static     top-level listing hubs
 *     /qui-sommes-nous /mentions-legales
 *     /contact /faqs                       static     evergreen informational
 *     /proteine-sousse                     static     local-SEO landing page
 *     /pack-builder                        static     indexable tool page
 *     /partenaires                         static     WAS ORPHANED — 200, self-canonical, indexable,
 *                                                     and in no sitemap. Added by this rebuild.
 *     /{category} /{subcategory}           listings   taxonomy (non-empty, or with an editorial guide)
 *     /{brand}                             listings   brands that actually have a published product
 *     /{subcategory}/{product}             products   the catalogue — the canonical product URL
 *     /{cms-page}                          pages      CMS pages (status = active)
 *     /blog/{article}                      blog       published articles
 *     /blog/category/{slug}                blog       blog categories (table is empty today)
 *     /blog/tag/{slug}                     blog       ONLY tags that opted into index=true
 *
 *   OUT, and why
 *     /cart /checkout /account/** /favoris          transactional or per-user; robots.txt disallows
 *     /login /register /forgot-password
 *     /reset-password
 *     /order-confirmation/{id}                      per-order, disallowed in robots.txt
 *     /avis/{token}                                 one-time review-invite token, not a page
 *     /shop/{slug} /category/{slug}                 legacy URL shapes; middleware 301s them to the
 *     /brand/{slug} /page/{slug}                    canonical form. Submitting a redirect is the
 *     /product/{slug} /products/{id}                "Page with redirect" bucket in Search Console.
 *     /shop/{slug}/reviews /products/{id}/reviews   review surfaces — out of scope by project rule
 *     /x-crawler/**                                 the bot-rendering target, disallowed in robots.txt
 *     seo_pages                                     NOT pages. /api/seo_page/{name} is keyed by ROUTE
 *                                                   NAME (home, shop, …) and returns meta for a page
 *                                                   that already exists in this list; it owns no URL
 *                                                   of its own. Submitting them would duplicate.
 *     packs / promos as separate URLs               they are not separate URLs. A pack is a Product
 *                                                   with `pack` set and a promo is a Product with
 *                                                   `promo` set; both live at /{subcategory}/{slug}
 *                                                   and are already in the products source. /packs
 *                                                   and /offres are the listing hubs and are static.
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Which child sitemap an entry belongs to. /sitemap.xml is a sitemap INDEX pointing at one file per
 * section, so Search Console reports coverage per content type ("42 of 20,000 products indexed")
 * instead of one opaque number for the whole site — that is the entire point of splitting it.
 */
export type SitemapSection = 'static' | 'listings' | 'products' | 'blog' | 'pages';

/**
 * A sitemap entry plus the section it belongs to. `section` is stripped before XML is emitted.
 *
 * `productId` exists so product entries can be assigned to a child sitemap by a STABLE key instead
 * of by their position in this array (see sitemapXml.ts). It is not rendered — renderUrlSet only
 * reads url/lastModified/changeFrequency/priority/images — so it is inert in the XML.
 */
export type SectionedSitemapEntry = MetadataRoute.Sitemap[number] & {
  section: SitemapSection;
  productId?: number;
};

/** What a source returns before its section is stamped on. */
export type SourceEntry = MetadataRoute.Sitemap[number] & { productId?: number };

/**
 * Shared state a source may read from or contribute to.
 *
 * It exists because three sources genuinely depend on another source's result — a brand page with no
 * products is a soft 404, and only the product crawl knows which brands have products. Dependencies
 * are declared per source (`needs`) and asserted by the runner, so reordering the array cannot
 * silently produce an empty `listings` section.
 */
export type SitemapBuildContext = {
  baseUrl: string;
  /**
   * Brands with at least one PUBLISHED product. Populated by `products`.
   *
   * Publication, not indexability: a brand page renders every published product, so a brand whose
   * products are all noindexed still has a full listing page. Gating on the robots flag instead
   * deleted three live brand pages the first time this was measured.
   */
  brandIdsWithProducts: Set<number>;
  /** Lowercased subcategory slugs with at least one PUBLISHED product — same rule. From `products`. */
  subCategorySlugsWithProducts: Set<string>;
  /** Lowercased category + subcategory slugs that exist in the backend. Populated by `taxonomy`. */
  liveCategorySlugs: Set<string>;
  /** Lowercased slugs that have an editorial content file in content/categories/. */
  contentFileSlugs: Set<string>;
  /** The category rows, kept so `products` can rebuild a missing subcategory relation. */
  categories: Category[];
};

export type SourceResult = {
  entries: SourceEntry[];
  /**
   * Could this source PROVE it emitted everything it should have?
   *   true  — it walked to the end and the count matched the server's own reported total.
   *   false — it walked to the end but nothing reported a total, so the result is unverifiable.
   * A `critical` source whose crawl is short does not return false; it throws.
   */
  verified: boolean;
  /** One line for the build log. Always printed, pass or fail. */
  note: string;
};

export type SitemapSource = {
  /** Stable id, used in logs and in `needs`. */
  id: string;
  section: SitemapSection;
  /**
   * When true, this source failing — or proving itself incomplete — aborts the WHOLE sitemap:
   * getSitemapEntries throws, both routes answer 503 + Retry-After, and nothing is cached.
   *
   * That is deliberately harsher than the old behaviour, which caught every non-product source and
   * published without it. Publishing a sitemap that is missing its brand pages is not a degraded
   * success; it is a removal signal aimed at Google, sent from a 200, with nothing in any status
   * code to show for it. A 503 is retried in minutes; a short sitemap is believed.
   *
   * `false` is reserved for sources whose absence removes nothing that was ever there — see the two
   * blog-taxonomy sources, whose tables are empty.
   */
  critical: boolean;
  /** Source ids that must have run first. Asserted by the runner, not by comment. */
  needs?: string[];
  /**
   * True when this source is EXPECTED to emit URLs an earlier source already claimed, so the runner
   * logs the collisions instead of warning about them.
   *
   * Only two sources qualify, and both for the same structural reason: the `/{slug}` namespace is
   * shared. `category-guides` deliberately re-asserts every editorial slug, most of which the
   * taxonomy source has already emitted; `cms-pages` shares its namespace with the hand-written
   * routes (/qui-sommes-nous is both). Everywhere else a collision means two rows of one type claim
   * one URL and one of them is unreachable — which is a warning, because it is a real defect.
   */
  expectsCollisions?: boolean;
  load: (ctx: SitemapBuildContext) => Promise<SourceResult>;
};

/* ────────────────────────────────────────────────────────────────────────────────────────────────
 * Shared helpers
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Real change date, or undefined when the record carries none.
 *
 * It previously fell back to "now". Combined with the products API not selecting its timestamps at
 * all, that made EVERY product advertise <lastmod> = the moment of the fetch — so the whole sitemap
 * looked freshly rewritten on every crawl. Google discounts a lastmod it can show is unreliable, so
 * the signal was not just useless but actively spent. Omitting the element is the honest option:
 * Google falls back to its own change detection for that URL only.
 *
 * NEVER add a `?? new Date()` here. That single fallback is what the whole <lastmod> half of this
 * sitemap depends on being absent.
 */
export function getLastModified(item: { updated_at?: string | null; created_at?: string | null }): Date | undefined {
  const raw = item.updated_at || item.created_at;
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Absolute, space-free https image URL for the sitemap <image:image> extension (Google Images), or
 * undefined. Image search already drives real traffic, so product/article covers are declared.
 */
function toSitemapImage(path?: string | null): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  const raw = /^https?:\/\//i.test(path) ? path : getStorageUrl(path);
  if (!raw || /\s/.test(raw) || !/^https?:\/\//i.test(raw)) return undefined;
  return raw;
}

const ALLOWED_CHANGEFREQ = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

function normalizeSitemapChangefreq(
  v: string | null | undefined
): NonNullable<MetadataRoute.Sitemap[0]['changeFrequency']> {
  const s = (v ?? '').trim().toLowerCase();
  if (s && ALLOWED_CHANGEFREQ.has(s)) return s as NonNullable<MetadataRoute.Sitemap[0]['changeFrequency']>;
  return 'weekly';
}

function clampPriority(n: number | null | undefined, fallback: number): number {
  if (n == null || Number.isNaN(Number(n))) return fallback;
  return Math.min(1, Math.max(0, Number(n)));
}

/**
 * Exactly ApisController::MAX_PER_PAGE. Asking for more is silently clamped server-side, so don't —
 * and crawlPaginated reads the honoured size back off page 1 regardless.
 */
const PER_PAGE = 100;

/**
 * Absolute ceiling on requests per source, per crawl, whatever the API claims about last_page.
 * 600 × 100 = 60,000 rows, ~3× the planned 19,000-product import. Reaching it means the pagination
 * metadata is wrong, and the correct response to that is to fail loudly — never to keep looping
 * inside a request a crawler is waiting on.
 */
const MAX_REQUESTS = 600;

/**
 * How many pages are in flight at once.
 *
 * At 100 rows/page, 20,000 products is 200 round trips, all inside the single force-dynamic request
 * a crawler made to /sitemap.xml. Run strictly sequentially that is long enough to meet a
 * reverse-proxy timeout, and after every deploy the unstable_cache entry is cold (docker-compose
 * only volumes .next/cache/images, not fetch-cache), so somebody really does pay for it. A small
 * pool divides that wait without going near the API's 600 GET/min-per-IP budget — which the whole
 * SSR container shares with real page renders, so this must stay small.
 */
const CONCURRENCY = 4;

/** Run one verified crawl of a paginated endpoint. Throws when `critical` and the walk came up short. */
async function crawlSource<T>(args: {
  label: string;
  path: string;
  rowsKey?: string;
  critical: boolean;
  /** Override the default page size. Only meaningful where the endpoint honours a larger one. */
  perPage?: number;
}): Promise<{ crawl: PaginatedCrawl<T>; verified: boolean; note: string }> {
  const crawl = await crawlPaginated<T>({
    label: args.label,
    perPage: args.perPage ?? PER_PAGE,
    maxRequests: MAX_REQUESTS,
    concurrency: CONCURRENCY,
    rowsKey: args.rowsKey,
    fetchPage: (page, perPage) => getApiPage(args.path, page, perPage),
  });

  const verdict = describeCrawl(args.label, crawl);

  if (!verdict.verified && verdict.shortfall > 0) {
    // A measurable hole. Critical sources refuse to publish; the rest say the number out loud.
    if (args.critical) throw new Error(`${verdict.message} — refusing to publish a truncated sitemap`);
    console.warn(`${verdict.message} — publishing without them`);
  }
  if (crawl.duplicates > 0 || crawl.unkeyed > 0) {
    console.warn(
      `[sitemap] ${args.label}: ${crawl.duplicates} duplicate row(s), ${crawl.unkeyed} row(s) without an id ` +
      `— the paginated sort is not stable, or the projection stopped selecting \`id\``
    );
  }

  return { crawl, verified: verdict.verified, note: verdict.message };
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════
 * THE SOURCES.
 *
 * ORDER MATTERS and is enforced: `needs` is asserted by the runner in sitemapData.ts. Products must
 * resolve before brands and taxonomy, because "does this listing have anything to show?" is a
 * question only the product crawl can answer.
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The site's fixed routes.
 *
 * Hand-written, because they are hand-written pages — but NOT trusted: scripts/check-sitemap-routes.mjs
 * enumerates every top-level directory under src/app that owns a page.tsx and fails the build if one
 * is neither listed here nor named in that script's documented exclusions. /partenaires is in this
 * list because that check found it: a 200, self-canonical, indexable page that had never been in a
 * sitemap and had no internal link path worth the name.
 */
export const STATIC_ROUTES: ReadonlyArray<{ path: string; changeFrequency: NonNullable<MetadataRoute.Sitemap[0]['changeFrequency']>; priority: number }> = [
  { path: '/', changeFrequency: 'daily', priority: 0.95 },
  { path: '/shop', changeFrequency: 'daily', priority: 0.95 },
  { path: '/packs', changeFrequency: 'daily', priority: 0.9 },
  { path: '/offres', changeFrequency: 'daily', priority: 0.9 },
  { path: '/brands', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.85 },
  { path: '/qui-sommes-nous', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/mentions-legales', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/faqs', changeFrequency: 'monthly', priority: 0.7 },
  // Local SEO landing page ("protéine Sousse"): indexable + self-canonical but was orphaned.
  { path: '/proteine-sousse', changeFrequency: 'monthly', priority: 0.8 },
  // Pack Builder: a real indexable tool page. It also spent time answering 404 to Googlebot only —
  // a reserved-route bug fixed in PR #152 — so it has never actually been crawlable.
  { path: '/pack-builder', changeFrequency: 'weekly', priority: 0.7 },
  // Partners page: 200 + self-canonical + index,follow, and in no sitemap until this rebuild.
  { path: '/partenaires', changeFrequency: 'monthly', priority: 0.6 },
];

/**
 * /shop?page=2 … /shop?page=N.
 *
 * ── 470 PAGES, ONE OF THEM DISCOVERABLE ─────────────────────────────────────────────────────
 * `STATIC_ROUTES` carries `/shop` and nothing else, and no other source emits a `?page=` URL. The
 * only path to page 470 was the pager itself, which shows `{1, current±1, last}` — so reaching the
 * middle of the catalogue meant walking roughly 235 hops from page 1. Googlebot does not do that,
 * which is how ~11,000 products came to sit behind a listing chain nothing crawled.
 *
 * These URLs are legitimately indexable: `page` is deliberately absent from next.config's
 * FACET_KEYS, each page self-canonicalises (a paged view is not a duplicate — it holds products
 * that appear on no other URL), and /shop now 308s anything past the end rather than serving an
 * indexable empty page. So they qualify for a sitemap, and 469 extra URLs is noise beside the
 * 11,263 product URLs already emitted.
 *
 * `priority: 0.3` and `weekly`: they are a crawl PATH, not destinations competing with the
 * products they link to. Google treats priority as a hint at best, but stating the hierarchy
 * honestly costs nothing.
 *
 * `critical: false` and `verified: false`: this is discovery scaffolding. If /api/shop_facets is
 * down, the right outcome is a sitemap without the pager pages, never a failed build — the
 * products themselves are emitted by their own source and do not depend on this.
 */
const shopPaginationSource: SitemapSource = {
  id: 'shop-pagination',
  section: 'listings',
  critical: false,
  load: async (ctx) => {
    const { getShopFacets } = await import('@/services/api');
    const { SHOP_PER_PAGE } = await import('@/util/shopQuery');

    const facets = await getShopFacets().catch(() => null);
    const total = Number(facets?.total_published ?? 0) || 0;
    // Ceiling, then cap. The cap is a guard against a malformed total looping, not a budget:
    // 2,000 pages is 48,000 products.
    const totalPages = Math.min(2000, Math.ceil(total / SHOP_PER_PAGE));

    if (totalPages < 2) {
      return {
        entries: [],
        verified: false,
        note: '[sitemap] shop-pagination: no total_published, skipped',
      };
    }

    const entries = Array.from({ length: totalPages - 1 }, (_, i) => ({
      url: `${ctx.baseUrl}/shop?page=${i + 2}`,
      changeFrequency: 'weekly' as const,
      priority: 0.3,
    }));

    return {
      entries,
      verified: false,
      note: `[sitemap] shop-pagination: ${entries.length} pager URL(s) from ${total} products`,
    };
  },
};

const staticSource: SitemapSource = {
  id: 'static',
  section: 'static',
  critical: true,
  load: async (ctx) => ({
    entries: STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
      url: path === '/' ? ctx.baseUrl : `${ctx.baseUrl}${path}`,
      changeFrequency,
      priority,
    })),
    // No crawl, nothing to be short of: the list IS the truth, and check-sitemap-routes.mjs is what
    // keeps it honest against src/app.
    verified: true,
    note: `[sitemap] static: ${STATIC_ROUTES.length} fixed route(s)`,
  }),
};

/**
 * THE ONE GENUINE CROSS-SOURCE PREREQUISITE, loaded before any source runs.
 *
 * `/categories` is needed by two sources for two different reasons — the taxonomy source emits its
 * rows as URLs, and the products source uses them to rebuild a `sous_categorie` relation the listing
 * endpoint occasionally fails to eager-load — so it cannot belong to either without one importing
 * the other. Fetching it here, once, verified, keeps SITEMAP_SOURCES a flat list with no cycle in it.
 *
 * It is the only thing with this status. Anything else a new source needs, it fetches itself.
 */
export async function loadSharedContext(baseUrl: string): Promise<{ ctx: SitemapBuildContext; note: string }> {
  const ctx: SitemapBuildContext = {
    baseUrl,
    brandIdsWithProducts: new Set<number>(),
    subCategorySlugsWithProducts: new Set<string>(),
    liveCategorySlugs: new Set<string>(),
    contentFileSlugs: new Set<string>(),
    categories: [],
  };

  /*
   * Slugs that have an editorial content file. Loaded up front because BOTH the taxonomy source
   * (which exempts an empty-but-documented subcategory from the soft-404 rule) and the
   * category-guides source read it.
   */
  for (const slug of await listCategorySeoSlugs().catch(() => [] as string[])) {
    const clean = String(slug ?? '').trim().toLowerCase();
    if (clean) ctx.contentFileSlugs.add(clean);
  }

  const { crawl, note } = await crawlSource<Category>({
    label: '/categories',
    path: '/categories',
    critical: true,
  });

  ctx.categories = crawl.rows;
  for (const category of crawl.rows) {
    if (category.slug) ctx.liveCategorySlugs.add(category.slug.toLowerCase());
    for (const sc of category.sous_categories ?? []) {
      if (sc.slug) ctx.liveCategorySlugs.add(sc.slug.toLowerCase());
    }
  }

  return { ctx, note: `${note} → ${ctx.liveCategorySlugs.size} live taxonomy slug(s)` };
}

const productsSource: SitemapSource = {
  id: 'products',
  section: 'products',
  critical: true,
  load: async (ctx) => {
    const { crawl, verified, note } = await crawlSource<Product>({
      label: '/all_products',
      /*
       * ── ?fields=index — THE PROJECTION THIS WALK ACTUALLY READS ────────────────────────────
       *
       * The mapping below uses NINE fields per row: id, slug, publier, brand_id, cover, updated_at,
       * created_at, seo_robots_index and the sousCategorie relation. No price, no stock, no rating,
       * no hover image.
       *
       * The default projection supplied all of those anyway, and two of them were not columns at
       * all — `review_count` and `rating_value` are correlated subqueries against `reviews`,
       * evaluated per row. Across 10,669 products that is ~21,000 subqueries per rebuild, plus an
       * eager load of externalCatalogSource and a PHP pass over every row to attach a hover image,
       * to produce fields this loop discards on the next line.
       *
       * That load is not hypothetical: during today's outage the php-fpm log showed this endpoint
       * being walked page 2 to page 56 inside three seconds, ~40 workers deep, with customer
       * requests queued behind them until the proxy gave up at 60s.
       *
       * fields=index also implies light=1 — brands and categories are not sent either.
       */
      path: '/all_products?fields=index',
      rowsKey: 'products',
      critical: true,
      /*
       * 500, and the endpoint honours it for this projection only.
       *
       * 22 requests instead of 107 over 10,669 products. crawlPaginated reads the HONOURED per_page
       * back off page 1, so if the server ever clamps this the crawl adjusts rather than silently
       * returning a fifth of the catalogue — which is the failure this whole module is built to
       * refuse.
       */
      perPage: 500,
    });

    if (crawl.rows.length === 0) {
      throw new Error('[sitemap] /all_products returned 0 products — refusing to cache a product-less sitemap');
    }

    /*
     * /all_products eager-loads `sousCategorie`, so most rows arrive with their relation. The
     * rebuild from the categories payload stays because it is the only thing covering a row whose
     * relation the endpoint failed to load — and because when it was absent, EVERY product resolved
     * to no subcategory and the filter below dropped the entire catalogue out of the sitemap.
     */
    const products = enrichProductsWithSubcategory(crawl.rows, ctx.categories);

    const entries: SourceEntry[] = [];
    let noindex = 0;
    let droppedNoSubcategory = 0;
    let publishable = 0;

    for (const p of products) {
      if (!p.slug) continue;
      if (!(p.publier == 1 || p.publier === undefined)) continue;

      /*
       * Derive the subcategory the SAME way the canonical/link builder does
       * (getProductPrimarySubCategory → sous_categories[0] then sous_categorie), NOT via a separate
       * sous_categorie_id map. When the two disagree, the sitemap lists /A/slug while the page's
       * rel=canonical says /B/slug → "Google chose a different canonical". One source keeps them
       * identical.
       */
      const subCategorySlug = getProductPrimarySubCategory(p)?.slug;

      /*
       * ── "DOES THIS LISTING HAVE ANYTHING TO SHOW?" IS ASKED OF `publier`, NOT OF THE ROBOTS FLAG.
       *
       * The two listing sources skip a brand or subcategory with no products, because an empty
       * listing is a soft 404. What makes a listing non-empty is PUBLICATION: the brand page and the
       * subcategory page render every published product, and `seo_robots_index` says nothing about
       * whether a product appears in a listing — it decides whether that product's OWN page is
       * offered to search engines.
       *
       * Recording presence after the noindex filter instead cost three brand pages the first time
       * this was measured (activlab, cellucor, musclepharm — brands whose published products are all
       * noindexed) and would have scaled straight into the import: a wave published noindexed, which
       * is the normal state for an imported product until somebody writes its copy, would have
       * deleted every brand and subcategory listing whose products came from that wave — full pages,
       * removed from the sitemap, for a reason that has nothing to do with them.
       */
      const brandId = Number((p as { brand_id?: unknown }).brand_id);
      if (Number.isFinite(brandId) && brandId > 0) ctx.brandIdsWithProducts.add(brandId);
      if (subCategorySlug) ctx.subCategorySlugsWithProducts.add(subCategorySlug.toLowerCase());

      /*
       * Never submit a URL that renders <meta robots="noindex"> — that is exactly the "Submitted URL
       * marked noindex" bucket in Search Console.
       *
       * `!== false` rather than `=== true`: a product with no robots field is indexable, so the
       * legacy hand-made catalogue is unaffected.
       *
       * BOTH SHAPES ARE READ, AND THE FLAT COLUMN IS THE ONE THAT ACTUALLY ARRIVES. `seo.robots.index`
       * comes from ProductDetailResource, which serves /product_details — not /all_products, whose
       * projection (ApisController::PRODUCT_LISTING) returns flat columns and had no robots field at
       * all until `seo_robots_index` was added to it.
       *
       * MEASURED 2026-08-10: 49 of the 410 published products carry seo_robots_index = false (set in
       * the admin) and are correctly excluded here. They are also the entire difference between the
       * 410 published products and the 361 URLs in /sitemaps/products-0.xml — i.e. this filter, not a
       * crawl defect, is why the sitemap is shorter than the catalogue.
       */
      const seoObj = (p as { seo?: { robots?: { index?: boolean } } })?.seo?.robots?.index;
      const flatColumn = (p as { seo_robots_index?: boolean | number | null }).seo_robots_index;
      const robotsIndex = seoObj ?? (flatColumn == null ? undefined : Boolean(flatColumn));
      if (robotsIndex === false) {
        noindex++;
        continue;
      }

      publishable++;

      if (!subCategorySlug) {
        // Skipped rather than emitted as /shop/{slug}, which middleware immediately 301s → a
        // self-redirecting sitemap URL ("Page with redirect" in Search Console).
        droppedNoSubcategory++;
        continue;
      }

      const coverImg = toSitemapImage(p.cover);
      entries.push({
        url: `${ctx.baseUrl}/${encodeURIComponent(subCategorySlug)}/${encodeURIComponent(p.slug)}`,
        lastModified: getLastModified(p as { updated_at?: string; created_at?: string }),
        changeFrequency: 'weekly',
        priority: 0.7,
        // Stable chunk key. See sitemapXml.ts: child sitemaps are id BANDS, not array slices.
        productId: Number(p.id),
        ...(coverImg ? { images: [coverImg] } : {}),
      });
    }

    /*
     * Dropping a product with no subcategory is correct but INVISIBLE: the response is still 200,
     * the file is just shorter. At 309 products a mapping bug costs a handful of URLs; at 20,000 a
     * promotion that writes products.sous_categorie_id but not the product_sous_category pivot can
     * quietly delete thousands with every status code green. So it is counted, and past a threshold
     * it refuses to publish at all.
     *
     * Half is a deliberately loose threshold, not a quality bar: a catalogue where the majority of
     * published products cannot be given a canonical URL is broken in a way no sitemap should paper
     * over, and anything short of that stays a warning so a handful of genuinely uncategorised
     * products can never take the whole file down.
     */
    if (droppedNoSubcategory > 0) {
      console.warn(
        `[sitemap] ${droppedNoSubcategory} publishable product(s) omitted: no resolvable subcategory, ` +
        `so the only URL available would be /shop/{slug}, which middleware 301s`
      );
    }
    if (publishable > 0 && droppedNoSubcategory > publishable * 0.5) {
      throw new Error(
        `[sitemap] ${droppedNoSubcategory} of ${publishable} publishable product(s) have no resolvable ` +
        `subcategory — only ${entries.length} product URL(s) would be emitted. Refusing to publish a sitemap ` +
        `that removes the majority of the catalogue; check products.sous_categorie_id and the ` +
        `product_sous_category pivot`
      );
    }

    return {
      entries,
      verified,
      note:
        `${note} → ${entries.length} product URL(s) ` +
        `(${noindex} noindex, ${droppedNoSubcategory} without a subcategory)`,
    };
  },
};

const taxonomySource: SitemapSource = {
  id: 'taxonomy',
  section: 'listings',
  critical: true,
  needs: ['products'],
  load: async (ctx) => {
    const entries: SourceEntry[] = [];

    for (const category of ctx.categories) {
      if (!category.slug) continue;

      if (category.sitemap_include !== false && category.robots_index !== false) {
        entries.push({
          url: `${ctx.baseUrl}/${encodeURIComponent(category.slug.toLowerCase())}`,
          lastModified: getLastModified(category as { updated_at?: string; created_at?: string }),
          changeFrequency: normalizeSitemapChangefreq(category.sitemap_changefreq ?? undefined),
          priority: clampPriority(category.sitemap_priority ?? undefined, 0.85),
        });
      }

      for (const subCategory of category.sous_categories ?? []) {
        if (!subCategory.slug) continue;
        if (subCategory.sitemap_include === false || subCategory.robots_index === false) continue;
        /*
         * A listing page with zero products is a heading, a breadcrumb, and nothing to buy. Google
         * reads that as a soft 404, and submitting it asserts it is worth indexing. A subcategory
         * with no products but a real editorial guide is still worth indexing on its own merits, so
         * it is exempt.
         *
         * Self-correcting: the day a subcategory gets its first product the page reappears with no
         * intervention — which is the "automatic for future edits" property, applied to listings.
         */
        const slug = subCategory.slug.toLowerCase();
        if (!ctx.subCategorySlugsWithProducts.has(slug) && !ctx.contentFileSlugs.has(slug)) continue;

        entries.push({
          url: `${ctx.baseUrl}/${encodeURIComponent(slug)}`,
          lastModified: getLastModified(subCategory as { updated_at?: string; created_at?: string }),
          changeFrequency: normalizeSitemapChangefreq(subCategory.sitemap_changefreq ?? undefined),
          priority: clampPriority(subCategory.sitemap_priority ?? undefined, 0.8),
        });
      }
    }

    return {
      entries,
      // The /categories crawl that produced ctx.categories was verified in loadSharedContext, and it
      // throws rather than returning short — so reaching here means the taxonomy is complete.
      verified: true,
      note: `[sitemap] taxonomy: ${entries.length} category/subcategory URL(s) from ${ctx.categories.length} category row(s)`,
    };
  },
};

/**
 * Category/subcategory slugs that have a localized premium SEO JSON file but that the taxonomy pass
 * did not already emit.
 *
 * Gated on liveCategorySlugs: emitting content-file names blindly previously pushed 404 URLs
 * (/whey-protein), redirecting URLs (/mass-gainer → /mass-gainers) and mixed-case duplicates
 * (/Intra-Workout) into the sitemap. Lowercased for the same reason — one content file is
 * capitalised (Intra-Workout.json), and a sitemap URL whose canonical disagrees with it is exactly
 * the "Duplicate, Google chose a different canonical" signal.
 */
const categoryGuidesSource: SitemapSource = {
  id: 'category-guides',
  section: 'listings',
  critical: false,
  needs: ['taxonomy'],
  expectsCollisions: true,
  load: async (ctx) => {
    const entries: SourceEntry[] = [];
    for (const slug of ctx.contentFileSlugs) {
      if (!ctx.liveCategorySlugs.has(slug)) continue;
      entries.push({
        url: `${ctx.baseUrl}/${encodeURIComponent(slug)}`,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
    return {
      entries,
      verified: true,
      note: `[sitemap] category-guides: ${entries.length} editorial slug(s) matched a live category`,
    };
  },
};

const brandsSource: SitemapSource = {
  id: 'brands',
  section: 'listings',
  critical: true,
  needs: ['products'],
  load: async (ctx) => {
    const { crawl, verified, note } = await crawlSource<Brand>({
      label: '/all_brands',
      path: '/all_brands',
      critical: true,
    });

    const entries: SourceEntry[] = [];
    for (const brand of crawl.rows) {
      // A brand page with no products is a heading and nothing to buy — a soft 404, and unlike
      // subcategories there is no editorial fallback for brands. Self-correcting: the day a brand
      // gets an indexable product it returns to the sitemap on the next crawl.
      if (!brand.id || !brand.designation_fr) continue;
      if (!ctx.brandIdsWithProducts.has(Number(brand.id))) continue;
      entries.push({
        url: `${ctx.baseUrl}/${brandNameToSlug(brand.designation_fr)}`,
        lastModified: getLastModified(brand as { updated_at?: string; created_at?: string }),
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }

    return { entries, verified, note: `${note} → ${entries.length} brand URL(s)` };
  },
};

const cmsPagesSource: SitemapSource = {
  id: 'cms-pages',
  section: 'pages',
  critical: true,
  expectsCollisions: true,
  load: async (ctx) => {
    const { crawl, verified, note } = await crawlSource<Page>({
      label: '/pages',
      path: '/pages',
      critical: true,
    });

    const entries: SourceEntry[] = [];
    for (const page of crawl.rows) {
      if (!page.slug || page.slug === 'api') continue;
      // Gate like categories: don't submit CMS pages an admin marked noindex / excluded from the
      // sitemap (otherwise Search Console flags "Submitted URL marked noindex").
      if ((page as { robots_index?: boolean }).robots_index === false) continue;
      if ((page as { sitemap_include?: boolean }).sitemap_include === false) continue;
      entries.push({
        url: `${ctx.baseUrl}/${encodeURIComponent(page.slug)}`,
        lastModified: getLastModified(page),
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    }

    return { entries, verified, note: `${note} → ${entries.length} CMS page URL(s)` };
  },
};

const blogArticlesSource: SitemapSource = {
  id: 'blog-articles',
  section: 'blog',
  critical: true,
  load: async (ctx) => {
    /*
     * MEASURED 2026-08-10, BEFORE THIS REBUILD: /sitemaps/blog.xml contained exactly 100 <url>
     * entries while /all_articles reported meta.total = 224 over 3 pages. services/api.ts's
     * getAllArticles() fetches `/all_articles?per_page=100` once and returns `data`, so 124
     * published articles had never been submitted — no warning, no failed status code, and no
     * mechanism anywhere that could have noticed. That is the defect this whole file restructures
     * around: the guarantee has to come from the crawler, not from remembering to paginate.
     */
    const { crawl, verified, note } = await crawlSource<Article>({
      label: '/all_articles',
      path: '/all_articles',
      rowsKey: 'articles',
      critical: true,
    });

    const entries: SourceEntry[] = [];
    for (const article of crawl.rows) {
      if (!article.slug) continue;
      const coverImg = toSitemapImage(article.cover);
      entries.push({
        url: `${ctx.baseUrl}/blog/${encodeURIComponent(article.slug)}`,
        lastModified: getLastModified(article as { updated_at?: string; created_at?: string }),
        changeFrequency: 'monthly',
        priority: 0.6,
        ...(coverImg ? { images: [coverImg] } : {}),
      });
    }

    return { entries, verified, note: `${note} → ${entries.length} article URL(s)` };
  },
};

/**
 * Blog categories and tags.
 *
 * `critical: false` on both, and the reason is specific rather than lenient: ApisController's
 * blogCategories()/blogTags() call `->get()` with no paginator at all, so there is no total to
 * verify against and never a second page to miss. Both tables are also empty today (measured: 0
 * rows), so an outage here removes nothing that was ever submitted.
 */
const blogCategoriesSource: SitemapSource = {
  id: 'blog-categories',
  section: 'blog',
  critical: false,
  load: async (ctx) => {
    const rows = (await getApiPage('/blog_categories', 1, PER_PAGE)) as unknown;
    const list = Array.isArray(rows) ? rows : ((rows as { data?: unknown })?.data ?? []);
    const entries: SourceEntry[] = [];
    for (const cat of (list as Array<{ slug?: string }>)) {
      if (!cat?.slug) continue;
      entries.push({
        url: `${ctx.baseUrl}/blog/category/${encodeURIComponent(cat.slug)}`,
        changeFrequency: 'weekly',
        priority: 0.55,
      });
    }
    return { entries, verified: true, note: `[sitemap] /blog_categories: ${entries.length} URL(s) (unpaginated endpoint)` };
  },
};

const blogTagsSource: SitemapSource = {
  id: 'blog-tags',
  section: 'blog',
  critical: false,
  load: async (ctx) => {
    const rows = (await getApiPage('/blog_tags', 1, PER_PAGE)) as unknown;
    const list = Array.isArray(rows) ? rows : ((rows as { data?: unknown })?.data ?? []);
    const entries: SourceEntry[] = [];
    for (const tag of (list as Array<{ slug?: string; seo?: { robots?: { index?: boolean } } }>)) {
      // Blog tag pages are noindex UNLESS a tag explicitly opts in (blog/tag/[slug] sets
      // index = seo.robots.index === true). Only submit the opt-in ones.
      if (!tag?.slug || tag.seo?.robots?.index !== true) continue;
      entries.push({
        url: `${ctx.baseUrl}/blog/tag/${encodeURIComponent(tag.slug)}`,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
    return { entries, verified: true, note: `[sitemap] /blog_tags: ${entries.length} indexable tag URL(s)` };
  },
};

/**
 * EVERY page type the site publishes, in dependency order.
 *
 * To add one: append a SitemapSource. Nothing else in the codebase needs to change — sitemapData.ts
 * runs whatever is in this array, sitemapXml.ts groups whatever sections come out of it, and
 * check-sitemap-routes.mjs will tell you at build time if a top-level route is missing from it.
 */
export const SITEMAP_SOURCES: ReadonlyArray<SitemapSource> = [
  staticSource,
  shopPaginationSource,
  // Products first among the data sources: it is the only thing that knows which brands and which
  // subcategories have something to sell, and the two listing sources below refuse to submit an
  // empty listing page. `needs` makes that a runtime assertion rather than a comment about order.
  productsSource,
  taxonomySource,
  categoryGuidesSource,
  brandsSource,
  cmsPagesSource,
  blogArticlesSource,
  blogCategoriesSource,
  blogTagsSource,
];
