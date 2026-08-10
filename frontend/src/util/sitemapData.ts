import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { getAllProducts, getAllArticles, getCategories, getAllBrands, getBlogCategories, getBlogTags, getAppPages, getStorageUrl } from '@/services/api';
import type { Product, Article, Category, Brand, SubCategory, Page } from '@/types';
import { getProductPrimarySubCategory } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { listCategorySeoSlugs } from '@/util/categorySeoContent';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

/**
 * Which child sitemap an entry belongs to. /sitemap.xml is a sitemap INDEX pointing at one file
 * per section, so Search Console reports coverage per content type ("42 of 303 products indexed")
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

const STATIC_PAGES_SET = new Set([
  `${BASE_URL}/`,
  `${BASE_URL}/shop`,
  `${BASE_URL}/packs`,
  `${BASE_URL}/offres`,
  `${BASE_URL}/brands`,
  `${BASE_URL}/blog`,
  `${BASE_URL}/qui-sommes-nous`,
  `${BASE_URL}/contact`,
  `${BASE_URL}/faqs`,
  `${BASE_URL}/proteine-sousse`,
  `${BASE_URL}/pack-builder`,
]);

const staticPages: MetadataRoute.Sitemap = [
  { url: BASE_URL, changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/shop`, changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/packs`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/offres`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/brands`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.85 },
  { url: `${BASE_URL}/qui-sommes-nous`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/faqs`, changeFrequency: 'monthly', priority: 0.7 },
  // Local SEO landing page ("protéine Sousse"): indexable + self-canonical but was orphaned —
  // absent from the sitemap and with no internal links, so it could not be discovered/indexed.
  { url: `${BASE_URL}/proteine-sousse`, changeFrequency: 'monthly', priority: 0.8 },
  // Pack Builder: a real indexable tool page (200 + self-canonical + index,follow) that was
  // orphaned from the sitemap. It also spent time answering 404 to Googlebot only — a reserved-route
  // bug fixed in PR #152 — so it has never actually been crawlable. Submitting it now.
  { url: `${BASE_URL}/pack-builder`, changeFrequency: 'weekly', priority: 0.7 },
];

/**
 * Real change date, or undefined when the record carries none.
 *
 * It previously fell back to "now". Combined with the products API not selecting its
 * timestamps at all, that made EVERY product advertise <lastmod> = the moment of the fetch — so
 * the whole sitemap looked freshly rewritten on every crawl. Google discounts a lastmod it can
 * show is unreliable, so the signal was not just useless but actively spent. Omitting the element
 * is the honest option: Google falls back to its own change detection for that URL only.
 */
function getLastModified(item: { updated_at?: string; created_at?: string }): Date | undefined {
  const raw = item.updated_at || item.created_at;
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Absolute, space-free https image URL for the sitemap <image:image> extension (Google Images),
 * or undefined. Image search already drives real traffic, so product/article covers are declared
 * in /sitemap.xml. Storage paths are resolved through getStorageUrl.
 */
function toSitemapImage(path?: string | null): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  const raw = /^https?:\/\//i.test(path) ? path : getStorageUrl(path);
  if (!raw || /\s/.test(raw) || !/^https?:\/\//i.test(raw)) return undefined;
  return raw;
}


interface ItemWithDates {
  updated_at?: string;
  created_at?: string;
}

const ALLOWED_CHANGEFREQ = new Set([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
]);

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

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function encodeSitemapUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.split('/').map((segment) => {
      if (!segment || segment === '') return segment;
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    }).join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * THE CATALOGUE CRAWL
 *
 * This is the part that has to survive going from 309 products to 20,000+. Everything below is
 * written against three facts about /api/all_products that are easy to get wrong:
 *
 *  1. per_page IS CLAMPED SERVER-SIDE. ApisController::resolvePerPage() returns
 *     min($perPage, MAX_PER_PAGE) with MAX_PER_PAGE = 100. This loop used to ask for 150 and
 *     silently receive 100. Nothing broke, because the page COUNT was read back off the response —
 *     but the constant in this file described a page size that never existed. Ask for exactly the
 *     cap, and keep deriving every loop decision from the response, never from the request. "A
 *     loop that assumes it got what it asked for" is precisely how a paginating crawl either spins
 *     forever or stops early.
 *
 *  2. THE RESPONSE IS NOT TRUSTWORTHY ENOUGH TO BE THE ONLY TERMINATION CONDITION. `while (page <=
 *     last_page)` terminates only while last_page is sane. A hard request ceiling is what makes
 *     termination a property of this code rather than a property of the backend.
 *
 *  3. THE SORT IS `latest('created_at')` — DESCENDING, WITH NO TIEBREAKER. Offset pagination over
 *     a non-unique sort key is not stable: rows sharing a created_at second (which a bulk import
 *     produces by the thousand) can be returned on two pages or on none. So rows are accumulated
 *     into a Map keyed by product id — duplicates collapse instead of inflating the count, and the
 *     completeness check below then compares a count of DISTINCT products against the total the
 *     API reported. The real fix is an `orderBy('id')` tiebreaker (or keyset pagination) in
 *     ApisController::allProducts(); that is backend work and out of scope here. Until then this
 *     detects the problem loudly instead of publishing a sitemap with holes in it.
 *
 *  4. THE PAGE COUNT DOES NOT ALWAYS ARRIVE, AND IT DOES NOT ALWAYS ARRIVE IN THE SAME PLACE.
 *     services/api.ts::getAllProducts already normalises TWO upstream envelopes —
 *     `Array.isArray(raw.products) ? raw.products : (raw.products?.data ?? [])` — i.e. a flat
 *     `{ products: [...], pagination: {...} }` AND a Laravel paginator at `{ products: { data,
 *     last_page, total } }`. It then rebuilds its return value as a literal in which `pagination`
 *     is copied ONLY from `raw.pagination`, so on the paginator envelope the page count does not
 *     survive the client at all. This crawl used to read the count exclusively from that one block:
 *     no block meant `lastPage` stayed at its initial 1, the pagination `while` was never entered,
 *     and /sitemap.xml was published — 200, no warning, then memoised for an hour — containing the
 *     first 100 products of the catalogue. So the count is now read from whichever envelope is
 *     present, and when NONE is, the crawl walks by row count instead of stopping: a page that
 *     comes back full means there is more, and only a short page is the end. Truncation must never
 *     again be the quiet outcome; the request ceiling below turns "this never ends" into a throw.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Exactly ApisController::MAX_PER_PAGE. Asking for more is silently clamped, so don't. */
const PRODUCTS_PER_REQUEST = 100;

/**
 * How many pages are in flight at once.
 *
 * At 100 rows/page, 20,000 products is 200 round trips — and they all happen inside the single
 * force-dynamic request a crawler made to /sitemap.xml. Run strictly sequentially that is a long
 * enough wall time to meet a reverse-proxy timeout before it finishes, and after every deploy the
 * unstable_cache entry is cold (docker-compose only volumes .next/cache/images, not fetch-cache),
 * so somebody really does pay for it. A small pool divides that wait without going anywhere near
 * the API's 600 GET/min-per-IP budget — which the whole SSR container shares with real page
 * renders, so this must stay small.
 */
const PRODUCT_FETCH_CONCURRENCY = 4;

/**
 * Absolute ceiling on requests per crawl, whatever the API claims about last_page.
 * 600 x 100 = 60,000 products, ~3x the planned import. Reaching it means the pagination metadata
 * is wrong, and the correct response to that is to fail loudly — never to keep looping inside a
 * request a crawler is waiting on.
 */
const MAX_PRODUCT_REQUESTS = 600;

/**
 * How much of the publishable catalogue may fail to produce a canonical URL before the whole
 * sitemap refuses to publish. See the check itself, below the product loop, for why this exists and
 * why the threshold is this loose.
 */
const MAX_UNROUTABLE_PRODUCT_FRACTION = 0.5;

/** Page count + row total, however the page that carried them was shaped. */
type PageMeta = { total: number | null; lastPage: number | null };

/**
 * The paginator metadata on one page, read from whichever envelope actually arrived.
 *
 * Three are checked because three are what a paginated Laravel endpoint can emit, and which one
 * reaches this file is a property of services/api.ts rather than of this crawl (see fact 4 above):
 *
 *   • `res.pagination`  — the flat block ApisController::allProducts() sends today, and the only
 *                         one getAllProducts() currently forwards.
 *   • `res.meta`        — the API-Resource collection envelope.
 *   • `res.products`    — a raw LengthAwarePaginator, i.e. `{ data: [...], total, last_page }`,
 *                         which is the shape getAllProducts() flattens on the way through.
 *
 * Reading all three costs three property lookups and removes the class of bug where a change on
 * either side of the client silently halves the sitemap. `null` means "this page told us nothing
 * about how many pages exist" — which the caller must treat as unknown, never as one.
 */
function readPageMeta(res: unknown): PageMeta | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as { pagination?: unknown; meta?: unknown; products?: unknown };

  const envelopes: unknown[] = [r.pagination, r.meta];
  // A raw paginator only counts as an envelope when it is NOT the already-flattened array.
  if (r.products && !Array.isArray(r.products)) envelopes.push(r.products);

  for (const envelope of envelopes) {
    if (!envelope || typeof envelope !== 'object') continue;
    const e = envelope as { total?: unknown; last_page?: unknown };
    const total = Number(e.total);
    const lastPage = Number(e.last_page);
    const hasTotal = Number.isFinite(total) && total >= 0;
    const hasLastPage = Number.isFinite(lastPage) && lastPage > 0;
    if (hasTotal || hasLastPage) {
      return { total: hasTotal ? total : null, lastPage: hasLastPage ? lastPage : null };
    }
  }

  return null;
}

/**
 * The product rows on one page, from the flattened array OR from a raw paginator's `data`.
 *
 * Symmetric with readPageMeta: the rows and the page count must be read out of the SAME set of
 * envelopes, or a response shape that the count is understood on would still abort the crawl here.
 * `null` means the page carried no rows array at all, which is a malformed response, not an empty
 * catalogue — the caller throws on it.
 */
function readPageRows(res: unknown): Product[] | null {
  if (!res || typeof res !== 'object') return null;
  const products = (res as { products?: unknown }).products;
  if (Array.isArray(products)) return products as Product[];
  const data = (products as { data?: unknown } | null | undefined)?.data;
  return Array.isArray(data) ? (data as Product[]) : null;
}

type ProductCrawl = {
  /** Distinct products, in the order first seen. */
  products: Product[];
  /** Lowest reported total any page carried, or -1 when no page reported a total at all. */
  expectedTotal: number;
  /** How much `pagination.total` moved while we paginated (max - min). */
  drift: number;
  /** Rows returned more than once — the signature of the unstable sort described above. */
  duplicates: number;
  /** Rows with no usable id. Always 0 unless PRODUCT_LISTING stops selecting `id`. */
  unkeyed: number;
  requests: number;
  /**
   * How the crawl knew where to stop: `metadata` when a page reported a `last_page`, `row-count`
   * when none did and the walk ended on a page shorter than the page size. It exists so the log line
   * below can say which guarantee is actually behind the file being published. A page that reported
   * only a `total` is `row-count`: a total says how many rows exist, not where the pages end.
   */
  terminatedBy: 'metadata' | 'row-count';
};

/**
 * Fetch every published product, paginating /api/all_products.
 *
 * Throws on any malformed page. It must: the previous implementation `break`ed out of the loop
 * instead, fell through to a guard that only asked "did we get ZERO products?", and so a crawl
 * that died at page 137 of 200 returned ~13,700 rows, passed, and was memoised by unstable_cache
 * as the authoritative sitemap for a full hour. Google reads a sitemap that shrank as "these URLs
 * were removed". A throw reaches the route handlers, which answer 503 + Retry-After and cache
 * nothing.
 */
async function crawlAllProducts(): Promise<ProductCrawl> {
  const byId = new Map<number, Product>();
  const unkeyedProducts: Product[] = [];
  let duplicates = 0;
  let requests = 0;
  let minTotal = Number.POSITIVE_INFINITY;
  let maxTotal = 0;
  let sawPagination = false;
  let lastPage = 1;

  /** Absorb one page and return how many rows it carried (the row count drives termination). */
  const absorb = (res: Awaited<ReturnType<typeof getAllProducts>> | undefined, page: number): number => {
    const rows = readPageRows(res);
    if (rows === null) {
      throw new Error(`[sitemap] /all_products page ${page} returned no products array — aborting the crawl rather than caching a partial catalogue`);
    }
    for (const p of rows) {
      const id = Number((p as { id?: unknown })?.id);
      if (!Number.isFinite(id)) {
        // Keep it rather than drop it: a row with no id is a backend regression, and silently
        // losing URLs is the failure mode this whole file is defending against.
        unkeyedProducts.push(p);
        continue;
      }
      if (byId.has(id)) {
        duplicates++;
        continue;
      }
      byId.set(id, p);
    }
    const meta = readPageMeta(res);
    if (meta) {
      if (meta.total !== null) {
        minTotal = Math.min(minTotal, meta.total);
        maxTotal = Math.max(maxTotal, meta.total);
      }
      /*
       * sawPagination is driven by the PAGE COUNT and by nothing else.
       *
       * It used to be set by "any metadata arrived" — i.e. by readPageMeta returning non-null, which
       * it does on `total` ALONE. A page carrying `{ total: 20000 }` with no `last_page` (the shape
       * a paginator block loses whenever it is reshaped on the way through services/api.ts)
       * therefore flipped the crawl into bounded mode while `lastPage` was still its initial 1, and
       * hasMorePages() evaluated `2 <= 1` = false: the walk stopped after page 1 of 200, with the
       * row-count fallback that exists for exactly this case disabled. Both outcomes were wrong —
       * either the completeness check below throws and /sitemap.xml 503s indefinitely, or (when the
       * page reports total 0) minimumAcceptable is 0, nothing throws, and a 100-URL sitemap is
       * published and memoised for an hour. `lastPage === null` means UNKNOWN, never one, which is
       * what readPageMeta's own docblock says.
       *
       * Math.max, not assignment: products are sorted created_at DESC, so a promotion wave running
       * during the crawl adds pages at the END. Taking the max means we still walk to the new end.
       */
      if (meta.lastPage !== null) {
        sawPagination = true;
        lastPage = Math.max(lastPage, meta.lastPage);
      }
    }

    return rows.length;
  };

  // Page 1 alone first — it is what tells us how many pages exist (or, when nothing on it carries a
  // page count, whether a full page came back at all). Only then can the rest be parallelised, and
  // only then is the fan-out bounded by something the server actually said.
  requests++;
  const firstPageRows = absorb(await getAllProducts({ perPage: PRODUCTS_PER_REQUEST, page: 1 }), 1);

  let nextPage = 2;

  /*
   * WALKING WITHOUT A PAGE COUNT.
   *
   * When no page carries paginator metadata, `lastPage` is not 1 — it is UNKNOWN, and the two must
   * not be confused: treating unknown as 1 is precisely the bug in fact 4 above, a sitemap silently
   * cut to its first page. A paginated endpoint returns exactly `per_page` rows for every page but
   * the last, so a full page is evidence that more exist and a short page is the end of the
   * catalogue. That is a weaker guarantee than a reported total — it cannot be cross-checked the way
   * the completeness test below cross-checks one — but it walks to the real end instead of
   * truncating, and MAX_PRODUCT_REQUESTS still turns "this never ends" into a throw.
   *
   * The decision is taken on the HIGHEST-numbered page of each batch, not on any short page in it:
   * pages are fetched in contiguous batches, so a short page with full pages after it is a hole in
   * the middle (a concurrent delete), not the end, and stopping there would truncate exactly the way
   * this is written to prevent.
   */
  let exhausted = firstPageRows < PRODUCTS_PER_REQUEST;

  /** True while pages remain: bounded by the reported last_page, or by row count when there is none. */
  const hasMorePages = (): boolean => (sawPagination ? nextPage <= lastPage : !exhausted);

  while (hasMorePages()) {
    if (requests >= MAX_PRODUCT_REQUESTS) {
      throw new Error(
        `[sitemap] product crawl hit the ${MAX_PRODUCT_REQUESTS}-request ceiling ` +
        `(${sawPagination ? `last_page=${lastPage}` : 'no page reported a last_page; walking by row count'}, ` +
        `${byId.size} distinct products so far) — refusing to keep looping`
      );
    }
    const batch: number[] = [];
    while (batch.length < PRODUCT_FETCH_CONCURRENCY && hasMorePages() && requests < MAX_PRODUCT_REQUESTS) {
      batch.push(nextPage++);
      requests++;
    }
    // Promise.all, not allSettled: one failed page means an incomplete catalogue, and an
    // incomplete catalogue must never reach the cache. Let the rejection propagate.
    const responses = await Promise.all(
      batch.map((page) => getAllProducts({ perPage: PRODUCTS_PER_REQUEST, page }))
    );
    const rowCounts = responses.map((res, i) => absorb(res, batch[i]));
    // Only in row-count mode, and only on the last page of the batch (see the block above). If a
    // page in this batch DID report a last_page, `sawPagination` is now true and the bounded
    // condition takes over from here.
    if (!sawPagination) {
      exhausted = (rowCounts[rowCounts.length - 1] ?? 0) < PRODUCTS_PER_REQUEST;
    }
    // Termination: `requests` grows by at least 1 per outer iteration and is hard-capped above, so
    // this loop cannot run forever even if `lastPage` keeps climbing.
  }

  return {
    products: [...byId.values(), ...unkeyedProducts],
    // `Number.isFinite(minTotal)` IS "some page reported a total" — it starts at +Infinity — and it
    // is now the only thing gating these two. They used to be `sawPagination && …`, which was
    // harmless while sawPagination meant "any metadata arrived" and is not now that it means "a page
    // count arrived": a response carrying a total but no last_page is exactly the case the fix above
    // routes through the row-count walk, and it is also the case whose total makes that walk
    // verifiable. Gating on sawPagination would throw the total away precisely there.
    expectedTotal: Number.isFinite(minTotal) ? minTotal : -1,
    drift: Number.isFinite(minTotal) ? Math.max(0, maxTotal - minTotal) : 0,
    duplicates,
    unkeyed: unkeyedProducts.length,
    requests,
    terminatedBy: sawPagination ? 'metadata' : 'row-count',
  };
}

/** Returns every sitemap entry, each tagged with the child sitemap it belongs to. */
async function computeSitemapEntries(): Promise<SectionedSitemapEntry[]> {
  const seenUrls = new Set<string>();
  const sitemapEntries: SectionedSitemapEntry[] = [];
  // Lowercased slugs of categories/subcategories that actually exist in the backend.
  // Used to gate the "double insurance" content-file block below so we never emit a
  // root URL for a slug that 404s (e.g. /whey-protein) or 301s (e.g. /mass-gainer).
  const liveCategorySlugs = new Set<string>();

  /**
   * Which brands and subcategories actually HAVE products.
   *
   * A listing page with zero products is an empty page: a heading, a breadcrumb, and nothing to
   * buy. Google reads that as a soft 404, and submitting it in the sitemap asserts it is worth
   * indexing. An audit found 13 of 55 brands (API, MYPROTEIN, MONSTER, MUTANT…) and 6 of 41
   * subcategories with no products at all, every one of them submitted.
   *
   * Populated from the catalogue crawl below, so it self-corrects: the day a brand gets its first
   * product the page reappears in the sitemap with no intervention.
   */
  const brandIdsWithProducts = new Set<number>();
  const subCategorySlugsWithProducts = new Set<string>();

  /**
   * Slugs that have an editorial content file. A subcategory with no products but a real guide is
   * still worth indexing on its own merits, so it is exempt from the empty-listing rule above.
   * Loaded up front because that rule runs before the "double insurance" block that also uses it.
   */
  const contentFileSlugs = new Set<string>(
    (await listCategorySeoSlugs().catch(() => [] as string[]))
      .map((s) => String(s ?? '').trim().toLowerCase())
      .filter(Boolean)
  );

  // Add static pages with dedup
  for (const entry of staticPages) {
    const encoded = encodeSitemapUrl(entry.url);
    if (!seenUrls.has(encoded)) {
      seenUrls.add(encoded);
      sitemapEntries.push({ ...entry, url: encoded, section: 'static' });
    }
  }

  // Fetch all data with pagination to avoid API timeouts
  const [categories, brands, pages, articles, blogCategories, blogTags] = await Promise.allSettled([
    getCategories(undefined, { perPage: 500 }),
    getAllBrands(),
    getAppPages(),
    getAllArticles(),
    getBlogCategories(),
    getBlogTags(),
  ]);

  // Product URLs derive their subcategory via getProductPrimarySubCategory (same source
  // as canonical), so no separate id→slug map is needed here.

  // Fetch products in smaller batches with pagination
  try {
    const crawl = await crawlAllProducts();
    const allProducts: Product[] = crawl.products;

    // Robustness: a product-less sitemap is the regression we just fixed. If the catalogue crawl
    // yields 0 products, THROW so unstable_cache does NOT memoize a degraded (categories-only)
    // sitemap for an hour — the next request retries instead.
    if (allProducts.length === 0) {
      throw new Error('[sitemap] getAllProducts returned 0 products — refusing to cache a product-less sitemap');
    }

    /*
     * COMPLETENESS, NOT MERELY NON-EMPTINESS.
     *
     * The check above only ever rejected zero. Once the catalogue needs 200 requests instead of 3,
     * the interesting failure is not "nothing came back", it is "most of it came back": a partial
     * crawl is non-empty, so it passed, and unstable_cache then served it as the truth for an hour.
     * That is a removal signal aimed at Google, published by us, on purpose, from a 200 response.
     *
     * So: compare DISTINCT products fetched against the total the API itself reported.
     *
     * The tolerance is `drift`, not a magic percentage. Products are paginated created_at DESC, so
     * every row inserted while we walk the pages pushes one row across a page boundary behind us —
     * k concurrent inserts can hide at most k rows from an offset crawl. `drift` is measured (max
     * reported total - min reported total), so when the catalogue is quiet it is 0 and this is a
     * strict equality check; during a promotion wave it relaxes by exactly as much as the wave
     * moved and no more. A shortfall larger than that is a real hole, and holes must 503.
     */
    if (crawl.expectedTotal >= 0) {
      const minimumAcceptable = Math.max(0, crawl.expectedTotal - crawl.drift);
      if (allProducts.length < minimumAcceptable) {
        throw new Error(
          `[sitemap] product crawl incomplete: ${allProducts.length} distinct products for a reported total of ${crawl.expectedTotal} ` +
          `(drift ${crawl.drift}, ${crawl.duplicates} duplicate rows, ${crawl.requests} requests) — refusing to cache a truncated sitemap`
        );
      }
      if (crawl.duplicates > 0 || crawl.unkeyed > 0) {
        // Not fatal (duplicates collapse, id-less rows are kept), but it means the paginated sort
        // is unstable or the listing stopped selecting `id`. Both are worth seeing in the logs
        // before they turn into a shortfall that does 503.
        console.warn(
          `[sitemap] product crawl anomalies: ${crawl.duplicates} duplicate rows, ${crawl.unkeyed} rows without an id ` +
          `(${allProducts.length}/${crawl.expectedTotal} distinct products over ${crawl.requests} requests)`
        );
      }
    } else {
      // No reported total to compare against, so completeness is unverifiable — say so rather than
      // imply the sitemap was checked. What the crawl DID do is stated, because the two states are
      // not equally safe: `row-count` means it walked to a short page (the end of the catalogue as
      // the API paginates it) with only the zero-guard above protecting the result, while `metadata`
      // here means a page count arrived but no total did.
      console.warn(
        `[sitemap] /all_products carried no reported total — crawl completeness could not be verified. ` +
        `Walked to the end by ${crawl.terminatedBy}: ${allProducts.length} distinct products over ${crawl.requests} requests.`
      );
    }

    {
      // CRITICAL: /all_products returns products with only `sous_categorie_id` (no relation), so
      // getProductPrimarySubCategory() returned undefined for EVERY product and the filter below
      // dropped the ENTIRE catalogue from the sitemap (0 product URLs → Google couldn't discover any
      // product page). Rebuild the subcategory relation from the categories payload (which ships
      // sous_categories) so all real products land in the sitemap with their canonical URL.
      // (allProducts() has eager-loaded `sousCategorie` since the pagination fix, so this is now
      // usually a no-op — it stays because it is also the only thing covering products whose
      // relation the endpoint fails to load.)
      const categoriesForEnrich =
        categories.status === 'fulfilled' && Array.isArray(categories.value) ? categories.value : [];
      const enrichedProducts = enrichProductsWithSubcategory(allProducts, categoriesForEnrich);
      let droppedNoSubcategory = 0;

      // Record which listings have something to show, so empty ones can be left out below.
      for (const p of enrichedProducts) {
        if (!(p.publier == 1 || p.publier === undefined)) continue;
        const brandId = Number((p as { brand_id?: unknown }).brand_id);
        if (Number.isFinite(brandId) && brandId > 0) brandIdsWithProducts.add(brandId);
        const subSlug = getProductPrimarySubCategory(p)?.slug;
        if (subSlug) subCategorySlugsWithProducts.add(subSlug.toLowerCase());
      }

      const productUrls = enrichedProducts
        .filter((p: Product) => {
          if (!p.slug) return false;
          if (!(p.publier == 1 || p.publier === undefined)) return false;
          // Never submit a URL that renders <meta robots="noindex"> — that is exactly the
          // "Submitted URL marked noindex" bucket in Search Console. Same rule already applied to
          // tags below; products were missing it, which did not matter while every product was
          // indexable and matters a great deal once a catalogue is published in waves.
          //
          // `!== false` rather than `=== true`: a product with no robots field is indexable, so
          // the 309 existing products are unaffected.
          //
          // BOTH SHAPES ARE READ, AND THE FLAT COLUMN IS THE ONE THAT ACTUALLY ARRIVES.
          // `seo.robots.index` is emitted by ProductDetailResource, which serves /product_details —
          // NOT /all_products, which is what this crawl calls. Its projection
          // (ApisController::PRODUCT_LISTING) returns flat columns, and until it was given
          // `seo_robots_index` it carried no robots field at all: `p.seo?.robots?.index` was
          // `undefined` for 100% of rows, so `undefined !== false` was a constant true and this
          // filter excluded nothing it was written to exclude. Publishing 5,000 imported products
          // with publier=1 and seo_robots_index=0 — the exact state CatalogIHerbPromote creates —
          // would have submitted 5,000 URLs that render <meta robots="noindex">.
          const seoObj = (p as { seo?: { robots?: { index?: boolean } } })?.seo?.robots?.index;
          const flatColumn = (p as { seo_robots_index?: boolean | number | null }).seo_robots_index;
          // The column is cast to boolean by the model, but a tinyint 0 is worth tolerating in case
          // any other producer of this payload skips the cast.
          const robotsIndex = seoObj ?? (flatColumn == null ? undefined : Boolean(flatColumn));
          return robotsIndex !== false;
        })
        .map((p: Product) => {
          // Derive the subcategory the SAME way the canonical/link builder does
          // (getProductPrimarySubCategory → sous_categories[0] then sous_categorie),
          // NOT via a separate sous_categorie_id map. When the two disagree, the sitemap
          // lists /A/slug while the page's rel=canonical says /B/slug → Google reports
          // "Google chose a different canonical". Using one source keeps them identical.
          const subCategorySlug = getProductPrimarySubCategory(p)?.slug;
          // Skip products with no resolvable subcategory instead of emitting
          // /shop/{slug}, which middleware immediately 301s → a self-redirecting
          // sitemap URL (a "page with redirect" in Search Console).
          if (!subCategorySlug) {
            droppedNoSubcategory++;
            return null;
          }
          const coverImg = toSitemapImage(p.cover);
          return {
            url: `${BASE_URL}/${encodeURIComponent(subCategorySlug)}/${encodeURIComponent(p.slug)}`,
            lastModified: getLastModified(p as ItemWithDates),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
            // Stable chunk key. See sitemapXml.ts: child sitemaps are id BANDS, not array slices.
            productId: Number(p.id),
            ...(coverImg ? { images: [coverImg] } : {}),
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);
      for (const entry of productUrls) {
        const encoded = encodeSitemapUrl(entry.url);
        if (!seenUrls.has(encoded)) {
          seenUrls.add(encoded);
          sitemapEntries.push({ ...entry, url: encoded, section: 'products' });
        }
      }

      /*
       * Dropping a product with no subcategory is correct (see above) but it is INVISIBLE: the
       * response is still 200, the file is just shorter. At 309 products a mapping bug costs a
       * handful of URLs; at 20,000 a promotion that writes products.sous_categorie_id but not the
       * product_sous_category pivot row can quietly delete thousands of URLs from the sitemap with
       * every status code still green. Count them out loud so the loss has a number attached.
       */
      if (droppedNoSubcategory > 0) {
        console.warn(
          `[sitemap] ${droppedNoSubcategory} published product(s) omitted: no resolvable subcategory, so the only URL available would be /shop/{slug}, which middleware 301s`
        );
      }

      /*
       * THE INVARIANT HAS TO HOLD ON WHAT IS EMITTED, NOT ON WHAT WAS FETCHED.
       *
       * Both guards further up — "0 products, refuse" and the completeness check against
       * pagination.total — run on the RAW crawl, before any per-product filter. Products are
       * dropped much later, here, when getProductPrimarySubCategory() resolves nothing, and until
       * now the only consequence was the console.warn above. Nothing compared emitted product URLs
       * against the catalogue they came from.
       *
       * So a promotion wave that writes products.sous_categorie_id pointing at a subcategory row
       * that is missing or renamed (hard constraint 2 of this project) could delete three quarters
       * of the product URLs while every guard passed and every status code stayed 200 — a mass
       * removal signal published deliberately from a healthy response. It compounds, because
       * subCategorySlugsWithProducts is built from the SAME resolver, so those subcategories' own
       * listing URLs vanish with them; and in the total-failure case buildSitemapFiles simply skips
       * the empty products section while the index still answers 200 with its 11 static pages.
       *
       * Half is a deliberately loose threshold, not a quality bar: a catalogue where the majority of
       * published products cannot be given a canonical URL is broken in a way no sitemap should
       * paper over, and anything short of that stays a warning so a handful of genuinely
       * uncategorised products can never take the whole file down.
       */
      const eligibleProducts = productUrls.length + droppedNoSubcategory;
      if (
        eligibleProducts > 0 &&
        droppedNoSubcategory > eligibleProducts * MAX_UNROUTABLE_PRODUCT_FRACTION
      ) {
        throw new Error(
          `[sitemap] ${droppedNoSubcategory} of ${eligibleProducts} publishable product(s) have no resolvable subcategory ` +
          `— only ${productUrls.length} product URL(s) would be emitted. Refusing to publish a sitemap that removes the ` +
          `majority of the catalogue; check products.sous_categorie_id and the product_sous_category pivot`
        );
      }
    }
  } catch (error) {
    console.error('Error processing products for sitemap:', error);
    // Rethrow: never let unstable_cache store a sitemap whose product crawl failed transiently
    // (that would serve a product-less sitemap for the full 1h TTL).
    throw error;
  }

  try {
    if (categories.status === 'fulfilled' && Array.isArray(categories.value) && categories.value.length > 0) {
      categories.value.forEach((category: Category) => {
        if (!category.slug) return;
        liveCategorySlugs.add(category.slug.toLowerCase());
        (category.sous_categories ?? []).forEach((sc: SubCategory) => {
          if (sc.slug) liveCategorySlugs.add(sc.slug.toLowerCase());
        });
        const catIdx =
          category.sitemap_include !== false &&
          category.robots_index !== false;
        if (catIdx) {
          const url = `${BASE_URL}/${encodeURIComponent(category.slug.toLowerCase())}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: getLastModified(category as ItemWithDates),
              changeFrequency: normalizeSitemapChangefreq(category.sitemap_changefreq ?? undefined),
              priority: clampPriority(category.sitemap_priority ?? undefined, 0.85),
              section: 'listings',
            });
          }
        }
        if (category.sous_categories && Array.isArray(category.sous_categories)) {
          category.sous_categories.forEach((subCategory: SubCategory) => {
            if (!subCategory.slug) return;
            if (
              subCategory.sitemap_include === false ||
              subCategory.robots_index === false
            ) {
              return;
            }
            // Empty listing = soft 404. Skip a subcategory with no products UNLESS it has an
            // editorial content file, in which case the page still says something useful and is
            // worth indexing on its own merits. 6 of 41 subcategories currently have no products.
            if (
              !subCategorySlugsWithProducts.has(subCategory.slug.toLowerCase()) &&
              !contentFileSlugs.has(subCategory.slug.toLowerCase())
            ) {
              return;
            }
            const url = `${BASE_URL}/${encodeURIComponent(subCategory.slug.toLowerCase())}`;
            if (!seenUrls.has(url)) {
              seenUrls.add(url);
              sitemapEntries.push({
                url,
                lastModified: getLastModified(subCategory as ItemWithDates),
                changeFrequency: normalizeSitemapChangefreq(subCategory.sitemap_changefreq ?? undefined),
                priority: clampPriority(subCategory.sitemap_priority ?? undefined, 0.8),
                section: 'listings',
              });
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error processing categories for sitemap:', error);
  }

  // Double Insurance: add category/subcategory slugs that have localized premium SEO JSON content,
  // but ONLY when the slug corresponds to a category/subcategory that actually exists in the backend.
  // Emitting content-file names blindly previously pushed 404 URLs (/whey-protein), redirecting URLs
  // (/mass-gainer → /gainers-proteines) and mixed-case duplicates (/Intra-Workout) into the sitemap.
  try {
    const seoSlugs = await listCategorySeoSlugs();
    if (Array.isArray(seoSlugs) && seoSlugs.length > 0) {
      seoSlugs.forEach((slug) => {
        const clean = (slug ?? '').trim();
        if (!clean) return;
        // Gate against live backend slugs (case-insensitive). If the category API failed to load,
        // liveCategorySlugs is empty and we skip these rather than risk emitting broken URLs.
        if (!liveCategorySlugs.has(clean.toLowerCase())) return;
        // Lowercase like the taxonomy branches above. These slugs come from FILENAMES in
        // content/categories/, and one of them is capitalised (Intra-Workout.json) — which is how
        // a single uppercase URL survived the earlier pass and kept being submitted while its
        // canonical pointed at the lowercase form. A sitemap URL whose canonical disagrees with it
        // is exactly the "Duplicate, Google chose a different canonical" signal we are removing.
        const url = `${BASE_URL}/${encodeURIComponent(clean.toLowerCase())}`;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          sitemapEntries.push({
            url,
            changeFrequency: 'weekly',
            priority: 0.8,
            section: 'listings',
          });
        }
      });
    }
  } catch (error) {
    console.error('Error processing SEO content slugs for sitemap:', error);
  }

  try {
    if (brands.status === 'fulfilled' && Array.isArray(brands.value) && brands.value.length > 0) {
      brands.value.forEach((brand: Brand) => {
        // A brand page with no products is a heading and nothing to buy — a soft 404, and there
        // is no editorial fallback for brands. 13 of 55 brands (API, MYPROTEIN, MONSTER, MUTANT…)
        // were being submitted empty. Self-correcting: the day a brand gets a product it returns.
        if (brand.id && brand.designation_fr && brandIdsWithProducts.has(Number(brand.id))) {
          const url = `${BASE_URL}/${nameToSlug(brand.designation_fr)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: getLastModified(brand as ItemWithDates),
              changeFrequency: 'weekly' as const,
              priority: 0.75,
              section: 'listings',
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error processing brands for sitemap:', error);
  }

  try {
    if (pages.status === 'fulfilled' && Array.isArray(pages.value) && pages.value.length > 0) {
      pages.value
        // Gate like categories: don't submit CMS pages an admin marked noindex / excluded from the
        // sitemap (otherwise Search Console flags "Submitted URL marked noindex").
        .filter((page: Page) =>
          page.slug && page.slug !== 'api'
          && (page as { robots_index?: boolean }).robots_index !== false
          && (page as { sitemap_include?: boolean }).sitemap_include !== false
        )
        .forEach((page: Page) => {
          const url = `${BASE_URL}/${encodeURIComponent(page.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: getLastModified(page as ItemWithDates),
              changeFrequency: 'monthly' as const,
              priority: 0.55,
              section: 'pages',
            });
          }
        });
    }
  } catch (error) {
    console.error('Error processing pages for sitemap:', error);
  }

  try {
    if (articles.status === 'fulfilled' && Array.isArray(articles.value) && articles.value.length > 0) {
      const articleUrls = articles.value
        .filter((a: Article) => a.slug)
        .map((a: Article) => {
          const url = `${BASE_URL}/blog/${encodeURIComponent(a.slug)}`;
          const coverImg = toSitemapImage(a.cover);
          return {
            url,
            lastModified: getLastModified(a as ItemWithDates),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
            section: 'blog' as const,
            ...(coverImg ? { images: [coverImg] } : {}),
          };
        });
      for (const entry of articleUrls) {
        if (!seenUrls.has(entry.url)) {
          seenUrls.add(entry.url);
          sitemapEntries.push(entry);
        }
      }
    }
  } catch (error) {
    console.error('Error processing articles for sitemap:', error);
  }

  try {
    if (blogCategories.status === 'fulfilled' && Array.isArray(blogCategories.value)) {
      blogCategories.value.forEach((cat) => {
        if (cat.slug) {
          const url = `${BASE_URL}/blog/category/${encodeURIComponent(cat.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              changeFrequency: 'weekly' as const,
              priority: 0.55,
              section: 'blog',
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error processing blog categories for sitemap:', error);
  }

  try {
    if (blogTags.status === 'fulfilled' && Array.isArray(blogTags.value)) {
      blogTags.value.forEach((tag) => {
        // Blog tag pages are noindex UNLESS a tag explicitly opts in (blog/tag/[slug] sets
        // index = seo.robots.index === true). Only sitemap the opt-in ones, so we never submit a
        // URL that renders <meta robots=noindex> ("Submitted URL marked noindex" in Search Console).
        const tagIndexable = (tag as { seo?: { robots?: { index?: boolean } } })?.seo?.robots?.index === true;
        if (tag.slug && tagIndexable) {
          const url = `${BASE_URL}/blog/tag/${encodeURIComponent(tag.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              changeFrequency: 'weekly' as const,
              priority: 0.5,
              section: 'blog',
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error processing blog tags for sitemap:', error);
  }

  return sitemapEntries.filter((entry) => isValidUrl(entry.url));
}

/**
 * Cached sitemap entries — the single most important line in this file at catalogue scale.
 *
 * The /sitemap.xml route is `force-dynamic` (the API is unreachable from CI at build time, and a
 * prerendered sitemap is how you bake an empty one), which makes its `revalidate` a no-op. So
 * without this, EVERY crawler poll of /sitemap.xml or of any child re-ran the whole crawl:
 * 200 paginated getAllProducts requests at 20,000 products, plus categories + brands + pages +
 * articles + blog cats/tags. unstable_cache memoises the computed payload for 1h and ALL of it is
 * shared — index + N children = one upstream pass, not N+1.
 *
 * Deliberately ONE cache entry rather than one per section: separate entries can expire at
 * different moments, and an index that disagrees with the children it points at is worse than a
 * slightly stale one that agrees with itself.
 *
 * Busted on demand with revalidateTag('sitemap'), which must not happen once per product or every
 * bust opens another window for a crawler poll to pay for a full catalogue crawl that the next bust
 * discards. That is enforced on the producing side rather than requested in a comment:
 * App\Services\Seo\SeoNotifier::bustSitemapCache() coalesces to at most one bust per process per
 * minute, so a promotion wave — one artisan process — refreshes this entry once, after the products
 * it created are committed, not once per product.
 */
const cachedSitemapEntries = unstable_cache(
  computeSitemapEntries,
  ['sitemap-entries'],
  { revalidate: 3600, tags: ['sitemap'] }
);

/**
 * Next's data cache silently refuses any single item over 2MB.
 *
 * node_modules/next/dist/server/lib/incremental-cache/index.js (15.5.9) computes
 * `const itemSize = JSON.stringify(data).length` and, when `ctx.fetchCache` is set and there is no
 * custom cacheHandler, `console.warn`s and RETURNS BEFORE cacheHandler.set — nothing is written to
 * disk or memory. unstable_cache always sets fetchCache (spec-extension/unstable-cache.js) and
 * next.config.js declares no cacheHandler, so the limit applies to the entry above.
 */
const DATA_CACHE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * How long a payload the data cache refused may be reused from this process's own memory.
 *
 * Five minutes, not the full hour, and that is a deliberate trade. It is long enough to collapse
 * the burst this is actually defending against — Googlebot fetching /sitemap.xml and then each of
 * its ~10 children in quick succession, which with no cache at all is 11 independent full crawls,
 * ~2,200 upstream GETs against a 600 GET/min-per-IP budget, i.e. a rate-limit that turns every
 * sitemap URL into a 503 rather than merely a slow 200. It is short enough that it neither pins
 * tens of MB of entries in the SSR container's heap for an hour nor leaves revalidateTag('sitemap')
 * ignored for one.
 */
const SHARED_CRAWL_WINDOW_MS = 5 * 60 * 1000;

let sharedCrawl: { at: number; entries: SectionedSitemapEntry[] } | null = null;
let inFlight: Promise<SectionedSitemapEntry[]> | null = null;
let dataCacheRefusesPayload = false;

/** Exactly what Next measures before deciding whether to store an unstable_cache result. */
function dataCacheItemBytes(entries: SectionedSitemapEntry[]): number {
  // Next stores { kind:'FETCH', data:{ headers, body, status, url }, revalidate } where `body` is
  // JSON.stringify(result), then measures JSON.stringify() of the whole ENVELOPE — so the body is a
  // JSON string nested inside JSON and every quote inside it costs a second character. Measured over
  // the exact entry shape computeSitemapEntries pushes, that escaping adds ~9% (278 → 302 bytes per
  // entry), which is the difference between alarming at ~7,000 URLs and alarming at ~7,500. The +128
  // is the constant envelope around the body; over-estimating slightly is the safe direction,
  // because the cost of the fallback engaging early is nil.
  return JSON.stringify(JSON.stringify(entries)).length + 128;
}

/**
 * The single entry point. Everything above is what it caches; this is what makes the cache hold.
 *
 * ── WHY unstable_cache ALONE IS NOT ENOUGH ONCE THE CATALOGUE GROWS ────────────────────────
 * Measured over the exact entry shape computeSitemapEntries pushes (product URL, ISO lastModified,
 * changeFrequency, priority, productId, one CDN image URL, section): ~302 bytes per entry as Next
 * measures it, so 5,000 entries = 1.51MB (stored), 8,000 = 2.41MB (refused). The 2MB ceiling falls
 * somewhere around 7,000 URLs — invisible at today's ~520, and crossed partway through the iHerb
 * import. Past that point unstable_cache still RUNS computeSitemapEntries on every call and then
 * silently stores nothing, so the "index + N children = one upstream pass" property the docblock
 * above promises quietly becomes N+1 full crawls per crawl, `revalidateTag('sitemap')` becomes a
 * dead letter, and the 1h TTL becomes a comment. None of that is visible in a status code.
 *
 * So: keep the data cache (it is still the right thing while the payload fits — cross-process,
 * survives a restart, honours the tag instantly), measure what it was asked to store, and when that
 * is over the ceiling fall back to a process-local snapshot for a short window. The fallback is not
 * a replacement for the data cache; it is the floor that keeps one crawler burst from becoming
 * eleven crawls. The permanent fix for a 47,537-product catalogue is a `cacheHandler` in
 * next.config.js, which the size check above is explicitly skipped for — the warning below says so.
 */
export async function getSitemapEntries(): Promise<SectionedSitemapEntry[]> {
  if (
    dataCacheRefusesPayload &&
    sharedCrawl !== null &&
    Date.now() - sharedCrawl.at < SHARED_CRAWL_WINDOW_MS
  ) {
    return sharedCrawl.entries;
  }

  // Concurrent callers share one crawl even on a cold cache. The index route and its children are
  // separate requests that arrive within milliseconds of each other, so without this the very first
  // burst after a deploy is N simultaneous 200-request crawls.
  if (inFlight !== null) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const entries = await cachedSitemapEntries();
      const bytes = dataCacheItemBytes(entries);

      if (bytes > DATA_CACHE_MAX_BYTES) {
        if (!dataCacheRefusesPayload) {
          console.warn(
            `[sitemap] the Next data cache is refusing this payload: ${entries.length} entries serialize to ` +
            `${bytes} bytes, over its hard 2MB per-item limit, so unstable_cache is storing nothing and ` +
            `revalidateTag('sitemap') has no effect. Falling back to a ${SHARED_CRAWL_WINDOW_MS / 1000}s in-process ` +
            `snapshot. Configure a cacheHandler in next.config.js to lift the limit.`
          );
        }
        dataCacheRefusesPayload = true;
        sharedCrawl = { at: Date.now(), entries };
      } else {
        // Back under the ceiling (or never over it): the data cache is authoritative again, and the
        // snapshot is dropped so a revalidateTag bust is visible on the very next request.
        dataCacheRefusesPayload = false;
        sharedCrawl = null;
      }

      return entries;
    } finally {
      // Cleared on rejection too: a crawl that threw must not pin every later request to the same
      // failure. The route answers 503 + Retry-After and the next request retries from scratch.
      inFlight = null;
    }
  })();

  return inFlight;
}
