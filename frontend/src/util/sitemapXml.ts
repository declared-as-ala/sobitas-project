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
 * chunked, and every child shares ONE cached data crawl (getSitemapEntries in sitemapData.ts, an
 * unstable_cache entry). Coverage is then reported per type in Search Console — "products indexed"
 * separately from "blog indexed" — which is what makes a drop diagnosable instead of just visible.
 *
 * The index lives at the SAME url Search Console already has on file, and a <sitemapindex> is a
 * drop-in replacement for a <urlset> there, so nothing needs resubmitting.
 */

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn').replace(/\/$/, '');

/**
 * WHY CHUNKING EXISTS, AND WHAT THE ACTUAL LIMITS ARE
 *
 * The sitemaps.org protocol (and Google's implementation of it) caps ONE sitemap file at:
 *   • 50,000 <url> entries, and
 *   • 50 MB uncompressed.
 * A sitemap INDEX is capped the same way: 50,000 <sitemap> children, 50 MB. Exceed either and
 * Google rejects the FILE — not the excess, the file — so a catalogue that grows past the cap does
 * not degrade, it disappears. With 309 products that was theoretical. With the iHerb import
 * (47,537 discovered) a single flat urlset would cross 50,000 URLs outright.
 *
 * Byte arithmetic for this site's entry shape (computed, not measured — a <url> block here is
 * <loc> + <lastmod> + <changefreq> + <priority> + one <image:image>, ~410 bytes with a ~78-char
 * canonical and a ~92-char CDN image URL):
 *      5,000 URLs ≈ 2.0 MB      10,000 URLs ≈ 4.1 MB      50,000 URLs ≈ 20 MB
 * So the URL count is the binding constraint, not the bytes — but only just, and only because the
 * entries are small. 5,000 keeps a child at ~2 MB: comfortably inside BOTH caps with room for the
 * entry shape to grow, and small enough that a human can curl one and read it. Even at the full
 * 47,537-product import that is ~10 child files, nowhere near the 50,000-child index cap.
 *
 * A crawler is never asked to fetch more than it needs: Google refetches only the children whose
 * <lastmod> in the index moved — which is the entire reason chunking is by ID BAND below and not
 * by array slice.
 */
const PRODUCTS_PER_CHUNK = 5000;

/**
 * The protocol's hard cap. Nothing here may emit a file above it; buildSitemapFiles() asserts it
 * rather than trusting the chunking to be right, because the cost of being wrong is Google
 * discarding a whole file's worth of URLs silently.
 */
const MAX_URLS_PER_SITEMAP = 50000;

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
  /** For products: the id BAND (see groupProductEntries). For other sections: the slice index. */
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

/** A child sitemap together with the entries that belong in it. */
type SitemapFileWithEntries = SitemapFile & { entries: SectionedSitemapEntry[] };

/**
 * Split product entries into child sitemaps by ID BAND: file = floor(productId / 5000).
 *
 * WHY NOT `entries.slice(i * 5000, ...)`, WHICH IS WHAT THIS USED TO DO
 *
 * The product array arrives ordered by the API's `latest('created_at')` — newest first. Every
 * promotion wave therefore inserts at the TOP, which shifts every single URL after it across every
 * chunk boundary. Consequence: all N product children change content AND <lastmod> after every
 * batch, Google refetches all of them, and the per-file <lastmod> in the index — the one signal
 * that makes an index cheaper to crawl than a flat file — carries no information at all. With
 * 47,537 products queued for import in waves, that is the difference between refetching ~2 MB and
 * refetching ~20 MB, repeatedly.
 *
 * Banding by id fixes it structurally: a given product URL lives in the same file for its whole
 * life, so only the band that actually changed gets a new <lastmod>. It also makes the chunk size a
 * GUARANTEE rather than an arithmetic hope — a band spans exactly 5,000 ids, so it can hold at most
 * 5,000 URLs no matter what the catalogue does, and bands can never overfill past the protocol cap.
 * (Sparse ids just make a band underfull, which costs nothing.)
 *
 * Entries are sorted by id inside the band so the bytes are stable too: a file only changes when
 * one of its own products changed, which is what makes an HTTP-level diff meaningful.
 *
 * Products with no usable id (a backend regression — PRODUCT_LISTING always selects `id`) are NOT
 * dropped; they go to slice-chunked `products-u{n}.xml` files so their URLs still reach Google.
 */
function groupProductEntries(entries: SectionedSitemapEntry[]): Array<{ file: string; chunk: number; entries: SectionedSitemapEntry[] }> {
  const bands = new Map<number, SectionedSitemapEntry[]>();
  const unkeyed: SectionedSitemapEntry[] = [];

  for (const entry of entries) {
    const id = entry.productId;
    if (typeof id === 'number' && Number.isFinite(id) && id >= 0) {
      const band = Math.floor(id / PRODUCTS_PER_CHUNK);
      const list = bands.get(band);
      if (list) list.push(entry);
      else bands.set(band, [entry]);
    } else {
      unkeyed.push(entry);
    }
  }

  const groups = Array.from(bands.keys())
    .sort((a, b) => a - b)
    .map((band) => ({
      file: `products-${band}.xml`,
      chunk: band,
      entries: (bands.get(band) ?? []).sort(
        (a, b) => (a.productId ?? 0) - (b.productId ?? 0) || a.url.localeCompare(b.url)
      ),
    }));

  const unkeyedChunks = Math.ceil(unkeyed.length / PRODUCTS_PER_CHUNK);
  for (let i = 0; i < unkeyedChunks; i++) {
    groups.push({
      file: `products-u${i}.xml`,
      chunk: i,
      entries: unkeyed.slice(i * PRODUCTS_PER_CHUNK, (i + 1) * PRODUCTS_PER_CHUNK),
    });
  }

  return groups;
}

/**
 * THE single description of "which children exist and what is in each one".
 *
 * The index and the children are built from this one function on purpose. When the manifest
 * computed the split one way and getEntriesForFile recomputed it another way, the two could
 * disagree — and a child that disagrees with the index is a sitemap that advertises URLs it does
 * not serve. Deriving both from one call makes that class of bug unrepresentable.
 *
 * Both callers hit the SAME unstable_cache entry, so calling this per request costs a cache read,
 * not a catalogue crawl.
 */
async function buildSitemapFiles(): Promise<SitemapFileWithEntries[]> {
  const all = await getSitemapEntries();
  const bySection = new Map<SitemapSection, SectionedSitemapEntry[]>();
  for (const entry of all) {
    const list = bySection.get(entry.section);
    if (list) list.push(entry);
    else bySection.set(entry.section, [entry]);
  }

  const order: SitemapSection[] = ['static', 'listings', 'products', 'blog', 'pages'];
  const files: SitemapFileWithEntries[] = [];

  for (const section of order) {
    const entries = bySection.get(section) ?? [];
    // An empty section is omitted rather than published as an empty <urlset>, which Search Console
    // flags as an error.
    if (entries.length === 0) continue;

    if (section === 'products') {
      for (const group of groupProductEntries(entries)) {
        files.push({
          file: group.file,
          section,
          chunk: group.chunk,
          count: group.entries.length,
          lastModified: newestLastMod(group.entries),
          entries: group.entries,
        });
      }
      continue;
    }

    // Non-product sections are small (static pages, listings, blog, CMS pages) and keep their
    // single well-known filename — those URLs are already known to Search Console. But they are
    // still chunked if they ever cross the limit: brand + subcategory listings grow with the
    // catalogue, and a section that silently exceeded 50,000 URLs would be rejected wholesale.
    const chunks = Math.max(1, Math.ceil(entries.length / PRODUCTS_PER_CHUNK));
    for (let i = 0; i < chunks; i++) {
      const slice = chunks === 1 ? entries : entries.slice(i * PRODUCTS_PER_CHUNK, (i + 1) * PRODUCTS_PER_CHUNK);
      files.push({
        file: chunks === 1 ? `${section}.xml` : `${section}-${i}.xml`,
        section,
        chunk: i,
        count: slice.length,
        lastModified: newestLastMod(slice),
        entries: slice,
      });
    }
  }

  // Belt-and-braces on the protocol caps. Google rejects an oversized file whole, so this must be
  // an assertion, not a comment — and it fails into the routes' 503 path rather than publishing a
  // document that will be thrown away without telling anyone.
  for (const file of files) {
    if (file.count > MAX_URLS_PER_SITEMAP) {
      throw new Error(`[sitemap] child "${file.file}" has ${file.count} URLs, over the ${MAX_URLS_PER_SITEMAP} protocol limit`);
    }
  }
  if (files.length > MAX_URLS_PER_SITEMAP) {
    throw new Error(`[sitemap] index lists ${files.length} children, over the ${MAX_URLS_PER_SITEMAP} protocol limit`);
  }

  return files;
}

/** Build the manifest of child sitemaps (no entry payloads) from the single cached crawl. */
export async function getSitemapManifest(): Promise<SitemapFile[]> {
  const files = await buildSitemapFiles();
  return files.map((f) => ({
    file: f.file,
    section: f.section,
    chunk: f.chunk,
    count: f.count,
    lastModified: f.lastModified,
  }));
}

/**
 * Resolve a requested /sitemaps/{file} back to its entries, or null when the name is unknown.
 * Names come only from the manifest, never from the request, so a crawler cannot mint an infinite
 * family of empty sitemap URLs by probing /sitemaps/anything.xml.
 */
export async function getEntriesForFile(file: string): Promise<SectionedSitemapEntry[] | null> {
  const files = await buildSitemapFiles();
  return files.find((f) => f.file === file)?.entries ?? null;
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
