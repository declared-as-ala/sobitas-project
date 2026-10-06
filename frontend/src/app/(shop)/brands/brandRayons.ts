/**
 * /brands — which brands fill each of the eight money rayons, and what of theirs ships today.
 *
 * SERVER ONLY. It reads the API through `getApiPage` and caches through `unstable_cache`, neither
 * of which may reach a client bundle; only BrandRayons.tsx (a server component) and page.tsx
 * import it. (There is no `server-only` package in this app, so the rule is this sentence.)
 *
 * ── WHY THE BRAND INDEX LINKS INTO THE CATEGORIES ─────────────────────────────────────────────
 * /brands sits at #5 for `marques protéine tunisie` and links to 578 brand pages, and until this
 * file it linked to none of the eight category pages that carry the shop's commercial queries
 * (/whey-proteine, /creatine…). A "brands by rayon" block is the one place where both link sets
 * belong in the same sentence: « au rayon créatine, BioTech USA et Real Pharm ont du stock ».
 *
 * ── WHAT IT COSTS ─────────────────────────────────────────────────────────────────────────────
 * Measured 05/10/2026: the eight rayons are 1,290 products over 18 pages of 100 (+6 for the
 * repair pass on /creatine and /pre-workout, see readRayonRows); the in-stock index is 148
 * products over 2 pages. Each is cached for an hour, so ~26 API requests an hour across all
 * visitors — against 9 UNCACHED requests per view that the page made before.
 *
 * ── EVERY NUMBER IS A COUNT OF ROWS THE API RETURNED ──────────────────────────────────────────
 * Nothing here is estimated or editorial. A rayon whose read fails is LEFT OUT (and logged); it is
 * never shown with a partial count, because « 94 marques · 225 produits » is a claim, and half a
 * crawl would make it a false one.
 */
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';
import { taxonomyLabel } from '@/config/catalogTaxonomy';
import { getApiPage } from '@/services/api';
import { brandDisplayName } from '@/util/brandDisplayName';
import { canonicalCategoryPath } from '@/util/resolveCategorySeo';
import { crawlPaginated, describeCrawl } from '@/util/sitemapCrawl';

/** The eight rayons, in the order the cards render: protein first, then performance, then health. */
export const RAYON_SLUGS: readonly string[] = Object.freeze([
  'whey-proteine',
  'whey-isolate',
  'creatine',
  'pre-workout',
  'mass-gainers',
  'bruleurs-de-graisse',
  'bcaa',
  'omega-3',
]);

/** Brand links per card. Six fills a phone screen without turning the card into a directory. */
const BRANDS_PER_RAYON = 6;
/** Brands the FAQ names as « les plus fournies » — by reference count, see `leaders`. */
const LEADERS_PER_RAYON = 3;

const CACHE_OPTIONS = { revalidate: 3600, tags: ['brands', 'shop', 'products'] };

/** The same request getInStockBrandCounts makes, read once for both maps. */
const IN_STOCK_PATH = '/all_products?in_stock=1&light=1&fields=index';
const IN_STOCK_MAX_PAGES = 4;

export type BrandStock = {
  /** brand id → products that can be shipped today. */
  byBrand: Record<number, number>;
  /** subcategory slug → brand id → products that can be shipped today. */
  byCategory: Record<string, Record<number, number>>;
};

export type RayonBrand = {
  id: number;
  /** `brandDisplayName` — the same string the A–Z directory shows. */
  name: string;
  slug: string;
  /** Published products of this brand IN THIS RAYON. */
  count: number;
  /** Of those, how many ship today. */
  inStock: number;
};

export type BrandRayon = {
  slug: string;
  label: string;
  url: string;
  /** Distinct brands with at least one published product in the rayon. */
  brandCount: number;
  /** Published products in the rayon. */
  productCount: number;
  /** The card's links: in stock first, then curated brand pages, then depth. At most 6. */
  brands: RayonBrand[];
  /**
   * The brands with the MOST references in the rayon, highest first (at most 3).
   *
   * Separate from `brands` on purpose. The card ranks by what ships today, so its first rows are
   * not always the deepest ranges — at whey isolate, MR.X has 3 references and 1 in stock while
   * Perfect Sports has 18 and none. The FAQ says « les plus fournies sont… (n références) », and
   * that sentence is only true of a list sorted by reference count. So the FAQ reads this list
   * and the card reads `brands`, and neither sentence can quietly become false.
   */
  leaders: RayonBrand[];
};

type IndexRow = {
  id?: number;
  brand_id?: number | null;
  sous_categorie?: { slug?: string | null } | null;
};

type RayonCounts = { productCount: number; byBrand: Record<number, number> };

const EMPTY_STOCK: BrandStock = { byBrand: {}, byCategory: {} };

/* ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE IN-STOCK INDEX
 * ───────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Up to four pages of the in-stock index, the same bound getInStockBrandCounts has always used
 * (148 products today, 2 pages). Any failed page THROWS so the cache below stores nothing; a
 * stock map that silently lost page 2 would print « 0 en stock » next to brands that have stock.
 */
async function readBrandStock(): Promise<BrandStock> {
  const byBrand: Record<number, number> = {};
  const byCategory: Record<string, Record<number, number>> = {};

  for (let page = 1; page <= IN_STOCK_MAX_PAGES; page += 1) {
    const res = (await getApiPage(IN_STOCK_PATH, page, 100)) as {
      products?: IndexRow[];
      pagination?: { last_page?: number };
    } | null;
    const rows = res?.products;
    if (!Array.isArray(rows)) throw new Error(`in-stock index page ${page} carried no products array`);
    for (const row of rows) {
      const id = Number(row?.brand_id);
      if (!Number.isFinite(id) || id <= 0) continue;
      byBrand[id] = (byBrand[id] ?? 0) + 1;
      const sub = String(row?.sous_categorie?.slug ?? '').trim();
      if (sub) {
        const bucket = (byCategory[sub] ??= {});
        bucket[id] = (bucket[id] ?? 0) + 1;
      }
    }
    const lastPage = Number(res?.pagination?.last_page ?? 1);
    if (!Number.isFinite(lastPage) || page >= lastPage || rows.length === 0) break;
    if (page === IN_STOCK_MAX_PAGES) {
      // Not an error: the bound is a cost cap. Say so, so a truncated count is never a mystery.
      console.warn(
        `[brands] in-stock index has ${lastPage} pages; read the first ${IN_STOCK_MAX_PAGES} only`
      );
    }
  }

  return { byBrand, byCategory };
}

const cachedBrandStock = unstable_cache(readBrandStock, ['brands-stock-v1'], CACHE_OPTIONS);

/**
 * Both stock maps, from one read of the in-stock index an hour. Never throws: on failure it logs
 * and returns empty maps, which every consumer reads as "stock unknown" (no dots, no « en stock »
 * clauses) rather than as "nothing in stock". React `cache()` so the directory and the rayon
 * cards share one call per request instead of racing two on a cold cache.
 */
export const loadBrandStock = cache(async (): Promise<BrandStock> => {
  try {
    return await cachedBrandStock();
  } catch (err) {
    console.error('[brands] in-stock index failed — rendering without stock data:', err);
    return EMPTY_STOCK;
  }
});

/* ─────────────────────────────────────────────────────────────────────────────────────────────
 * ONE RAYON
 * ───────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Every published product of one subcategory, reduced to brand id → count.
 *
 * Through crawlPaginated, the crawler the sitemap and getAllBrands already trust: it walks to the
 * reported last page, retries a transient failure, and reports a shortfall instead of returning a
 * short list as if it were whole. A shortfall THROWS here, so a partial rayon is never cached.
 *
 * Rows are counted only when `sous_categorie.slug` is the rayon's own slug (or absent). Measured
 * 05/10/2026 the filter is exact — 0 foreign rows across all eight — so this changes nothing
 * today; it is what keeps « 225 produits » true if the API ever starts returning children.
 */
function crawlRayon(slug: string, sort?: string) {
  const query = `subcategories=${encodeURIComponent(slug)}&fields=index${sort ? `&sort=${sort}` : ''}`;
  return crawlPaginated<IndexRow>({
    label: `/all_products?${query}`,
    perPage: 100,
    // omega-3 is the deepest rayon at 4 pages (329 products). 12 leaves room to triple.
    maxRequests: 12,
    concurrency: 1,
    rowsKey: 'products',
    fetchPage: (page, perPage) => getApiPage(`/all_products?${query}`, page, perPage),
  });
}

/*
  ── ONE SHORT CRAWL IS EXPECTED, AND A SECOND SORT ORDER REPAIRS IT ─────────────────────────
  Measured 05/10/2026: /creatine reports total 225 and an offset walk returns 224 distinct rows
  plus one duplicate; /pre-workout 214 → 213 + 1. Every time, the same row. The endpoint orders by
  `created_at` alone (ApisController::allProducts, the `newest` branch) and the bulk import gave
  hundreds of products the same timestamp, so the order of ties is not stable from one OFFSET
  query to the next and one row falls between page 2 and page 3. A second walk ordered by price
  has DIFFERENT ties, and the union of the two came back complete (225/225, 214/214) — so that is
  the repair, paid only by a rayon that came back short (≈3 extra requests an hour each). If the
  union is still short the rayon throws and its card is left out, as before. The lasting fix is an
  `id` tie-breaker in the backend sort; until then this keeps every count exact.
*/
async function readRayonRows(slug: string): Promise<IndexRow[]> {
  const first = await crawlRayon(slug);
  const check = describeCrawl(`rayon ${slug}`, first);
  if (check.shortfall === 0) return first.rows;

  const second = await crawlRayon(slug, 'price_asc');
  const byId = new Map<number, IndexRow>();
  const unkeyed: IndexRow[] = [];
  for (const row of [...first.rows, ...second.rows]) {
    const id = Number(row?.id);
    if (Number.isFinite(id) && id > 0) byId.set(id, row);
    else if (first.rows.includes(row)) unkeyed.push(row);
  }
  const rows = [...byId.values(), ...unkeyed];
  const minimum = Math.max(0, first.expectedTotal - first.drift);
  if (first.expectedTotal >= 0 && rows.length < minimum) {
    throw new Error(
      `${check.message}; still ${minimum - rows.length} short after a second, price-sorted walk`
    );
  }
  return rows;
}

async function readRayonCounts(slug: string): Promise<RayonCounts> {
  const rows = await readRayonRows(slug);

  const byBrand: Record<number, number> = {};
  let productCount = 0;
  for (const row of rows) {
    const sub = row?.sous_categorie?.slug;
    if (sub && sub !== slug) continue;
    productCount += 1;
    const id = Number(row?.brand_id);
    if (Number.isFinite(id) && id > 0) byBrand[id] = (byBrand[id] ?? 0) + 1;
  }
  return { productCount, byBrand };
}

/** Keyed by slug (unstable_cache folds the argument into the key): one entry per rayon. */
const cachedRayonCounts = unstable_cache(readRayonCounts, ['brands-rayon-counts-v1'], CACHE_OPTIONS);

/* ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE CARDS
 * ───────────────────────────────────────────────────────────────────────────────────────────── */

/** What the loader needs to know about a directory brand. `rawName` is the admin designation. */
export type RayonBrandSource = { id: number; name: string; slug: string; rawName?: string };

function byName(a: RayonBrand, b: RayonBrand): number {
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
}

function buildRayon(
  slug: string,
  counts: RayonCounts,
  stockInRayon: Record<number, number>,
  directory: ReadonlyMap<number, RayonBrandSource>
): BrandRayon {
  const linked: Array<RayonBrand & { curated: boolean }> = [];
  for (const [rawId, count] of Object.entries(counts.byBrand)) {
    const id = Number(rawId);
    const brand = directory.get(id);
    // Only brands the directory lists: a link to a brand page the index itself drops (no
    // published products in /shop_facets) would be the soft-404 link the 19/08 rebuild removed.
    if (!brand || count <= 0) continue;
    linked.push({
      id,
      name: brand.rawName ? brandDisplayName(brand.rawName, brand.slug) || brand.name : brand.name,
      slug: brand.slug,
      count,
      inStock: Number(stockInRayon[id] ?? 0) || 0,
      curated: getBrandSeoEntry(brand.slug) !== null,
    });
  }

  const strip = ({ id, name, slug: brandSlug, count, inStock }: RayonBrand): RayonBrand => ({
    id,
    name,
    slug: brandSlug,
    count,
    inStock,
  });

  const brands = [...linked]
    .sort(
      (a, b) =>
        b.inStock - a.inStock ||
        Number(b.curated) - Number(a.curated) ||
        b.count - a.count ||
        byName(a, b)
    )
    .slice(0, BRANDS_PER_RAYON)
    .map(strip);

  const leaders = [...linked]
    .sort((a, b) => b.count - a.count || b.inStock - a.inStock || byName(a, b))
    .slice(0, LEADERS_PER_RAYON)
    .map(strip);

  return {
    slug,
    label: taxonomyLabel(slug),
    url: canonicalCategoryPath(slug),
    brandCount: Object.values(counts.byBrand).filter((n) => n > 0).length,
    productCount: counts.productCount,
    brands,
    leaders,
  };
}

/**
 * The rayon cards for /brands, in RAYON_SLUGS order.
 *
 * Never throws. A rayon whose read failed is dropped (and logged) and the others still render;
 * if every read failed the result is `[]` and the section does not render at all. Failures are
 * never cached — unstable_cache stores nothing when its function throws — so the next request
 * simply tries again.
 *
 * Reads run four rayons at a time: on a cold cache that is at most four first-pages in flight,
 * which keeps this page from bursting the API's per-IP budget it shares with every SSR render.
 */
export async function loadBrandRayons(
  brands: ReadonlyArray<RayonBrandSource>
): Promise<BrandRayon[]> {
  if (brands.length === 0) return [];
  try {
    const directory = new Map(brands.map((b) => [b.id, b]));
    const stockPromise = loadBrandStock();

    const counts: Array<RayonCounts | null> = [];
    for (let i = 0; i < RAYON_SLUGS.length; i += 4) {
      const batch = RAYON_SLUGS.slice(i, i + 4);
      counts.push(
        ...(await Promise.all(
          batch.map((slug) =>
            cachedRayonCounts(slug).catch((err) => {
              console.error(`[brands] rayon ${slug} failed — card left out:`, err);
              return null;
            })
          )
        ))
      );
    }
    const stock = await stockPromise;

    const rayons: BrandRayon[] = [];
    RAYON_SLUGS.forEach((slug, i) => {
      const c = counts[i];
      if (!c || c.productCount === 0) return;
      const rayon = buildRayon(slug, c, stock.byCategory[slug] ?? {}, directory);
      if (rayon.brands.length > 0) rayons.push(rayon);
    });
    return rayons;
  } catch (err) {
    console.error('[brands] rayon cards failed — section left out:', err);
    return [];
  }
}
