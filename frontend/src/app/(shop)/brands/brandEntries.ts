import type { Brand } from '@/types';
import { brandDisplayName, brandLogoAlt } from '@/util/brandDisplayName';
import { brandNameToSlug } from '@/util/brandSlug';

/**
 * ONE brand, reduced to the fields the page actually renders.
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
 * The directory island gets an even narrower `DirectoryEntry` (below): `rawName` and `logo` are
 * read only by the 24 featured plates and the JSON-LD, so they stay on the server for the other
 * ~550 rows.
 */
export interface BrandEntry {
  id: number;
  /**
   * The name as a reader should see it — `brandDisplayName`, so 'BIOTECH USA' reads
   * 'BioTech USA' and 'BIG RAMY LABS' reads 'Big Ramy Labs'. Sort order and the A–Z buckets use
   * this, because it is the string the reader scans.
   */
  name: string;
  /**
   * The admin's `designation_fr`, untouched. The slug and every JSON-LD `@id` are derived from
   * THIS, never from `name`: products already reference `https://protein.tn/biotech-usa` as their
   * brand `@id`, and a display-name rewrite must not be able to move that identifier.
   */
  rawName: string;
  /** The slug the brand is SERVED at — `brandNameToSlug(rawName)`, so overrides are applied. */
  slug: string;
  /** Published products, from `shop_facets.brand_counts`. */
  count: number;
  /** Products that can be shipped today. 0 when none, and see `hasStockData` below. */
  stock: number;
  /** Storage path, or null. Only ~8% of brands have one — see the featured tier. */
  logo: string | null;
  /**
   * The plate's alt, resolved here on the server (brandLogoAlt: « Logo {name} », or a curated
   * override when the admin file is not the wordmark) so the client island never imports the
   * curated config. Set only when there is a logo.
   */
  logoAlt?: string;
  /** The A–Z bucket: an uppercase letter, or '#' for anything that does not start with one. */
  letter: string;
}

/** What the A–Z island needs, and nothing else. */
export type DirectoryEntry = Omit<BrandEntry, 'rawName' | 'logo' | 'logoAlt'>;

/** The minimum of an `/all_brands` row this file reads. The page caches exactly this shape. */
export type BrandRow = Pick<Brand, 'id' | 'designation_fr'> & { logo?: string | null };

/**
 * The 24 logo plates open on these, in this order: brand-page clicks in Search Console, 28 days
 * to 05/10/2026, highest first. Every one has a logo in the admin. Slugs, not names, because the
 * slug is the stable key — the admin can re-case 'DYMATIZE' tomorrow without moving the page.
 *
 * A slug missing from the catalogue (or with no logo) is skipped, not an error: the list is a
 * PRIORITY, never a promise that the brand exists.
 */
export const FEATURED_ORDER: readonly string[] = Object.freeze([
  'dymatize',
  'optimum-nutrition',
  'biotech-usa',
  'weightworld',
  'muscletech',
  'ostrovit',
  'eric-favre',
  'proactive',
  'big-ramy-labs',
  'william-bonac',
  'bpi-sports',
  'ultimate-nutrition',
  'gsn-great-sport-nutrition',
  'olimp-sport-nutrition',
  'universal-nutrition',
  'kevin-levrone',
  'challenger-nutrition',
]);

/** Plates on the page. Was 39 (every brand with a logo); the rest stay in the A–Z list. */
export const FEATURED_LIMIT = 24;

/**
 * Brands with real search demand and NO logo in the admin (so no plate): NOW Foods, Nutricost,
 * Floradix… — /now-foods sits at 4.4 and /floradix at 4.1 in Search Console. They get a text row
 * under the plates rather than a fake wordmark. Same rules as FEATURED_ORDER: GSC order, slugs,
 * skipped when absent or empty.
 */
export const TEXT_FEATURED_ORDER: readonly string[] = Object.freeze([
  'now-foods',
  'rule-one-proteins',
  'true-sea-moss',
  'nutricost',
  'floradix',
  'doctor-s-best',
  'one-a-day',
  'centrum',
]);

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
  brands: ReadonlyArray<BrandRow>,
  brandCounts: Record<string, number>,
  stockCounts: Record<number, number>
): { entries: BrandEntry[]; hasCounts: boolean; hasStockData: boolean } {
  const hasCounts = Object.keys(brandCounts).length > 0;
  const hasStockData = Object.keys(stockCounts).length > 0;

  const entries = (Array.isArray(brands) ? brands : [])
    .filter((b) => b && typeof b.designation_fr === 'string' && b.designation_fr.trim().length > 0)
    .map<BrandEntry>((b) => {
      const rawName = b.designation_fr.trim();
      const slug = brandNameToSlug(rawName);
      const name = brandDisplayName(rawName, slug) || rawName;
      return {
        id: b.id,
        name,
        rawName,
        slug,
        count: Number(brandCounts[String(b.id)] ?? 0) || 0,
        stock: Number(stockCounts[b.id] ?? 0) || 0,
        logo: b.logo || null,
        ...(b.logo ? { logoAlt: brandLogoAlt(rawName, slug) } : {}),
        letter: bucketOf(name),
      };
    })
    .filter((e) => (hasCounts ? e.count > 0 : true))
    // localeCompare with 'fr' so the A–Z rail and the groups under it agree on where an accented
    // name sits — bucketOf folds accents, and a plain code-point sort does not.
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  return { entries, hasCounts, hasStockData };
}

/**
 * The logo plates, in the order the page shows them.
 *
 * FEATURED_ORDER first (search demand), then whatever is shippable today (in-stock count), then
 * catalogue depth, then the name — so the tail of the 24 reads as "what you can actually order"
 * rather than as the first names in the alphabet. `logo != null` stays the gate: a plate with no
 * artwork is the empty grey square the 19/08 rebuild removed.
 */
export function pickFeaturedBrands(entries: ReadonlyArray<BrandEntry>): BrandEntry[] {
  const rank = new Map(FEATURED_ORDER.map((slug, i) => [slug, i]));
  const unranked = FEATURED_ORDER.length;
  return entries
    .filter((e) => e.logo)
    .sort(
      (a, b) =>
        (rank.get(a.slug) ?? unranked) - (rank.get(b.slug) ?? unranked) ||
        b.stock - a.stock ||
        b.count - a.count ||
        a.name.localeCompare(b.name, 'fr')
    )
    .slice(0, FEATURED_LIMIT);
}

/** The text-only row: TEXT_FEATURED_ORDER brands that exist and have at least one product. */
export function pickTextFeaturedBrands(entries: ReadonlyArray<BrandEntry>): BrandEntry[] {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  return TEXT_FEATURED_ORDER.map((slug) => bySlug.get(slug)).filter(
    (e): e is BrandEntry => Boolean(e && e.count > 0)
  );
}

/** Strip the server-only fields before a list crosses into the A–Z client island. */
export function toDirectoryEntries(entries: ReadonlyArray<BrandEntry>): DirectoryEntry[] {
  return entries.map(({ id, name, slug, count, stock, letter }) => ({
    id,
    name,
    slug,
    count,
    stock,
    letter,
  }));
}
