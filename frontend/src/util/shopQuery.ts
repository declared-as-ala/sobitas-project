/**
 * The /shop URL contract — parsed on the server, written by the client, one definition for both.
 *
 * ── WHY THIS FILE EXISTS AT ALL ───────────────────────────────────────────────────────────────
 * /shop used to load the entire catalogue and filter it in the browser. That stopped working long
 * before anyone noticed it had:
 *
 *   getAllProductsComplete() walks /api/all_products 100 rows at a time and STOPS AT 3,000. The
 *   catalogue is 10,669 published products. So the boutique showed 3,097 of them — 71% of the shop
 *   was unreachable by any route, and worse, every brand, price and flavour filter was silently
 *   computing its answer over that same truncated third. Both facts were invisible: HTTP 200,
 *   a full-looking grid, a pager that counted pages of a number that was already wrong.
 *
 * Moving the filtering to the server means the URL becomes the state. Once that is true, the
 * parsing and the serialising must be the SAME code, or the two halves drift: the client writes
 * `?brands=72,4`, the server reads `?brand=`, and the page renders the unfiltered catalogue while
 * every checkbox in the sidebar looks ticked. That class of bug does not throw, and it is why this
 * is a module rather than two symmetrical blocks in two files.
 *
 * ── THE KEY NAMES ARE THE LEGACY ONES, DELIBERATELY ───────────────────────────────────────────
 * `category`, `brand` and `search` are singular even though they now accept a comma-separated list.
 * The temptation was to rename them to plurals to match what they hold, and that would have broken
 * three things at once:
 *
 *   1. Inbound links. The header nav, the category rails and older Google results all point at
 *      /shop?category=proteines. Those are real traffic and they must keep working.
 *   2. next.config.js FACET_KEYS. The `X-Robots-Tag: noindex, follow` rules that stopped
 *      /shop?search=WHEY%20PROTEIN accumulating as duplicates in the index match on these exact key
 *      names. Rename the key and the noindex quietly stops applying.
 *   3. middleware.ts, which reads them for redirect handling.
 *
 * A single value parses identically under both readings, so `?category=proteines` and
 * `?category=proteines,creatine` are the same contract. Nothing had to break.
 *
 * `page` is deliberately NOT in the noindex set: pagination is not duplicate content, and /shop?page=2
 * through ?page=890 is now the only crawl path to the 10,669th product.
 */

/** 12, not 24: three columns on desktop (see ShopPageClient) so 12 is four clean rows. */
export const SHOP_PER_PAGE = 12;

export const SHOP_SORTS = ['popularity', 'price-asc', 'price-desc', 'newest', 'best-sellers'] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];
export const DEFAULT_SHOP_SORT: ShopSort = 'popularity';

export interface ShopQuery {
  page: number;
  search: string;
  /** TOP-level category slugs ('proteines'), never subcategory slugs. */
  categories: string[];
  brands: number[];
  flavors: string[];
  inStock: boolean;
  sort: ShopSort;
  /** null means "not set by the shopper" — distinct from 0, which is a real lower bound. */
  minPrice: number | null;
  maxPrice: number | null;
}

export const EMPTY_SHOP_QUERY: ShopQuery = {
  page: 1,
  search: '',
  categories: [],
  brands: [],
  flavors: [],
  inStock: false,
  sort: DEFAULT_SHOP_SORT,
  minPrice: null,
  maxPrice: null,
};

/**
 * The sidebar's description of the WHOLE catalogue, from /api/shop_facets.
 *
 * Every field here used to be derived in the browser from the full product array. None of them can
 * be derived from a 12-row page, which is why the endpoint exists.
 */
export interface ShopFacets {
  /**
   * `p99` is what the slider spans, not `max`.
   *
   * Measured on the live catalogue: min 11 DT, max 40 000 DT. A slider across that range puts every
   * price a shopper actually browses — 50 to 150 DT — inside the first 0.4% of the track, because
   * of a single outlier. p99 is the 99th percentile.
   *
   * Nothing becomes unreachable: a handle at its maximum is written as NO upper bound (null), not
   * as `max_price=p99`, so an untouched slider still returns the 40 000 DT item.
   */
  price: { min: number; max: number; p99: number };
  flavors: string[];
  /**
   * The sidebar's brand list — id and name only, and only brands that HAVE a published product.
   *
   * /shop used to build this from getAllBrands(), which cost ~100 KB in the page (589 rows carrying
   * `created_at`/`updated_at` that nothing on a checkbox renders) and six sequential API calls per
   * render, because that endpoint is walked 100 rows at a time. A checkbox needs an id and a name;
   * its count comes from `brand_counts` below.
   */
  brands: Array<{ id: number; designation_fr: string; slug: string }>;
  /** category slug -> published product count */
  category_counts: Record<string, number>;
  /** brand id (as a string key, because JSON) -> published product count */
  brand_counts: Record<string, number>;
  subcategories: Array<{ id: number; name: string; slug: string; categoryId: number | null }>;
  total_published: number;
}

/** What Next hands a server component, and what URLSearchParams can be normalised into. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/**
 * Split on commas AND collapse repeated keys, so `?brand=1&brand=2` and `?brand=1,2` agree.
 * Decoding is applied per-item because a flavour can legitimately contain a space ("Cookies & Cream").
 */
function csv(value: string | string[] | undefined): string[] {
  const joined = Array.isArray(value) ? value.join(',') : (value ?? '');
  return joined
    .split(',')
    .map((part) => {
      try {
        return decodeURIComponent(part).trim();
      } catch {
        // A malformed %-sequence must not 500 the boutique. Fall back to the raw text.
        return part.trim();
      }
    })
    .filter((part) => part !== '');
}

function toPositiveInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseShopQuery(searchParams: RawSearchParams | undefined): ShopQuery {
  const sp = searchParams ?? {};

  const sortRaw = first(sp.sort).trim().toLowerCase();
  const sort = (SHOP_SORTS as readonly string[]).includes(sortRaw)
    ? (sortRaw as ShopSort)
    : DEFAULT_SHOP_SORT;

  const brands = csv(sp.brand)
    .concat(csv(sp.brands))
    .map((b) => Number.parseInt(b, 10))
    .filter((b) => Number.isFinite(b) && b > 0);

  const inStockRaw = first(sp.in_stock).trim().toLowerCase();

  return {
    page: toPositiveInt(first(sp.page), 1),
    search: (() => {
      const raw = first(sp.search);
      try {
        return decodeURIComponent(raw).trim();
      } catch {
        return raw.trim();
      }
    })(),
    categories: csv(sp.category).concat(csv(sp.categories)),
    // Dedupe: `?brand=72&brands=72` is one brand, and a duplicated id in a whereIn is a wasted
    // index probe on a 10,669-row table.
    brands: Array.from(new Set(brands)),
    flavors: Array.from(new Set(csv(sp.flavors))),
    inStock: inStockRaw === '1' || inStockRaw === 'true',
    sort,
    minPrice: toNumberOrNull(first(sp.min_price)),
    maxPrice: toNumberOrNull(first(sp.max_price)),
  };
}

/**
 * Exactly the query string /api/all_products understands.
 *
 * Every key here is one the backend actually branches on — verified against
 * ApisController::allProducts. Sending a key it ignores is not harmless: it changes the cache key
 * without changing the result, so the same page is computed and stored twice.
 */
export function shopQueryToApiParams(query: ShopQuery, perPage = SHOP_PER_PAGE): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page,
    per_page: perPage,
    sort: query.sort,
    /*
     * Drop the brand and category sets from the response. Measured at per_page=12, `brands` is
     * 56 KB against the products' 12 KB — 566 brands after the iHerb import, 4.7x the payload the
     * caller actually asked for, rebuilt on every request.
     *
     * Safe here specifically: /shop receives the full brand list from getAllBrands() and its facet
     * counts from /api/shop_facets, and ShopPageClient only ever reads productsData.brands as a
     * fallback BEHIND that list. Other callers of /all_products keep the default and are untouched.
     */
    light: 1,
  };

  if (query.search) params.search = query.search;
  if (query.categories.length > 0) params.categories = query.categories.join(',');
  if (query.brands.length > 0) params.brands = query.brands.join(',');
  if (query.flavors.length > 0) params.flavors = query.flavors.join(',');
  if (query.inStock) params.in_stock = 1;
  if (query.minPrice !== null) params.min_price = query.minPrice;
  if (query.maxPrice !== null) params.max_price = query.maxPrice;

  return params;
}

/**
 * The inverse: a shareable URL. Defaults are OMITTED rather than written out, so the canonical
 * boutique stays `/shop` and not `/shop?page=1&sort=popularity` — two URLs for one page is the
 * duplicate-content problem this migration is supposed to reduce, not add to.
 */
export function buildShopUrl(query: ShopQuery, basePath = '/shop'): string {
  const parts: string[] = [];
  const add = (key: string, value: string) => {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  };

  if (query.search) add('search', query.search);
  if (query.categories.length > 0) add('category', query.categories.join(','));
  if (query.brands.length > 0) add('brand', query.brands.join(','));
  if (query.flavors.length > 0) add('flavors', query.flavors.join(','));
  if (query.inStock) add('in_stock', '1');
  if (query.sort !== DEFAULT_SHOP_SORT) add('sort', query.sort);
  if (query.minPrice !== null) add('min_price', String(query.minPrice));
  if (query.maxPrice !== null) add('max_price', String(query.maxPrice));
  if (query.page > 1) add('page', String(query.page));

  return parts.length > 0 ? `${basePath}?${parts.join('&')}` : basePath;
}

/** True when the shopper has narrowed the catalogue in any way other than paging through it. */
export function isShopFiltered(query: ShopQuery): boolean {
  return (
    query.search !== '' ||
    query.categories.length > 0 ||
    query.brands.length > 0 ||
    query.flavors.length > 0 ||
    query.inStock ||
    query.sort !== DEFAULT_SHOP_SORT ||
    query.minPrice !== null ||
    query.maxPrice !== null
  );
}
