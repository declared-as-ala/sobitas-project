import { unstable_cache } from 'next/cache';

import { encodeSitemapCache, decodeSitemapCache } from '@/util/sitemapCachePayload';

import {
  SITEMAP_SOURCES,
  loadSharedContext,
  type SectionedSitemapEntry,
  type SitemapSection,
} from '@/util/sitemapSources';

export type { SectionedSitemapEntry, SitemapSection };

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn').replace(/\/$/, '');

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Percent-encode each path segment exactly once.
 *
 * decode-then-encode is deliberate: a slug that already arrived encoded must not come out
 * double-encoded (`%C3%A9` → `%25C3%25A9`), which would be a different URL from the one the page's
 * own rel=canonical emits.
 */
function encodeSitemapUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split('/')
      .map((segment) => {
        if (!segment) return segment;
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Run every source in SITEMAP_SOURCES and return one flat, deduplicated, section-tagged list.
 *
 * ── WHY THIS FUNCTION IS NOW SHORT ───────────────────────────────────────────────────────────
 * It used to be 470 lines: the whole product pagination protocol, plus six hand-rolled
 * `try { … } catch (e) { console.error(e) }` blocks, one per content type. Those catch blocks were
 * the defect. A failed brand fetch, a failed article fetch, a failed CMS-page fetch — each one
 * printed a line nobody reads and then published a sitemap with that content type missing, at 200,
 * which Google reads as "those URLs were removed". The products crawl alone was allowed to fail
 * loudly, and it was the only one that ever did.
 *
 * Now every source declares whether it is `critical`, and a critical source that throws — or that
 * cannot prove it fetched everything — takes the whole sitemap down to a 503 that caches nothing.
 * The routes retry in five minutes. That is strictly better than a short file believed for an hour.
 *
 * ── DEDUPLICATION IS GLOBAL AND FIRST-WINS ───────────────────────────────────────────────────
 * Slug namespaces overlap by design: /{slug} resolves category → brand → CMS page, so a CMS page
 * named after a category would otherwise be submitted twice under two sections and split its own
 * Search Console coverage. Source order decides the winner, which is why SITEMAP_SOURCES is ordered
 * and not a map.
 */
async function computeSitemapEntries(): Promise<SectionedSitemapEntry[]> {
  const startedAt = Date.now();
  const { ctx, note: sharedNote } = await loadSharedContext(BASE_URL);
  console.log(sharedNote);

  const seenUrls = new Set<string>();
  const entries: SectionedSitemapEntry[] = [];
  const ran = new Set<string>();
  let unverified = 0;

  for (const source of SITEMAP_SOURCES) {
    // Ordering is a real dependency (brands cannot know which brands have products until products
    // has run), so it is asserted rather than described. Reordering the array now fails fast instead
    // of quietly emitting an empty listings section.
    for (const dep of source.needs ?? []) {
      if (!ran.has(dep)) {
        throw new Error(
          `[sitemap] source "${source.id}" needs "${dep}", which has not run. ` +
          `Fix the order of SITEMAP_SOURCES in sitemapSources.ts.`
        );
      }
    }

    let result;
    try {
      result = await source.load(ctx);
    } catch (error) {
      if (source.critical) {
        // Rethrow: never let unstable_cache store a sitemap whose catalogue, taxonomy, brands, CMS
        // pages or blog failed to load. That would serve the degraded file for the full 1h TTL.
        console.error(`[sitemap] critical source "${source.id}" failed — refusing to publish:`, error);
        throw error;
      }
      console.warn(`[sitemap] non-critical source "${source.id}" failed; continuing without it:`, error);
      ran.add(source.id);
      continue;
    }

    if (!result.verified) unverified++;
    console.log(`${result.note}${result.verified ? '' : '  [UNVERIFIED]'}`);

    let collided = 0;
    let invalid = 0;
    for (const entry of result.entries) {
      const url = encodeSitemapUrl(entry.url);
      if (!isValidUrl(url)) {
        invalid++;
        continue;
      }
      if (seenUrls.has(url)) {
        collided++;
        continue;
      }
      seenUrls.add(url);
      entries.push({ ...entry, url, section: source.section });
    }

    /*
     * A collision is dedup working, and it is still worth a number.
     *
     * Some are expected and correct: /qui-sommes-nous is both a hand-written route and a CMS page
     * row, so the CMS copy loses and the static entry stands. Others are a content defect wearing a
     * sitemap's clothes — two published articles sharing one slug means one of them is permanently
     * unreachable, because getArticleDetails resolves a slug with ->first(). Measured 2026-08-10:
     * article ids 44 and 45 both claim
     * /blog/quand-prendre-de-la-creatine-le-guide-complet-pour-optimiser-vos-resultats, which is why
     * 224 published articles yield 223 URLs.
     *
     * The sitemap cannot fix that and must not paper over it, so it counts it out loud.
     */
    if (collided > 0 || invalid > 0) {
      const line =
        `[sitemap] ${source.id}: ${collided} URL(s) already claimed by an earlier source (dedup), ` +
        `${invalid} malformed.`;
      if (source.expectsCollisions && invalid === 0) {
        console.log(`${line} Expected — this source shares the /{slug} namespace by design.`);
      } else {
        console.warn(
          `${line} A collision between two rows of the SAME type means two records share one slug ` +
          `and one of them is unreachable.`
        );
      }
    }

    ran.add(source.id);
  }

  /*
   * "Unverifiable" is not "verified". Saying so is the whole point — an endpoint that stops
   * reporting a total silently removes the only cross-check this crawl has, and the difference
   * between "checked and complete" and "walked to a short page and hoped" must never be invisible
   * in the logs. It is a warning and not a throw because an endpoint with no paginator (blog
   * categories/tags) legitimately has no total to report.
   */
  if (unverified > 0) {
    console.warn(
      `[sitemap] ${unverified} source(s) could not verify completeness against a reported total — ` +
      `see the [UNVERIFIED] lines above.`
    );
  }

  console.log(
    `[sitemap] built ${entries.length} URL(s) from ${ran.size} source(s) in ${Date.now() - startedAt}ms`
  );

  return entries;
}

/**
 * One losslessly compressed snapshot, shared by the index and every child for one hour.
 * Keeping one entry preserves the global first-wins dedup and atomic refresh. Independent section
 * caches could expire separately; a custom cacheHandler would replace caching for the whole app
 * and require its own persistence, eviction and tag-invalidation implementation.
 *
 * gzip/base64 removes repeated URL prefixes, JSON keys and image paths without changing the data.
 * The versioned key avoids reading an old array as compressed text. The existing sitemap tag still
 * invalidates the entire snapshot; backend promotion bursts already coalesce that invalidation.
 *
 * This does not promise infinite capacity. encodeSitemapCache logs both sizes and headroom on every
 * regeneration and THROWS at 90% of Next's limit, before the cache write. Cold-cache failure reaches
 * the routes' 503/no-store/Retry-After path. On TTL background refresh Next can retain its previous
 * complete snapshot and logs the refresh failure. There is no untagged five-minute memory fallback.
 * Disk/cache I/O failures remain Next's responsibility and are logged by its incremental cache.
 */
const cachedSitemapEntries = unstable_cache(
  async () => encodeSitemapCache(await computeSitemapEntries()),
  ['sitemap-entries-gzip-v1'],
  { revalidate: 3600, tags: ['sitemap'] }
);

let inFlight: Promise<SectionedSitemapEntry[]> | null = null;

export async function getSitemapEntries(): Promise<SectionedSitemapEntry[]> {
  // Share concurrent cold requests only. Completed data always comes from the tagged data cache,
  // so revalidateTag('sitemap') is visible to the next request, regardless of payload size.
  if (inFlight !== null) return inFlight;

  inFlight = (async () => {
    try {
      return await decodeSitemapCache(await cachedSitemapEntries());
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
