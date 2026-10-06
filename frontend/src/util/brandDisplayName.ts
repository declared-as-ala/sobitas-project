/**
 * The name a brand page, title, card or alt shows for a brand — ONE answer for every surface.
 *
 * Order of authority:
 *   1. a curated entry's explicit `displayName` (added to BrandSeoEntry by the copy pass);
 *   2. a curated entry's metaTitle prefix, the text before « Tunisie »: all 54 curated titles
 *      follow `{Marque} Tunisie …`, so the reviewed casing already exists there — « BioTech USA »,
 *      « WeightWorld », « NOW Foods », « C4 / Cellucor », « Doctor’s Best »;
 *   3. otherwise humanizeBrandName(raw), which only re-cases multi-word all-caps rows.
 *
 * A curated name is never re-derived from the database row, so the brand index, the brand page
 * <title>, its H1 and its JSON-LD name agree by construction.
 */
import { getBrandSeoEntry, type BrandSeoEntry } from '@/config/brandSeoConfig';
import { brandNameToSlug } from '@/util/brandSlug';
import { humanizeBrandName } from '@/util/brandName';

export type BrandSeoExtras = {
  displayName: string | null;
  relatedBrands: string[];
  officialUrl: string | null;
  /** A curated logo alt, for an admin logo that is not the brand's own wordmark. */
  logoAlt: string | null;
};

/**
 * Optional fields the copy pass adds to BrandSeoEntry (`displayName`, `relatedBrands`,
 * `officialUrl`). Read defensively so this compiles and behaves the same before and after those
 * fields exist on the interface: a missing or malformed value is simply absent.
 */
export function brandSeoExtras(entry: BrandSeoEntry | null): BrandSeoExtras {
  const loose = (entry ?? {}) as { displayName?: unknown; relatedBrands?: unknown; officialUrl?: unknown; logoAlt?: unknown };
  const displayName = typeof loose.displayName === 'string' && loose.displayName.trim()
    ? loose.displayName.replace(/\s+/g, ' ').trim()
    : null;
  const relatedBrands = Array.isArray(loose.relatedBrands)
    ? [...new Set(loose.relatedBrands
      .filter((slug): slug is string => typeof slug === 'string')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean))]
    : [];
  const url = typeof loose.officialUrl === 'string' ? loose.officialUrl.trim() : '';
  const logoAlt = typeof loose.logoAlt === 'string' && loose.logoAlt.trim()
    ? loose.logoAlt.replace(/\s+/g, ' ').trim()
    : null;
  return { displayName, relatedBrands, officialUrl: /^https:\/\//.test(url) ? url : null, logoAlt };
}

/**
 * Logo alts for brands WITHOUT a curated entry whose admin file shows another wordmark. Kept here,
 * not as a curated entry: an entry would also change the brand's <title> and display name
 * (curatedTitlePrefix). Brand 30's file (brands/September2023/ZRIH2Olxt7i0vog5F1lr.JPG) reads
 * « GALVANIZE NUTRITION » — the middleware already 301s /galvanize-nutrition here.
 */
const LOGO_ALT_BY_SLUG: Record<string, string> = {
  'galvanize-chrome': 'Logo Galvanize Nutrition',
};

/**
 * The alt of a brand's logo: the curated `logoAlt` when the admin file is not the brand's
 * wordmark (big-ramy-labs, kong-sport-nutrition), then LOGO_ALT_BY_SLUG, else « Logo {display
 * name} ». Server-side only — it reads the config.
 */
export function brandLogoAlt(raw: string, slug?: string): string {
  const key = slug ?? brandNameToSlug(raw);
  return brandSeoExtras(getBrandSeoEntry(key)).logoAlt ?? LOGO_ALT_BY_SLUG[key] ?? `Logo ${brandDisplayName(raw, key)}`;
}

/** The curated metaTitle prefix: « BioTech USA Tunisie : … » → « BioTech USA ». */
function curatedTitlePrefix(entry: BrandSeoEntry): string | null {
  const prefix = entry.metaTitle.match(/^(.+?)\s+Tunisie\b/)?.[1]?.trim();
  return prefix || null;
}

export function brandDisplayName(raw: string, slug?: string): string {
  const key = slug ?? brandNameToSlug(raw);
  const entry = getBrandSeoEntry(key);
  if (entry) {
    const curated = brandSeoExtras(entry).displayName ?? curatedTitlePrefix(entry);
    if (curated) return curated;
  }
  return humanizeBrandName(raw) || String(raw ?? '').trim();
}
