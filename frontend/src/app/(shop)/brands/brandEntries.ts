import type { Brand } from '@/types';
import { brandNameToSlug } from '@/util/brandSlug';

/**
 * ONE brand, reduced to the six fields the directory actually renders.
 *
 * ── WHY A PROJECTION AND NOT `Brand[]` ─────────────────────────────────────────────────────
 * The page hands its list to a client island, so every field on it is paid for twice: once in
 * the server HTML and again in the RSC flight payload that hydrates it. A raw `/all_brands` row
 * carries `created_at`, `updated_at`, `designation_ar` and `alt_cover` — four fields the
 * directory never reads — and there are 589 rows. Measured against the live API on 19/08/2026:
 * 589 raw rows serialise to ~100 KB, this projection to ~34 KB. The saving lands on every visit
 * and on every crawl, which is the same argument that took the header search from 14 KB a
 * keystroke to 1.8 KB.
 *
 * Single-letter keys were considered and rejected. They would save perhaps 6 KB more and make
 * every call site unreadable; the four dropped fields were the actual weight.
 */
export interface BrandEntry {
  id: number;
  name: string;
  /** The slug the brand is SERVED at — `brandNameToSlug`, so overrides are already applied. */
  slug: string;
  /** Published products, from `shop_facets.brand_counts`. */
  count: number;
  /** Products that can be shipped today. 0 when none, and see `hasStockData` below. */
  stock: number;
  /** Storage path, or null. Only ~8% of brands have one — see `FEATURED` in the page. */
  logo: string | null;
  /** The A–Z bucket: an uppercase letter, or '#' for anything that does not start with one. */
  letter: string;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * The bucket a name falls into, accent-folded first.
 *
 * `Écopharma` sorting under `#` next to `7Nutrition` is the kind of small wrongness that makes a
 * directory feel unmaintained, and French brand names carry accents on the first letter often
 * enough to matter. NFD + strip marks puts it under E, where a reader will look for it.
 */
function bucketOf(name: string): string {
  const first = String(name ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .charAt(0)
    .toUpperCase();
  return LETTERS.includes(first) ? first : '#';
}

/**
 * Build the directory's rows from the three server fetches.
 *
 * ── BRANDS WITH ZERO PUBLISHED PRODUCTS ARE DROPPED ────────────────────────────────────────
 * 12 of the 589 rows have no published product behind them (measured 19/08/2026): MYPROTEIN,
 * MUTANT, BSN, USN, Rule 1, Trec and six more. Their brand pages render an empty grid, so every
 * one of them was a crawlable internal link from /brands to a soft-404 — twelve of them, on a
 * page whose entire job is internal linking. They are not "coming soon", they are rows in an
 * admin table with nothing attached.
 *
 * ── UNLESS THE COUNTS FAILED, IN WHICH CASE NOTHING IS DROPPED ─────────────────────────────
 * `brand_counts` comes from /shop_facets, which fails to `{}` by design. Filtering on a count
 * that is zero *because the facets endpoint was down* would empty the entire directory — an
 * outage in an incidental endpoint taking out the page it decorates. So an empty map switches
 * the filter off and hides the counts, and the page degrades to the plain A–Z list it was.
 */
export function buildBrandEntries(
  brands: Brand[],
  brandCounts: Record<string, number>,
  stockCounts: Record<number, number>
): { entries: BrandEntry[]; hasCounts: boolean; hasStockData: boolean } {
  const hasCounts = Object.keys(brandCounts).length > 0;
  const hasStockData = Object.keys(stockCounts).length > 0;

  const entries = (Array.isArray(brands) ? brands : [])
    .filter((b) => b && typeof b.designation_fr === 'string' && b.designation_fr.trim().length > 0)
    .map<BrandEntry>((b) => {
      const name = b.designation_fr.trim();
      return {
        id: b.id,
        name,
        slug: brandNameToSlug(name),
        count: Number(brandCounts[String(b.id)] ?? 0) || 0,
        stock: Number(stockCounts[b.id] ?? 0) || 0,
        logo: b.logo || null,
        letter: bucketOf(name),
      };
    })
    .filter((e) => (hasCounts ? e.count > 0 : true))
    // localeCompare with 'fr' so the A–Z rail and the groups under it agree on where an accented
    // name sits — bucketOf folds accents, and a plain code-point sort does not.
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  return { entries, hasCounts, hasStockData };
}
