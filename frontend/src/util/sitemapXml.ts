import { getSitemapEntries, type SectionedSitemapEntry, type SitemapSection } from '@/util/sitemapData';

/**
 * Sitemap index + child-sitemap XML.
 *
 * /sitemap.xml used to be a single <urlset> of ~520 URLs produced by Next's `app/sitemap.ts`
 * metadata convention. That works until it doesn't: the protocol caps a sitemap at 50,000 URLs /
 * 50MB, a single flat file gives Search Console one opaque coverage number for the whole site, and
 * every crawler poll re-read the entire catalogue.
 *
 * This emits a real sitemap INDEX: /sitemap.xml lists one child per content type, products are
 * chunked, and every child shares ONE cached data crawl (see getSitemapEntriesForSection). Coverage
 * is then reported per type in Search Console — "products indexed" separately from "blog indexed" —
 * which is what makes a drop diagnosable instead of just visible.
 *
 * The index lives at the SAME url Search Console already has on file, and a <sitemapindex> is a
 * drop-in replacement for a <urlset> there, so nothing needs resubmitting.
 */

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn').replace(/\/$/, '');

/** Well under the 50k protocol limit, so a chunk stays small enough to fetch and diff by hand. */
const PRODUCTS_PER_CHUNK = 5000;

export const SITEMAP_CACHE_HEADER = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

/** XML text escaping. URLs carry `&` (and admin copy can carry anything), which would break the doc. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** W3C datetime, which is what <lastmod> requires. Invalid dates are dropped, never emitted as "Invalid Date". */
function toW3CDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * The child sitemaps, in the order they appear in the index. `count` drives whether a file is
 * listed at all — an empty section is omitted rather than published as an empty <urlset>, which
 * Search Console flags as an error.
 */
export type SitemapFile = {
  /** Path segment under /sitemaps/, e.g. "products-0.xml". */
  file: string;
  section: SitemapSection;
  /** Index into the section's entries, for chunked sections. */
  chunk: number;
  count: number;
  lastModified: string | null;
};

function newestLastMod(entries: SectionedSitemapEntry[]): string | null {
  let newest: number | null = null;
  for (const entry of entries) {
    const iso = toW3CDate(entry.lastModified);
    if (!iso) continue;
    const t = Date.parse(iso);
    if (newest === null || t > newest) newest = t;
  }
  return newest === null ? null : new Date(newest).toISOString();
}

/**
 * Build the manifest of child sitemaps from the single cached crawl. Products are the only section
 * big enough to chunk today; the others are one file each.
 */
export async function getSitemapManifest(): Promise<SitemapFile[]> {
  const all = await getSitemapEntries();
  const bySection = new Map<SitemapSection, SectionedSitemapEntry[]>();
  for (const entry of all) {
    const list = bySection.get(entry.section);
    if (list) list.push(entry);
    else bySection.set(entry.section, [entry]);
  }

  const order: SitemapSection[] = ['static', 'listings', 'products', 'blog', 'pages'];
  const files: SitemapFile[] = [];

  for (const section of order) {
    const entries = bySection.get(section) ?? [];
    if (entries.length === 0) continue;

    if (section !== 'products') {
      files.push({
        file: `${section}.xml`,
        section,
        chunk: 0,
        count: entries.length,
        lastModified: newestLastMod(entries),
      });
      continue;
    }

    const chunks = Math.max(1, Math.ceil(entries.length / PRODUCTS_PER_CHUNK));
    for (let i = 0; i < chunks; i++) {
      const slice = entries.slice(i * PRODUCTS_PER_CHUNK, (i + 1) * PRODUCTS_PER_CHUNK);
      files.push({
        file: `products-${i}.xml`,
        section,
        chunk: i,
        count: slice.length,
        lastModified: newestLastMod(slice),
      });
    }
  }

  return files;
}

/** Resolve a requested /sitemaps/{file} back to its entries, or null when the name is unknown. */
export async function getEntriesForFile(file: string): Promise<SectionedSitemapEntry[] | null> {
  const manifest = await getSitemapManifest();
  const target = manifest.find((m) => m.file === file);
  if (!target) return null;

  const all = await getSitemapEntries();
  const entries = all.filter((e) => e.section === target.section);
  if (target.section !== 'products') return entries;
  return entries.slice(target.chunk * PRODUCTS_PER_CHUNK, (target.chunk + 1) * PRODUCTS_PER_CHUNK);
}

export function renderSitemapIndex(files: SitemapFile[]): string {
  const items = files
    .map((f) => {
      const lastmod = f.lastModified ? `\n    <lastmod>${f.lastModified}</lastmod>` : '';
      return `  <sitemap>\n    <loc>${xmlEscape(`${BASE_URL}/sitemaps/${f.file}`)}</loc>${lastmod}\n  </sitemap>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

export function renderUrlSet(entries: SectionedSitemapEntry[]): string {
  const items = entries
    .map((entry) => {
      const parts = [`    <loc>${xmlEscape(entry.url)}</loc>`];

      const lastmod = toW3CDate(entry.lastModified);
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      if (entry.changeFrequency) parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      if (typeof entry.priority === 'number') {
        parts.push(`    <priority>${entry.priority.toFixed(2)}</priority>`);
      }

      // Google Images: product and article covers are declared so image search can index them.
      // Preserved from the previous sitemap — image search already drives real traffic here.
      const images = Array.isArray(entry.images) ? entry.images : [];
      for (const image of images) {
        if (!image) continue;
        parts.push(`    <image:image>\n      <image:loc>${xmlEscape(String(image))}</image:loc>\n    </image:image>`);
      }

      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${items}
</urlset>
`;
}
