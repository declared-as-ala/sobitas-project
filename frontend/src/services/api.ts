import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiFetch, ApiError } from '@/services/http';
// The sitemap's verified paginated crawl, reused by getAllBrands so the brand PAGES and the brand
// URLs in the sitemap are built from the same rows. See getAllBrands for what the one-shot fetch
// this replaced actually cost.
import { crawlPaginated } from '@/util/sitemapCrawl';
import { shopQueryToApiParams, SHOP_PER_PAGE, type ShopQuery, type ShopFacets } from '@/util/shopQuery';
import type {
  Product,
  Category,
  Brand,
  Article,
  Order,
  OrderDetail,
  QuickOrderPayload,
  QuickOrderResponse,
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ContactRequest,
  NewsletterRequest,
  Coordinate,
  Service,
  FAQ,
  Page,
  SeoPage,
  SiteNavigationItem,
  HomeData,
  AccueilData,
  Review,
  PackQuote,
  PointsHistory,
  ReviewReply,
  MemberProfile,
  CustomerReview,
  ReviewAccess,
  ReviewDashboard,
  ReviewSubmitResult,
  MemberDashboardData,
} from '@/types';
import type { BackendOrderPayload } from '@/lib/orderPayload';
import { SITE_LOGO_PUBLIC_PATH } from '@/constants/branding';
import { withCategorySeoEntityFallbacks, type CategorySeoFromApi } from '@/util/resolveCategorySeo';

// In browser on localhost: use same-origin API proxy to avoid CORS (next.config.js rewrites /api-proxy to backend).
// Storage URL is always production so server and client render the same image URLs (avoids hydration mismatch).
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/i.test(window.location.hostname)) {
    return `${window.location.origin}/api-proxy`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';
}
const API_URL = getApiBaseUrl();
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL ?? 'https://admin.protein.tn/storage';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s - avoids ETIMEDOUT when backend is slow
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Prevent caching at all levels (browser, proxy, nginx)
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const locale = localStorage.getItem('sobitas-locale');
      if (locale === 'fr' || locale === 'en' || locale === 'ar') {
        config.headers['Accept-Language'] = locale;
        config.headers['X-Locale'] = locale;
        config.params = { ...config.params, locale };
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: retry on 429 (max 2, backoff 400/900ms + jitter) and ETIMEDOUT/ECONNRESET, handle 401
const RETRY_429_DELAYS = [400, 900];
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { config?: { _retryCount?: number } }) => {
    const retryCount = error.config?._retryCount ?? 0;
    const status = error.response?.status;
    const is429 = status === 429 && retryCount < 2;
    const isNetwork =
      (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') &&
      retryCount < 2;
    const delay = is429
      ? RETRY_429_DELAYS[retryCount]! * (0.8 + Math.random() * 0.4)
      : 1500;
    if ((is429 || isNetwork) && error.config) {
      (error.config as any)._retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, Math.floor(delay)));
      return api.request(error.config);
    }
    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/login' || path === '/register') return Promise.reject(error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to get storage URL - uses NEXT_PUBLIC_STORAGE_URL (same default as next.config.js for hydration)
// Rewrites localhost URLs from backend so images load from deployed backend
// For blog images, adds cache busting parameter based on updated_at or created_at
export const getStorageUrl = (path?: string, cacheBust?: string | number): string => {
  if (!path) return '';
  const base = STORAGE_URL.replace(/\/$/, '');
  let finalUrl = '';
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const pathPart = u.pathname.replace(/^\/storage\/?/, '');
        finalUrl = pathPart ? `${base}/${pathPart}` : base;
      } else {
        finalUrl = path;
      }
    } catch {
      finalUrl = path;
    }
  } else {
    const clean = path.replace(/^\/+/, '');
    finalUrl = clean ? `${base}/${clean}` : base;
  }
  
  // Add cache busting for blog images
  if (cacheBust) {
    const timestamp = typeof cacheBust === 'number' 
      ? cacheBust 
      : typeof cacheBust === 'string' 
        ? new Date(cacheBust).getTime() 
        : Date.now();
    if (!isNaN(timestamp)) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}v=${timestamp}`;
    }
  }
  
  return finalUrl;
};

/** True if the URL is from our storage (storage-proxy or admin backend). Use to set unoptimized on next/image. */
export const isStorageImageUrl = (url: string): boolean =>
  typeof url === 'string' &&
  (url.includes('storage-proxy') || url.includes('admin.protein.tn'));

// ==================== PUBLIC API ENDPOINTS ====================

// Homepage & Accueil
export const getAccueil = async (): Promise<AccueilData> => {
  try {
    const response = await api.get<AccueilData>('/accueil');
    // Ensure response.data exists and has the expected structure
    if (!response.data) {
      console.warn('[getAccueil] API returned empty data, using defaults');
      return {
        categories: [],
        last_articles: [],
        ventes_flash: [],
        new_product: [],
        packs: [],
        best_sellers: [],
      };
    }
    const ensureReviewCount = (products: any[]): any[] => {
      if (!Array.isArray(products)) return products;
      return products.map((p) => {
        if (!p || typeof p !== 'object') return p;
        const arr = p.reviews ?? p.avis;
        const count = p.reviews_count ?? p.review_count ?? p.avis_count ?? p.nombre_avis;
        if (count != null && count !== '') return p;
        if (Array.isArray(arr) && arr.length > 0) {
          const n = arr.filter((r: any) => typeof r?.stars === 'number' && (r.publier === undefined || r.publier === 1)).length;
          return { ...p, reviews_count: n, review_count: n };
        }
        return p;
      });
    };
    return {
      categories: response.data.categories || [],
      last_articles: response.data.last_articles || [],
      ventes_flash: ensureReviewCount(response.data.ventes_flash || []),
      new_product: ensureReviewCount(response.data.new_product || []),
      packs: ensureReviewCount(response.data.packs || []),
      best_sellers: ensureReviewCount(response.data.best_sellers || []),
    };
  } catch (error) {
    console.error('[getAccueil] API error:', error);
    // On the server, rethrow so the homepage can avoid CACHING a product-less render
    // (see getHomeData + loadForCache). In the browser keep failing soft.
    if (typeof window === 'undefined') throw error;
    // Return empty structure on error
    return {
      categories: [],
      last_articles: [],
      ventes_flash: [],
      new_product: [],
      packs: [],
      best_sellers: [],
    };
  }
};

export const getHome = async (): Promise<HomeData> => {
  const response = await api.get<HomeData>('/home');
  return response.data;
};

// Categories
export const getCategories = async (
  signal?: AbortSignal,
  opts?: { perPage?: number }
): Promise<Category[]> => {
  const params =
    opts?.perPage != null && opts.perPage > 0 ? { per_page: Math.min(opts.perPage, 1000) } : undefined;
  const response = await api.get<any>('/categories', { signal, params });
  const raw = response.data;
  // Backend returns paginated response {data: [...], meta: {}, links: {}}
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

// getSlides() removed — it had zero call sites for the entire life of the file. Hero slides are
// now fetched server-side by getServerSlides() in services/siteChrome.server.ts, which is the
// only correct place: the first slide is the mobile LCP element and must be in the SSR HTML
// alongside a matching <link rel="preload">, which a client-side fetch can never produce.

// CMS pages for footer (Services & Ventes) from admin.protein.tn
export interface CmsPage {
  id: number;
  title: string;
  slug?: string;
}

/** Fallback slug by page id when API list does not return slug (e.g. /api/pages returns only id + title). */
const CMS_PAGE_SLUG_BY_ID: Record<number, string> = {
  2: 'conditions-generale-de-ventes-protein.tn',
  5: 'qui-sommes-nous',
  7: 'politique-de-remboursement',
  8: 'politique-des-cookies',
  9: 'proteine-tunisie',
};

/** Static list when API fails or returns empty so "Services & Ventes" always shows (excludes "Qui sommes nous"). */
const CMS_PAGES_FALLBACK: CmsPage[] = [
  { id: 2, title: 'Conditions générales de ventes - Proteine Tunisie', slug: 'conditions-generale-de-ventes-protein.tn' },
  { id: 7, title: 'Politique de remboursement', slug: 'politique-de-remboursement' },
  { id: 8, title: 'Politique des Cookies', slug: 'politique-des-cookies' },
  { id: 9, title: 'Proteine Tunisie', slug: 'proteine-tunisie' },
];

export const getCmsPages = async (): Promise<CmsPage[]> => {
  try {
    const response = await api.get<any>('/pages', { timeout: 10000 });
    const raw = response.data;
    // API returns either a flat array or a paginated { data: [...], meta, links } shape
    const list: CmsPage[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    if (list.length === 0) return CMS_PAGES_FALLBACK;
    return list.map((p) => ({
      ...p,
      slug: p.slug ?? CMS_PAGE_SLUG_BY_ID[p.id] ?? slugFromTitle(p.title),
    }));
  } catch {
    return CMS_PAGES_FALLBACK;
  }
};

/** Generate URL-safe slug from title when API does not provide slug. */
function slugFromTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Coordinates
export const getCoordinates = async (): Promise<Coordinate> => {
  const response = await api.get<Coordinate>('/coordonnees');
  return response.data;
};

/** Absolute URL for site logo in print/PDF — uses static `public/sobitas-logo.png`. */
export async function getSiteLogoUrlResolved(): Promise<string> {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${SITE_LOGO_PUBLIC_PATH}`;
  }
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn').replace(/\/$/, '');
  return `${base}${SITE_LOGO_PUBLIC_PATH}`;
}

// Products
export type ProductsResponse = {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  pagination?: { total: number; current_page: number; per_page: number; last_page: number };
};

/**
 * ONE page of ANY paginated backend list, returned RAW.
 *
 * The sitemap crawl needs the envelope, not a tidied array: `meta.total` / `pagination.last_page`
 * are how it proves it walked to the end, and every existing helper in this file throws exactly
 * that away. getAllArticles returns `data`, getAllBrands returns `data`, getCategories returns
 * `data` — so a caller reading any of them cannot tell 100-of-100 from 100-of-224, which is
 * precisely how 124 published blog articles stayed out of the sitemap with no warning anywhere.
 *
 * Deliberately on the SAME axios instance as every other call in this file. A second HTTP stack
 * would get its own timeouts, its own interceptors and its own share of the API's per-IP budget.
 */
export const getApiPage = async (
  path: string,
  page: number,
  perPage: number
): Promise<unknown> => {
  const response = await api.get(path, { params: { page, per_page: perPage } });
  return response.data;
};

export const getAllProducts = async (params?: {
  page?: number;
  perPage?: number;
  search?: string;
  brand_id?: number;
  min_price?: number;
  max_price?: number;
  sort?: string;
}): Promise<ProductsResponse> => {
  try {
    const requestParams: Record<string, number | string> = {
      per_page: params?.perPage ?? 24,
      page: params?.page ?? 1,
    };
    if (params?.search?.trim()) requestParams.search = params.search.trim();
    if (params?.brand_id != null) requestParams.brand_id = params.brand_id;
    if (params?.min_price != null) requestParams.min_price = params.min_price;
    if (params?.max_price != null) requestParams.max_price = params.max_price;
    if (params?.sort) requestParams.sort = params.sort;

    const response = await api.get('/all_products', { params: requestParams });
    if (!response.data) {
      return { products: [], brands: [], categories: [] };
    }
    const raw = response.data;
    const products = Array.isArray(raw.products) ? raw.products : (raw.products?.data ?? []);
    return {
      products,
      brands: raw.brands || [],
      categories: raw.categories || [],
      pagination: raw.pagination
        ? {
            total: raw.pagination.total,
            current_page: raw.pagination.current_page,
            per_page: raw.pagination.per_page,
            last_page: raw.pagination.last_page,
          }
        : undefined,
    };
  } catch (error) {
    console.error('[getAllProducts] API error:', error);
    // On the server (SSR / ISR / `next build`), rethrow so the calling page can avoid caching an
    // empty render (see loadForCache) — otherwise a build-time failure bakes an empty product list
    // for the whole revalidate window. In the browser we keep failing soft so client-side filtering
    // stays resilient.
    if (typeof window === 'undefined') throw error;
    return { products: [], brands: [], categories: [] };
  }
};

/**
 * EVERY published product, by walking the paginated /all_products endpoint.
 *
 * ── THE REGRESSION THIS EXISTS TO FIX ─────────────────────────────────────────────────────
 * /api/all_products used to ignore `per_page` and return the whole catalogue in one response.
 * Server-side pagination was then added, with a comment stating "Nothing on the frontend has to
 * change" — and for the sitemap crawler, which loops on `pagination.last_page`, that was true.
 * It was NOT true for the three pages that render the shop, because they filter, sort and
 * paginate CLIENT-SIDE over whatever array they are handed:
 *
 *   ShopPageClient.tsx  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
 *                       return filteredProducts.slice(startIndex, endIndex);
 *
 * `handlePageChange` only sets a number — it never fetches another page. So the moment the
 * server honoured `per_page: 24`, the boutique could display at most 24 products out of 410,
 * the pager showed a single page, and every brand/category/price filter silently operated on
 * 6% of the catalogue. This hit the 309 original hand-built products, not just imported ones,
 * and every status code stayed 200 throughout.
 *
 * ── WHY A WALK RATHER THAN "ASK FOR EVERYTHING" ───────────────────────────────────────────
 * ApisController::MAX_PER_PAGE caps a single request at 100, so `per_page: 100000` silently
 * returns 100 — the same bug wearing a different number. The page count is read from the
 * server's own `last_page`, never assumed from the row count.
 *
 * ── THE CAP IS REAL AND IT IS LOUD ────────────────────────────────────────────────────────
 * Handing the browser the entire catalogue is fine at 410 products and is NOT fine at 19,000,
 * which is where the iHerb import is heading. So this stops at `cap` and says so, in the
 * console and in the returned `truncated` flag. When that warning starts firing, the fix is
 * server-side filtering in ShopPageClient — not a bigger cap. Truncation must never be the
 * quiet outcome, which is exactly the lesson sitemapData.ts already carries.
 */
export const getAllProductsComplete = async (
  opts?: { cap?: number }
): Promise<ProductsResponse & { truncated?: boolean }> => {
  const PER_PAGE = 100; // ApisController::MAX_PER_PAGE — a larger value is silently clamped.
  const cap = opts?.cap ?? 3000;

  const first = await getAllProducts({ perPage: PER_PAGE, page: 1 });
  const seen = new Set<number>();
  const products: Product[] = [];

  const absorb = (rows: unknown) => {
    if (!Array.isArray(rows)) return 0;
    let added = 0;
    for (const row of rows as Product[]) {
      const id = Number((row as { id?: unknown }).id);
      // Dedupe on id: paging a table whose ordering is not fully deterministic can repeat a row
      // across page boundaries, and a duplicated product renders twice in the grid.
      if (Number.isFinite(id)) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      products.push(row);
      added++;
    }
    return added;
  };

  absorb(first.products);

  const lastPage = Number(first.pagination?.last_page ?? 1);
  const total = Number(first.pagination?.total ?? products.length);

  /*
   * ── THIS WALK STAYS SEQUENTIAL. A PARALLEL VERSION WAS TRIED AND REVERTED. ──────────────
   *
   * The obvious optimisation is to fetch pages 2..N concurrently: /api/all_products costs ~5s per
   * call even at per_page=1 (it returns the brand and category sets alongside the page, so the cost
   * is largely fixed), and at 660 published products that is 7 x 5s in series. /shop was measured
   * at 16.9s.
   *
   * It was implemented in batches of 4, deployed, and measured again: /shop 17.2s. NO improvement,
   * because the bottleneck is not latency we can overlap — it is the API's per-IP budget. Firing
   * four at once against a rate-limited origin does not finish sooner, it just arrives in a burst.
   *
   * And the burst is actively harmful here, which is the real reason this is reverted rather than
   * merely dropped. util/sitemapCrawl.ts keeps its own concurrency deliberately low with the note
   * "the SSR container shares the API's per-IP budget" — the same budget this function spends. Every
   * /shop render competes with the sitemap crawl, and when that crawl loses it throws and
   * /sitemap.xml answers 503. Making this function burstier makes that outcome more likely, for a
   * measured gain of zero.
   *
   * The actual fix is not in this function at all: ShopPageClient filters and paginates in the
   * browser, so the whole catalogue has to be loaded to render one page of it. Server-side
   * pagination and filtering removes the walk instead of rearranging it. The `truncated` warning
   * below marks where that stops being optional.
   */
  for (let page = 2; page <= lastPage && products.length < cap; page++) {
    const next = await getAllProducts({ perPage: PER_PAGE, page });
    // A page that comes back with nothing means the walk is over. Breaking here rather than
    // continuing to `lastPage` avoids hammering the API when the catalogue shrank mid-crawl.
    if (absorb(next.products) === 0) break;
  }

  const truncated = Number.isFinite(total) && total > 0 && products.length < total;

  if (truncated) {
    console.warn(
      `[getAllProductsComplete] returning ${products.length} of ${total} published products ` +
        `(cap ${cap}). The shop filters client-side, so every facet is now operating on a subset. ` +
        `This is the point at which ShopPageClient needs server-side filtering.`
    );
  }

  return {
    products,
    brands: first.brands || [],
    categories: first.categories || [],
    pagination: first.pagination,
    truncated,
  };
};

/**
 * ONE page of the boutique, filtered and sorted by the SERVER.
 *
 * This is the replacement for getAllProductsComplete() on /shop, and the difference is not a
 * refinement — it is the difference between a correct catalogue and a truncated one. The walk above
 * stops at 3,000 of 10,669 products and then the browser filters what it got; this asks the database
 * the actual question and gets the actual answer, in one request instead of thirty.
 *
 * Measured cost of the old path: ~30 sequential calls at ~5s each against a rate-limited origin,
 * producing a 3.35 MB payload the shopper reads 12 rows of. Measured cost of this one: one call.
 *
 * getAllProductsComplete is NOT deleted — the sitemap crawler still walks the catalogue and is
 * right to, because it genuinely wants every row. It is /shop that never did.
 */
export const getShopPage = async (
  query: ShopQuery,
  perPage: number = SHOP_PER_PAGE
): Promise<ProductsResponse> => {
  try {
    const response = await api.get('/all_products', { params: shopQueryToApiParams(query, perPage) });
    const raw = response.data;
    if (!raw) return { products: [], brands: [], categories: [] };

    const products = Array.isArray(raw.products) ? raw.products : (raw.products?.data ?? []);
    return {
      products,
      brands: raw.brands || [],
      categories: raw.categories || [],
      pagination: raw.pagination
        ? {
            total: raw.pagination.total,
            current_page: raw.pagination.current_page,
            per_page: raw.pagination.per_page,
            last_page: raw.pagination.last_page,
          }
        : undefined,
    };
  } catch (error) {
    console.error('[getShopPage] API error:', error);
    // Same contract as getAllProducts: rethrow on the server so loadForCache can refuse to bake an
    // empty boutique into the ISR entry, fail soft in the browser.
    if (typeof window === 'undefined') throw error;
    return { products: [], brands: [], categories: [] };
  }
};

/**
 * The filter sidebar's view of the WHOLE catalogue — price bounds, flavours, per-facet counts.
 *
 * Separate from the product page on purpose. The sidebar describes the catalogue, not the 12 rows
 * currently on screen, and once the server started sending 12 rows the sidebar had no other source
 * for that. Deriving it from the page would have shrunk the price slider to the range of whatever
 * landed on page 1 and then filtered page 1 by its own bounds — a sidebar that lies about the grid
 * beside it, with a 200 on both. See ApisController::shopFacets.
 */
/**
 * How many published products can actually be shipped today.
 *
 * ── WHY THIS IS ITS OWN CALL AND WHY IT IS WORTH ONE ────────────────────────────────────────
 * /api/shop_facets does not compute it, and the number matters more here than any facet does:
 * measured 19/08/2026, the boutique publishes 11,263 products and 133 of them pass the
 * availability filter, because 11,130 rows carry `rupture = 1, qte = 0` (the iHerb import). So
 * ticking "En stock uniquement" removes 98.8% of the shop, and without the count printed beside
 * the checkbox that reads as a broken filter rather than as a fact about the catalogue.
 *
 * `per_page=1` and `light=1`: the response is one product row and a pagination block — about
 * 900 bytes — and the only field read is `pagination.total`. The shop page wraps this call in its
 * own `unstable_cache` (revalidate 300, tags shop/products), so it costs one query per 300 seconds
 * across all visitors. It is NOT cached here — this module's axios instance is invisible to Next's
 * Data Cache, so every caller has to opt in, and for a while /shop's docblock claimed a cache that
 * its call site did not actually have.
 *
 * Fails to `null` rather than to 0: "we could not count" and "nothing is in stock" are different
 * statements, and the UI shows the warning only for the first.
 */
export const getInStockCount = async (): Promise<number | null> => {
  try {
    const response = await api.get('/all_products', {
      params: { per_page: 1, page: 1, light: 1, in_stock: 1 },
    });
    const total = Number(response.data?.pagination?.total);
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
};

/**
 * How many SHIPPABLE products each brand has today, keyed by brand id.
 *
 * ── WHY /brands NEEDS THIS AND /shop_facets CANNOT GIVE IT ──────────────────────────────────
 * `shop_facets.brand_counts` counts PUBLISHED products, and on this catalogue that number is
 * mostly fiction: 11,130 of 11,263 rows carry `rupture = 1, qte = 0` (the iHerb import), so a
 * brand directory built on it advertises 577 brands of which 30 can actually be bought. Measured
 * 19/08/2026 — Swanson Vitamins leads the published counts with 577 products and has none in
 * stock, while JX Fitness has 50 published and 26 on the shelf.
 *
 * A directory that cannot tell those two apart is not a directory, it is a list of names. So the
 * page prints both numbers and lets the shopper filter on the one that matters.
 *
 * ── WHY IT IS TWO REQUESTS AND NOT 577 ─────────────────────────────────────────────────────
 * The obvious shape — ask per brand — is 577 round trips. The whole in-stock set is 133 products,
 * which is two pages at the API's clamped 100-row maximum, and every row carries `brand_id`. So
 * the aggregate is computed here from the same two responses the shop already knows how to ask
 * for. `fields=index` trims each row to its identifiers; the only field read is `brand_id`.
 *
 * Called inside the /brands ISR window (revalidate 3600), so it costs two queries an hour across
 * all visitors, not two per visit.
 *
 * Fails to an EMPTY OBJECT rather than to zeros: "we could not count" and "nothing is in stock"
 * are different statements, and the directory hides the availability control entirely for the
 * first rather than telling every shopper the shop is empty.
 */
export const getInStockBrandCounts = async (): Promise<Record<number, number>> => {
  const counts: Record<number, number> = {};
  try {
    for (let page = 1; page <= 4; page += 1) {
      const response = await api.get('/all_products', {
        params: { per_page: 100, page, in_stock: 1, light: 1, fields: 'index' },
      });
      const rows = response.data?.products;
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const row of rows) {
        const id = Number(row?.brand_id);
        if (Number.isFinite(id) && id > 0) counts[id] = (counts[id] ?? 0) + 1;
      }
      const lastPage = Number(response.data?.pagination?.last_page ?? 1);
      if (!Number.isFinite(lastPage) || page >= lastPage) break;
    }
    return counts;
  } catch (error) {
    console.error('[getInStockBrandCounts] API error:', error);
    return {};
  }
};

/**
 * A few products to feature for ONE rayon, for the mega-menu's right-hand card.
 *
 * ── WHY A REQUEST PER RAYON BEATS THE ONE-SHOT ALTERNATIVES ─────────────────────────────────
 * The menu used to show `new_product[0]` — the single newest product in the catalogue — beside all
 * six rayons and all fifty-five subcategories. Owner, 20/08/2026: *"when I hover over categories,
 * change the right showed product."*
 *
 * The cheap-looking fix is to fetch `/latest_products` once (16 rows, 15 KB) and bucket it on
 * `sous_categorie.categorie_id`. Measured: those 16 rows fall into **2 of the 6 rayons**. Four
 * rayons would still show a generic card, which is the bug with extra steps.
 *
 * So: one request per rayon, made on hover, cached in the component for the life of the page. Six
 * requests is the ceiling and only for someone who visits all six columns; measured at 3.2-4.7 KB
 * each with `light=1`. That is smaller than the single `/latest_products` call it replaces.
 *
 * `in_stock=1` and `sort=popularity` are the two parameters that make this a merchandising slot
 * rather than a lucky dip. 11,130 of 11,263 published products are flagged out of stock, so
 * without the filter the card would usually promote something nobody can buy — on the panel whose
 * one filled button says "Acheter".
 *
 * Returns an empty array rather than throwing: the card is a nicety on a navigation panel, and the
 * panel must never degrade into a hole where a card should be.
 */
export const getCategoryHighlights = async (
  categorySlug: string,
  limit = 4,
  signal?: AbortSignal
): Promise<Product[]> => {
  if (!categorySlug) return [];
  try {
    const response = await api.get('/all_products', {
      params: {
        categories: categorySlug,
        per_page: limit,
        page: 1,
        light: 1,
        in_stock: 1,
        sort: 'popularity',
      },
      signal,
    });
    const rows = response.data?.products;
    return Array.isArray(rows) ? rows.filter((p: Product) => p?.id && p?.cover) : [];
  } catch {
    return [];
  }
};

export const getShopFacets = async (): Promise<ShopFacets> => {
  const empty: ShopFacets = {
    price: { min: 0, max: 1000, p99: 1000 },
    flavors: [],
    brands: [],
    category_counts: {},
    brand_counts: {},
    subcategories: [],
    total_published: 0,
  };

  try {
    const response = await api.get('/shop_facets');
    const raw = response.data;
    if (!raw || typeof raw !== 'object') return empty;

    return {
      price: {
        min: Number(raw.price?.min ?? 0) || 0,
        // Never 0: a max of 0 collapses the slider to a point and filters everything out.
        max: Number(raw.price?.max ?? 1000) || 1000,
        // Falls back to the true max so a backend that predates the p99 field still works — the
        // slider is merely wide again rather than broken.
        p99: Number(raw.price?.p99 ?? raw.price?.max ?? 1000) || 1000,
      },
      flavors: Array.isArray(raw.flavors) ? raw.flavors.filter((f: unknown) => typeof f === 'string') : [],
      // Guarded rather than trusted: a backend that predates this field returns undefined, and the
      // shop must render with an empty brand rail instead of throwing on .map().
      brands: Array.isArray(raw.brands)
        ? raw.brands.filter((b: unknown) => b && typeof b === 'object' && 'id' in (b as object))
        : [],
      category_counts: raw.category_counts && typeof raw.category_counts === 'object' ? raw.category_counts : {},
      brand_counts: raw.brand_counts && typeof raw.brand_counts === 'object' ? raw.brand_counts : {},
      subcategories: Array.isArray(raw.subcategories) ? raw.subcategories : [],
      total_published: Number(raw.total_published ?? 0) || 0,
    };
  } catch (error) {
    // Facets are incidental — a failure here must degrade the sidebar, never blank the boutique.
    console.error('[getShopFacets] API error:', error);
    return empty;
  }
};

const RETRY_DELAY_MS = 800;

async function withRetry<T>(fn: () => Promise<T>, isRetryable: (err: any) => boolean): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (!isRetryable(err)) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return fn();
  }
}

export const getProductDetails = async (slug: string, cacheBust?: boolean): Promise<Product> => {
  const cleanSlug = (slug || '').split('?')[0].trim();
  if (!cleanSlug) {
    const err: any = new Error('Product not found');
    err.response = { status: 404 };
    throw err;
  }
  const path = cacheBust
    ? `product_details/${encodeURIComponent(cleanSlug)}?t=${Date.now()}`
    : `product_details/${encodeURIComponent(cleanSlug)}`;
  try {
    // Shorter Data Cache window than the 300s default: this payload carries PRICE and STOCK, and
    // stock decrements from orders go through a query-builder decrement with no model event, so
    // they never fire on-demand revalidation. 60s bounds how long a sold-out product can still
    // read as available. `cacheBust` callers already append ?t= and get a distinct cache entry.
    const data = await apiFetch<Product>(path, { revalidate: cacheBust ? false : 60 });
    if (!data || !(data as any).id) throw new ApiError('Product not found', 404);
    const raw = data as Product & { avis?: Review[] };
    if (Array.isArray(raw.avis) && !Array.isArray(raw.reviews)) {
      return { ...raw, reviews: raw.avis } as Product;
    }
    return data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      const err: any = new Error('Product not found');
      err.response = { status: 404 };
      throw err;
    }
    throw e;
  }
};

/** Server-friendly: try subcategory first, then category. Uses apiFetch (429 retry, dedupe). */
export async function fetchCategoryOrSubCategory(slug: string): Promise<
  | {
      type: 'subcategory';
      data: {
        sous_category: any;
        products: Product[];
        brands: Brand[];
        sous_categories: any[];
        pagination?: any;
        seo?: CategorySeoFromApi;
      };
    }
  | {
      type: 'category';
      data: {
        category: Category;
        sous_categories: any[];
        products: Product[];
        brands: Brand[];
        seo?: CategorySeoFromApi;
      };
    }
> {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) throw new ApiError('Not found', 404);

  try {
    const sub = await apiFetch<{
      sous_category: any;
      products: Product[];
      brands: Brand[];
      sous_categories: any[];
      pagination?: any;
      seo?: CategorySeoFromApi;
    }>(`productsBySubCategoryId/${encodeURIComponent(cleanSlug)}?per_page=24&page=1`);
    if (sub?.sous_category?.id) {
      return {
        type: 'subcategory',
        data: {
          ...sub,
          seo: withCategorySeoEntityFallbacks(sub.seo, sub.sous_category),
        },
      };
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      // try category
    } else {
      throw e;
    }
  }

  try {
    // ASK FOR EVERY PRODUCT IN THE CATEGORY, NOT THE FIRST PAGE.
    //
    // This called productsByCategoryId with no pagination parameters at all, and the endpoint
    // defaults to per_page = 20. The category route has no "load more" and no pagination UI, so
    // whatever came back in that first page was the entire category as far as a shopper could
    // tell. Measured against the live API: Équipement showed 20 of 79, Santé & Vitalité 20 of 65,
    // Protéines 20 of 60, Performance 20 of 51, Prise de masse 20 of 34. Only Perte de poids (14)
    // looked correct — because it happens to have fewer than 20 products, which is exactly why
    // the bug read as "it only shows one subcategory".
    //
    // 100 is the endpoint's MAX_PER_PAGE, so the loop below is what makes this correct rather
    // than merely bigger: any category that grows past 100 keeps working instead of silently
    // truncating again. Today it costs a single request.
    const PER_PAGE = 100;
    const first = await apiFetch<{
      category: Category;
      sous_categories: any[];
      products: Product[];
      brands: Brand[];
      seo?: CategorySeoFromApi;
      products_meta?: { last_page?: number; total?: number };
    }>(`productsByCategoryId/${encodeURIComponent(cleanSlug)}?per_page=${PER_PAGE}&page=1`);

    if (first?.category?.id) {
      let products = first.products ?? [];
      const lastPage = Number(first.products_meta?.last_page ?? 1);

      if (lastPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            apiFetch<{ products: Product[] }>(
              `productsByCategoryId/${encodeURIComponent(cleanSlug)}?per_page=${PER_PAGE}&page=${i + 2}`
            )
              // One failed page must not empty the category — show what we have.
              .then((p) => p?.products ?? [])
              .catch(() => [] as Product[])
          )
        );
        products = products.concat(...rest);
      }

      return {
        type: 'category',
        data: {
          ...first,
          products,
          seo: withCategorySeoEntityFallbacks(first.seo, first.category),
        },
      };
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw e;
    throw e;
  }

  throw new ApiError('Category not found', 404);
}

/**
 * Resolve only the taxonomy + SEO envelope for a category route.
 *
 * The route obtains its visible products from the paginated shop endpoint. Reusing the legacy
 * resolver there downloaded up to 100 complete product rows a second time, increasing TTFB and the
 * RSC payload while none of those rows were rendered. The API keeps the original endpoint shape so
 * the pack builder and other catalogue consumers remain unchanged.
 */
export async function fetchCategoryOrSubCategoryMetadata(
  slug: string
): Promise<Awaited<ReturnType<typeof fetchCategoryOrSubCategory>>> {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) throw new ApiError('Not found', 404);

  try {
    const sub = await apiFetch<any>(
      `productsBySubCategoryId/${encodeURIComponent(cleanSlug)}?meta_only=1`
    );
    if (sub?.sous_category?.id) {
      return {
        type: 'subcategory',
        data: {
          ...sub,
          seo: withCategorySeoEntityFallbacks(sub.seo, sub.sous_category),
        },
      };
    }
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }

  const category = await apiFetch<any>(
    `productsByCategoryId/${encodeURIComponent(cleanSlug)}?meta_only=1`
  );
  if (category?.category?.id) {
    return {
      type: 'category',
      data: {
        ...category,
        seo: withCategorySeoEntityFallbacks(category.seo, category.category),
      },
    };
  }

  throw new ApiError('Category not found', 404);
}

export const getProductsByCategory = async (slug: string): Promise<{
  category: Category;
  sous_categories: any[];
  products: Product[];
  brands: Brand[];
}> => {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) {
    const err: any = new Error('Category not found');
    err.response = { status: 404 };
    throw err;
  }
  return withRetry(
    async () => {
      // Same 20-per-page truncation as fetchCategoryOrSubCategory — see the long note there.
      // This second call site matters just as much: ShopPageClient re-fetches the category on the
      // CLIENT after hydration and replaces the server-rendered list with the result. Fixing only
      // the server fetch would have looked correct in `curl` and still collapsed back to 20
      // products the moment a real browser hydrated the page.
      const PER_PAGE = 100;
      const response = await api.get(`/productsByCategoryId/${cleanSlug}`, {
        params: { per_page: PER_PAGE, page: 1 },
      });
      if (!response.data || !response.data.category || !response.data.category.id) {
        console.warn(`Category "${cleanSlug}" not found in API response`);
        const err: any = new Error('Category not found');
        err.response = { status: 404 };
        throw err;
      }

      const lastPage = Number(response.data?.products_meta?.last_page ?? 1);
      if (lastPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            api
              .get(`/productsByCategoryId/${cleanSlug}`, { params: { per_page: PER_PAGE, page: i + 2 } })
              .then((r) => (r.data?.products ?? []) as Product[])
              // A failed page must not empty the category — render what we have.
              .catch(() => [] as Product[])
          )
        );
        return { ...response.data, products: (response.data.products ?? []).concat(...rest) };
      }

      return response.data;
    },
    // Retry ONLY 5xx here. Network codes (ETIMEDOUT/ECONNRESET/ECONNABORTED) are already retried by
    // the axios interceptor; retrying them here too stacked the two layers (interceptor re-runs on a
    // fresh config, resetting its own counter) into ~6 sequential 60s attempts on a hung backend.
    (err) => err?.response?.status !== 404 && err?.response?.status >= 500 && err?.response?.status < 600
  );
};

export const getProductsBySubCategory = async (
  slug: string,
  options?: { signal?: AbortSignal; page?: number; perPage?: number }
): Promise<{
  sous_category: any;
  products: Product[];
  brands: Brand[];
  sous_categories: any[];
  pagination?: { total: number; current_page: number; per_page: number; last_page: number };
}> => {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) {
    const err: any = new Error('Subcategory not found');
    err.response = { status: 404 };
    throw err;
  }
  const signal = options?.signal;
  const params: Record<string, number> = {
    per_page: options?.perPage ?? 24,
    page: options?.page ?? 1,
  };
  return withRetry(
    async () => {
      const response = await api.get(`/productsBySubCategoryId/${cleanSlug}`, { signal, params });
      if (!response.data || !response.data.sous_category || !response.data.sous_category.id) {
        console.warn(`Subcategory "${cleanSlug}" not found in API response`);
        const err: any = new Error('Subcategory not found');
        err.response = { status: 404 };
        throw err;
      }
      return response.data;
    },
    (err) => {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return false;
      // Retry ONLY 5xx here; the axios interceptor already handles network-code retries (see
      // getProductsByCategory) — retrying them in both layers stacked to ~6 sequential attempts.
      return err?.response?.status !== 404 && err?.response?.status >= 500 && err?.response?.status < 600;
    }
  );
};

export const getProductsByBrand = async (brandId: number): Promise<{
  categories: Category[];
  products: Product[];
  brands: Brand[];
  brand: Brand;
}> => {
  const response = await api.get(`/productsByBrandId/${brandId}`);
  return response.data;
};

/**
 * Type-ahead search for the header field.
 *
 * ── `light: 1` IS 87% OF THIS REQUEST ───────────────────────────────────────────────────────
 * Measured against production on 19/08/2026, `?search=whey&per_page=10`:
 *
 *     total          67,113 bytes
 *       products      9,051 bytes   (13%)  ← the only thing this function returns
 *       brands       63,031 bytes   (94%)  ← 577 rows, discarded by every caller
 *       categories      808 bytes
 *
 * The brand list is a FIXED cost this endpoint pays on every request — it is computed over the
 * whole published catalogue on purpose, so /shop's brand filter is not reduced to the brands of
 * page 1 — and the iHerb import took it from 84 brands to 577. A type-ahead field fires one of
 * these per debounce window, so a shopper typing "creatine" paid several hundred kilobytes to
 * read nine product names.
 *
 * `light=1` is an existing, documented switch on the controller (ApisController::allProducts) that
 * drops both sets. It was added for the sitemap crawler and /shop and nobody wired it up here.
 * Same request, same results, 67,113 -> 8,895 bytes.
 *
 * `brands` is dropped from the return type rather than returned empty: the only caller reads
 * `products`, and handing back an array that is now always empty invites somebody to render it.
 *
 * `total` comes from `pagination.total`, not from `products.length`. The dropdown used to say
 * "Voir tous les résultats (10)" for a query with 246 matches, because ten is the page size.
 */
export const searchProducts = async (
  text: string,
  signal?: AbortSignal
): Promise<{ products: Product[]; total: number }> => {
  const response = await api.get('/all_products', {
    params: { search: text.trim(), per_page: 8, page: 1, light: 1 },
    signal,
  });
  const raw = response.data;
  const products: Product[] = Array.isArray(raw.products) ? raw.products : (raw.products?.data ?? []);
  const total = Number(raw.pagination?.total);
  return { products, total: Number.isFinite(total) ? total : products.length };
};

export const searchProductsBySubCategory = async (slug: string, text: string): Promise<{
  products: Product[];
  brands: Brand[];
}> => {
  const response = await api.get(`/searchProductBySubCategoryText/${slug}/${text}`);
  return response.data;
};

export const getSimilarProducts = async (sousCategorieId: number): Promise<{ products: Product[] }> => {
  const response = await api.get(`/similar_products/${sousCategorieId}`);
  return response.data;
};

export const getLatestProducts = async (): Promise<{
  new_product: Product[];
  packs: Product[];
  best_sellers: Product[];
}> => {
  const response = await api.get('/latest_products');
  return response.data;
};

export const getLatestPacks = async (): Promise<Product[]> => {
  const response = await api.get('/latest_packs');
  return response.data;
};

export const getNewProducts = async (): Promise<Product[]> => {
  const response = await api.get('/new_product');
  return response.data;
};

/** Meilleurs ventes: uses /best_sellers (8 products), fallback to /latest_products.best_sellers (4). */
export const getBestSellers = async (): Promise<Product[]> => {
  try {
    const response = await api.get<Product[] | { best_sellers?: Product[] }>('/best_sellers');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { best_sellers?: Product[] }).best_sellers)) {
      return (data as { best_sellers: Product[] }).best_sellers;
    }
  } catch {
    // Backend may not have /best_sellers yet: use latest_products
  }
  const fallback = await api.get<{ best_sellers?: Product[] }>('/latest_products').catch((): { data: { best_sellers?: Product[] } } => ({ data: {} }));
  return Array.isArray(fallback.data?.best_sellers) ? fallback.data.best_sellers : [];
};

export const getFlashSales = async (): Promise<Product[]> => {
  const response = await api.get('/ventes_flash?per_page=100');
  const raw = response.data;
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

export const getPacks = async (): Promise<Product[]> => {
  const response = await api.get('/packs?per_page=100');
  const raw = response.data;
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

// Brands
/**
 * EVERY brand, walked to the end of the pagination — not the first page of it.
 *
 * ── WHAT THE ONE-SHOT FETCH COST ─────────────────────────────────────────────────────────────
 * This was `api.get('/all_brands?per_page=100')`, and ApisController::resolvePerPage() clamps
 * per_page to 100 anyway. Measured against the live API on 2026-08-10: 100 rows returned,
 * `meta.total` = 128, `last_page` = 2. So 28 brands were invisible to every caller of this
 * function — including findBrandBySlug() in app/(shop)/[slug]/page.tsx and in the crawler category
 * route, which is what turns `/scitec-nutrition` into a page instead of a 404.
 *
 * That became a live defect the moment sitemapSources.ts started crawling `/all_brands` properly:
 * the sitemap then listed the 16 page-2 brands that have published products while this resolver
 * still could not find them, so every one of those URLs answered HTTP 404 with
 * `<meta robots="noindex">` — "Submitted URL not found (404)" in Search Console, which is the exact
 * error class the sitemap rebuild was written to remove. A sitemap and the pages it points at have
 * to be built from the same set of rows.
 *
 * ── THE SAME CRAWLER THE SITEMAP USES, NOT A SECOND ONE ──────────────────────────────────────
 * util/sitemapCrawl.ts owns "walk to the real end and prove you got there" — the clamped per_page,
 * the `total`-without-`last_page` envelope, the duplicate rows an unstable sort produces. A second
 * hand-rolled loop here would be the same guarantee written twice, and it is the second copy that
 * silently stops at page 1. It runs on the SAME axios instance (getApiPage), so it keeps this
 * file's timeouts, interceptors and share of the API's per-IP budget.
 *
 * It throws when a page comes back malformed, exactly as the single request threw when it failed:
 * the callers that tolerate an outage already wrap this in try/catch or `.catch(() => [])`. Half a
 * brand list returned as if it were whole is what produced the 404s above.
 */
export const getAllBrands = async (): Promise<Brand[]> => {
  const crawl = await crawlPaginated<Brand>({
    label: '/all_brands',
    perPage: 100,
    // 128 brands over 100-row pages is 2 requests today. The ceiling is a guard against a
    // pagination bug looping, not a budget: 20 pages is 2,000 brands.
    maxRequests: 20,
    concurrency: 2,
    fetchPage: (page, perPage) => getApiPage('/all_brands', page, perPage),
  });

  return crawl.rows;
};

// Aromas & Tags
export const getAromas = async (): Promise<any[]> => {
  const response = await api.get('/aromes?per_page=100');
  const raw = response.data;
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

export const getTags = async (): Promise<any[]> => {
  const response = await api.get('/tags?per_page=100');
  const raw = response.data;
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

// ==================== ARTICLES / BLOG ====================
//
// Caching strategy:
//   Server-side fetches (getAllArticles, getArticleDetails, getLatestArticles)
//   use `next: { tags: ['blog'] }` which opts into the Next.js Data Cache
//   with on-demand tag-based revalidation.  The cache lives until the admin
//   calls POST /api/revalidate-blog which runs `revalidateTag('blog')`.
//
//   Client-side fetch (getAllArticlesClient) is called from BlogPageClient
//   on mount & visibilitychange as a safety-net.  It uses `cache:'no-store'`
//   + no-cache headers so the browser always hits the origin API.
//
//   ⚠ Do NOT add ?_t=Date.now() to server-side URLs — it defeats the
//   Data Cache entirely (every request looks like a different URL).
// ─────────────────────────────────────────────────────────

export const getAllArticles = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/all_articles?per_page=100`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] }, // ISR: cached until revalidateTag('blog')
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  const data = await response.json();
  // Backend returns paginated {data:[...], meta, links} or plain array
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data.articles || []));
};

const ARTICLE_RETRY_DELAYS_MS = [800, 2500, 6000];

/**
 * Deliberately on raw `fetch`, NOT apiFetch: `next: { tags: ['blog'] }` is what
 * POST /api/revalidate-blog purges, and apiFetch's `cache: 'no-store'` would drop the tag.
 * The side effect was that this call had NO 429 handling whatsoever while every other server
 * data path had some — so blog articles were the first casualty of the shared per-IP bucket
 * and the source of the observed generic "Article | Blog Protéine Tunisie" title with no
 * canonical. Retry here, honouring the Retry-After Laravel sends. A genuine 404 is NOT
 * transient and still falls straight through to the ApiError below on the first attempt.
 */
export const getArticleDetails = async (slug: string): Promise<Article> => {
  let response!: Response;
  for (let attempt = 0; ; attempt++) {
    response = await fetch(`${API_URL}/article_details/${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      next: { tags: ['blog'] },
    });
    const transient =
      response.status === 429 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;
    if (!transient || attempt >= ARTICLE_RETRY_DELAYS_MS.length) break;
    const retryAfter = Number(response.headers.get('retry-after'));
    const delay =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 8_000)
        : Math.floor(ARTICLE_RETRY_DELAYS_MS[attempt]! * (0.8 + Math.random() * 0.4));
    await new Promise((r) => setTimeout(r, delay));
  }

  if (!response.ok) {
    // Throw a status-CARRYING ApiError (mirroring getProductDetails) so getErrorStatus() can read
    // the code. Previously this threw a plain Error with no status, so blog/[slug]'s
    // `if (getErrorStatus(e) === 404) notFound()` never fired and a deleted article hit the generic
    // error boundary (soft-404) instead of a real 404 — leaving the dead URL indexable in Google.
    if (response.status === 404) throw new ApiError('Article not found', 404);
    throw new ApiError(response.statusText || 'Failed to fetch article', response.status);
  }

  const data = await response.json();
  return data;
};

export const getLatestArticles = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/latest_articles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch latest articles: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.articles || []);
};

export interface BlogTaxonomyItem {
  id: number;
  name: string;
  slug: string;
  seo?: {
    title?: string;
    description?: string;
    canonical_url?: string;
    robots?: { index?: boolean; follow?: boolean };
  };
}

export const getBlogCategories = async (): Promise<BlogTaxonomyItem[]> => {
  const response = await api.get('/blog_categories');
  const rows = response.data?.data ?? response.data;
  return Array.isArray(rows) ? rows : [];
};

export const getBlogTags = async (): Promise<BlogTaxonomyItem[]> => {
  const response = await api.get('/blog_tags');
  const rows = response.data?.data ?? response.data;
  return Array.isArray(rows) ? rows : [];
};

export const getArticlesByBlogCategory = async (
  slug: string,
  page: number = 1,
  perPage: number = 9
): Promise<{ category: BlogTaxonomyItem; articles: Article[]; meta?: any; links?: any }> => {
  const response = await api.get(`/blog/category/${encodeURIComponent(slug)}`, {
    params: { page, per_page: perPage },
  });
  return response.data;
};

export const getArticlesByBlogTag = async (
  slug: string,
  page: number = 1,
  perPage: number = 9
): Promise<{ tag: BlogTaxonomyItem; articles: Article[]; meta?: any; links?: any }> => {
  const response = await api.get(`/blog/tag/${encodeURIComponent(slug)}`, {
    params: { page, per_page: perPage },
  });
  return response.data;
};

/**
 * Client-side fetch for articles — called by BlogPageClient on mount
 * and on visibilitychange to guarantee fresh data in the browser.
 * Uses cache:'no-store' + no-cache headers (browser → origin, no Next.js
 * Data Cache involved).  No ?_t= needed.
 */
export const getAllArticlesClient = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/all_articles?per_page=100`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  const data = await response.json();
  // Backend returns paginated {data:[...], meta, links} or plain array
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data.articles || []));
};

// Media
export const getMedia = async (): Promise<any> => {
  const response = await api.get('/media');
  return response.data;
};

// Services
export const getServices = async (): Promise<Service[]> => {
  const response = await api.get('/services?per_page=100');
  const raw = response.data;
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

// Pages (main API – for /page/[slug] etc.)
export const getAppPages = async (): Promise<Page[]> => {
  const response = await api.get('/pages?per_page=100');
  const raw = response.data;
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

export const getPageBySlug = async (slug: string): Promise<Page> => {
  const path = `page/${encodeURIComponent(slug)}`;
  try {
    const data = await apiFetch<Page>(path);
    if (!data || !(data as any).title) throw new ApiError('Page not found', 404);
    return data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw e;
    throw e;
  }
};

// FAQs — Filament `ApisController::faqs` returns paginated `{ data, meta, links }` with `question` + `answer`
export const getNavigationItems = async (): Promise<{
  navbar: SiteNavigationItem[];
  sidebar: SiteNavigationItem[];
}> => {
  try {
    const response = await api.get('/navigation-items', { timeout: 10000 });
    const data = response.data;
    return {
      navbar: Array.isArray(data?.navbar) ? data.navbar : [],
      sidebar: Array.isArray(data?.sidebar) ? data.sidebar : [],
    };
  } catch {
    return { navbar: [], sidebar: [] };
  }
};

export const getFAQs = async (): Promise<FAQ[]> => {
  const response = await api.get('/faqs?per_page=100');
  const raw = response.data;
  const rows: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    reponse: row.reponse ?? row.answer ?? '',
  })) as FAQ[];
};

// SEO
export const getSeoPage = async (name: string): Promise<SeoPage> => {
  const response = await api.get<SeoPage>(`/seo_page/${name}`);
  return response.data;
};

// Contact & Newsletter
export const sendContact = async (data: ContactRequest): Promise<{ success: string }> => {
  const response = await api.post('/contact', data);
  return response.data;
};

export const subscribeNewsletter = async (data: NewsletterRequest): Promise<{ success: string } | { error: string }> => {
  const response = await api.post('/newsletter', data);
  return response.data;
};

// Orders
export const getOrderDetails = async (
  id: number,
  options?: { token?: string; email?: string; phone?: string }
): Promise<{
  facture: Order;
  details_facture: any[];
}> => {
  const params = new URLSearchParams();
  if (options?.token) params.set('token', options.token);
  if (options?.email) params.set('email', options.email);
  if (options?.phone) params.set('phone', options.phone);
  const query = params.toString();
  const url = query ? `/commande/${id}?${query}` : `/commande/${id}`;
  const response = await api.get(url);
  return response.data;
};

const ORDER_429_DELAYS = [400, 900];
/** Same payload shape for normal checkout and quick order (see lib/orderPayload.ts). */
/** Uses Idempotency-Key header to prevent duplicate orders on 429 retry (same key for all attempts). */
export const createOrder = async (orderData: BackendOrderPayload, existingIdempotencyKey?: string): Promise<{
  id: number;
  order_token?: string;
  message: string;
  'alert-type': string;
}> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const idempotencyKey = existingIdempotencyKey ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Idempotency-Key': idempotencyKey,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  let response = await fetch('/api/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData),
    cache: 'no-store',
  });
  for (let attempt = 0; response.status === 429 && attempt < 2; attempt++) {
    const delay = ORDER_429_DELAYS[attempt]! * (0.8 + Math.random() * 0.4);
    await new Promise((r) => setTimeout(r, Math.floor(delay)));
    response = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
      cache: 'no-store',
    });
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Object.assign(new Error((error as any).error || 'Erreur lors de la création de la commande'), {
      status: response.status,
      fieldErrors: (error as any).errors,
    });
  }
  return response.json();
};

/** Apply coupon. Returns { success, message, coupon, discount_ht, discount_ttc, totals }. */
export const applyCoupon = async (params: {
  code: string;
  subtotal_ht: number;
  frais_livraison?: number;
  client_id?: number;
  phone?: string;
  email?: string;
}): Promise<{
  success: boolean;
  message: string;
  coupon?: { code: string; type: string; value: number };
  discount_ht?: number;
  discount_ttc?: number;
  free_shipping?: boolean;
  totals?: {
    subtotal_ht: number;
    discount_ht: number;
    net_ht: number;
    tva: number;
    timbre: number;
    frais_livraison: number;
    total_ttc: number;
  };
}> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch('/api/coupons/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(params),
    cache: 'no-store',
  });
  return response.json();
};

/** Remove coupon; returns totals without discount. */
export const removeCoupon = async (params: {
  subtotal_ht: number;
  frais_livraison?: number;
}): Promise<{
  success: boolean;
  totals?: {
    subtotal_ht: number;
    discount_ht: number;
    net_ht: number;
    tva: number;
    timbre: number;
    frais_livraison: number;
    total_ttc: number;
  };
}> => {
  const response = await fetch('/api/coupons/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(params),
    cache: 'no-store',
  });
  return response.json();
};

/** Quick order (commande rapide) – one product, minimal form. Does not modify cart. */
export const submitQuickOrder = async (payload: QuickOrderPayload, existingIdempotencyKey?: string): Promise<QuickOrderResponse> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const idempotencyKey = existingIdempotencyKey ?? (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `quick-order-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const response = await fetch('/api/quick-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any).error || 'Erreur lors de la commande rapide');
  }
  return data as QuickOrderResponse;
};

// ==================== AUTHENTICATED API ENDPOINTS ====================

// Auth
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/login', credentials);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/register', data);
  return response.data;
};

/**
 * Exchange a Google ID token for a Sanctum token.
 *
 * The `credential` is the JWT that Google Identity Services hands the browser — it is NOT trusted
 * here and is not decoded here. The server verifies its signature and its audience with Google
 * before it will look at a single claim inside it; see ClientController::googleLogin.
 */
export const loginWithGoogle = async (credential: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/google', { credential });
  return response.data;
};

export const logoutSession = async (): Promise<void> => {
  await api.post('/logout');
};

export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/forgot-password', { email });
  return response.data;
};

export const resetPasswordWithToken = async (payload: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/reset-password', payload);
  return response.data;
};

export const getUser = async (): Promise<User> => {
  const response = await api.get<User>('/user');
  return response.data;
};

export const getProfile = async (): Promise<User> => {
  const response = await api.get('/profil');
  // Type the payload independently of `User` — intersecting with User would
  // collapse points_* to `number` and make the `!== ''` string guards fail tsc.
  const data = (response.data ?? {}) as Record<string, unknown>;
  const user: User = { ...(data as unknown as User) };
  // Map loyalty points onto the user when the backend includes them (shared API contract).
  const pb = data.points_balance;
  if (pb != null && pb !== '') {
    user.points_balance = Number(pb);
  }
  const pv = data.points_value_dt;
  if (pv != null && pv !== '') {
    user.points_value_dt = Number(pv);
  }
  return user;
};

export const sendEmailVerificationOtp = async (): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/email-verification/send');
  return response.data;
};

export const sendPhoneVerificationOtp = async (phone: string): Promise<{ message: string; phone: string; masked_phone?: string; expires_in: number; resend_after: number; attempts_remaining?: number; already_verified?: boolean }> => {
  const response = await api.post('/phone-verification/send', { phone });
  return response.data;
};

export interface PhoneVerificationStatus {
  active: boolean;
  phone_verified: boolean;
  phone?: string;
  masked_phone?: string;
  expires_in?: number;
  resend_after?: number;
  attempts_remaining?: number;
}

export const getPhoneVerificationStatus = async (): Promise<PhoneVerificationStatus> => {
  const response = await api.get<PhoneVerificationStatus>('/phone-verification/status');
  return response.data;
};

export interface PhoneVerificationResult {
  message: string;
  phone: string;
  phone_verified: boolean;
  bonus_awarded: boolean;
  bonus_status: NonNullable<User['welcome_bonus_status']>;
  bonus_points: number;
  points_balance: number;
  points_value_dt: number;
}

export const verifyPhoneOtp = async (code: string): Promise<PhoneVerificationResult> => {
  const response = await api.post('/phone-verification/verify', { code });
  return response.data;
};

export const claimWelcomeBonus = async (): Promise<PhoneVerificationResult> => {
  const response = await api.post('/phone-verification/claim-bonus');
  return response.data;
};

export const verifyEmailOtp = async (code: string): Promise<{ message: string; email_verified: boolean }> => {
  const response = await api.post<{ message: string; email_verified: boolean }>('/email-verification/verify', { code });
  return response.data;
};

/**
 * Authoritative pack (bundle) discount quote. The server recomputes the subtotal from real
 * product prices and applies the tier table — the client never supplies an amount.
 * Uses the shared `api` instance so base URL / proxy / locale headers are handled. PUBLIC (no auth needed).
 */
export const packQuote = async (
  items: { produit_id: number; quantite: number }[]
): Promise<PackQuote> => {
  const response = await api.post<PackQuote>('/pack/quote', { panier: items });
  return response.data;
};

/** Loyalty-points balance + ledger for the authenticated user (auth:sanctum). */
export const getPointsHistory = async (): Promise<PointsHistory> => {
  const response = await api.get<PointsHistory>('/points/history');
  return response.data;
};

/** One compact, authenticated payload for the member home screen. */
export const getMemberDashboard = async (): Promise<MemberDashboardData> => {
  const response = await api.get<MemberDashboardData>('/member/dashboard');
  return response.data;
};

// ── Tokenized "verified purchase" review flow (PUBLIC — no login) ──────────────
export interface ReviewProduct {
  product_id: number;
  slug: string;
  designation: string;
  cover?: string | null;
  reviewed: boolean;
}
export interface OrderForReview {
  numero: string;
  prenom: string;
  products: ReviewProduct[];
}

/** Fetch the products of an order (by its order_token) so the customer can review them without logging in. */
export const getOrderForReview = async (token: string): Promise<OrderForReview> => {
  const response = await api.get<OrderForReview>(`/reviews/order/${encodeURIComponent(token)}`);
  return response.data;
};

/** Submit a verified-purchase review via the order token (no auth required). */
export const submitReviewByToken = async (payload: {
  order_token: string;
  product_id: number;
  stars: number;
  comment: string;
  /** See the note on AddReviewPayload — same two signals, same reasons. */
  compose_ms?: number;
  hp_field?: string;
}): Promise<{ message: string; published: boolean; id: number }> => {
  const response = await api.post('/reviews/by-order', payload);
  return response.data;
};

export const updateProfile = async (data: Partial<User> & { password?: string }): Promise<User> => {
  const response = await api.post<User>('/update_profile', data);
  return response.data;
};

/** Normalize Laravel paginated `{ data, meta }` or raw array into `Order[]`. Safe for tests. */
export function normalizeClientOrdersPayload(body: unknown): Order[] {
  if (body === null || body === undefined) {
    return [];
  }
  if (Array.isArray(body)) {
    return body as Order[];
  }
  if (typeof body === 'object' && body !== null && 'data' in body) {
    const inner = (body as { data?: unknown }).data;
    if (Array.isArray(inner)) {
      return inner as Order[];
    }
  }
  return [];
}

export const getClientOrders = async (): Promise<Order[]> => {
  const response = await api.get<unknown>('/client_commandes');
  return normalizeClientOrdersPayload(response.data);
};

export const getMyReviewDashboard = async (): Promise<ReviewDashboard> => {
  const response = await api.get<ReviewDashboard>('/my-reviews');
  return response.data;
};

export const getMyReviews = async (): Promise<CustomerReview[]> => {
  const dashboard = await getMyReviewDashboard();
  return Array.isArray(dashboard.reviews) ? dashboard.reviews : [];
};

export const getOrderDetail = async (id: number): Promise<{
  commande: Order;
  details: OrderDetail[];
}> => {
  const response = await api.post<{
    commande: Order;
    details: any[];
  }>(`/detail_commande/${id}`);
  return response.data;
};

/**
 * ── THE TWO EXTRA FIELDS ARE ANTI-ABUSE, NOT TELEMETRY ──────────────────────────────────────
 * `compose_ms` is how long the form was open before submit, and `hp_field` is a honeypot the
 * server expects to be empty. Both feed `ReviewAuthenticity`, which decides whether the review is
 * paid for — a review earns 50 loyalty points, and points are money, so a submission that cannot
 * show it was composed by a person is not one to credit.
 *
 * Neither is a verdict on its own. A script can send a plausible `compose_ms`; almost none are
 * written to send one at all, and the server treats a missing value as its own (mild) signal.
 */
export const getReviewAccess = async (productId?: number): Promise<ReviewAccess> => {
  const response = await api.get<ReviewAccess>('/review-access', {
    params: productId ? { product_id: productId } : undefined,
  });
  return response.data;
};

export const addReview = async (data: {
  product_id: number;
  stars: number;
  comment: string;
  compose_ms?: number;
  hp_field?: string;
  images?: File[];
}): Promise<ReviewSubmitResult> => {
  const body = new FormData();
  body.append('product_id', String(data.product_id));
  body.append('stars', String(data.stars));
  body.append('comment', data.comment);
  body.append('compose_ms', String(data.compose_ms ?? 0));
  body.append('hp_field', data.hp_field ?? '');
  data.images?.forEach((file) => body.append('images[]', file));
  const response = await api.post<ReviewSubmitResult>('/add_review', body);
  return response.data;
};

/**
 * ── THE THREAD UNDER A REVIEW ───────────────────────────────────────────────────────────────
 * All four endpoints are public. `api` already attaches the bearer token when there is one, so a
 * signed-in customer's reply is attributed to their account without a second code path — the
 * backend resolves the sanctum guard explicitly for exactly this reason.
 */
export const getReviewReplies = async (reviewId: number): Promise<ReviewReply[]> => {
  try {
    const response = await api.get<{ replies: ReviewReply[] }>(`/reviews/${reviewId}/replies`);
    return Array.isArray(response.data?.replies) ? response.data.replies : [];
  } catch (e: unknown) {
    /*
     * A 404 here means the BACKEND HAS NOT BEEN DEPLOYED YET, not that something is broken.
     * Frontend and backend ship from one repository but not in one instant, and for the window
     * between them this route does not exist. "No replies" is the truthful answer in that window,
     * and it is also what the endpoint itself returns before `php artisan migrate` creates the
     * table — so the two failure modes agree.
     *
     * Every other status still throws, because a 500 or a timeout is a real fault and the caller
     * shows the customer an error for it.
     */
    if ((e as { response?: { status?: number } })?.response?.status === 404) return [];
    throw e;
  }
};

export const addReviewReply = async (
  reviewId: number,
  data: {
    body: string;
    parent_id?: number | null;
    author_name?: string;
    author_email?: string;
    /** The honeypot. See AddReviewPayload — a reply is farmed for links rather than for points. */
    hp_field?: string;
  }
): Promise<{ message: string; published: boolean; reply: ReviewReply | null }> => {
  const response = await api.post(`/reviews/${reviewId}/replies`, data);
  return response.data;
};

/**
 * A review from somebody with no account.
 *
 * Deliberately a DIFFERENT function from `addReview`, not a branch inside it. The two have
 * different endpoints, different validation and — most importantly — different outcomes: this one
 * is always held for moderation and can never reach the star rating, and a single function whose
 * behaviour silently changed with auth state would hide that.
 */
export const addGuestReview = async (data: {
  product_id: number;
  stars: number;
  comment: string;
  author_name?: string;
  author_email?: string;
  compose_ms?: number;
  hp_field?: string;
  images?: File[];
}): Promise<{ message: string; published: boolean; id: number }> => {
  const body = new FormData();
  body.append('product_id', String(data.product_id));
  body.append('stars', String(data.stars));
  body.append('comment', data.comment);
  if (data.author_name?.trim()) body.append('author_name', data.author_name.trim());
  if (data.author_email?.trim()) body.append('author_email', data.author_email.trim());
  body.append('compose_ms', String(data.compose_ms ?? 0));
  body.append('hp_field', data.hp_field ?? '');
  data.images?.forEach((file) => body.append('images[]', file));
  const response = await api.post('/reviews/guest', body);
  return response.data;
};

/** A member's public page. 404s for anybody with no published review — see the controller. */
export const getMemberProfile = async (id: number): Promise<MemberProfile> => {
  const response = await api.get<MemberProfile>(`/members/${id}`);
  return response.data;
};

// Redirections
export const getRedirections = async (): Promise<any[]> => {
  const response = await api.get('/redirections');
  return response.data;
};

export default api;
