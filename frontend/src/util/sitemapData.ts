import { unstable_cache } from 'next/cache';

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
 * Cached sitemap entries — the single most important line in this file at catalogue scale.
 *
 * The /sitemap.xml route is `force-dynamic` (the API is unreachable from CI at build time, and a
 * prerendered sitemap is how you bake an empty one), which makes its `revalidate` a no-op. So
 * without this, EVERY crawler poll of /sitemap.xml or of any child re-ran the whole crawl: ~200
 * paginated /all_products requests at 20,000 products, plus categories + brands + pages + articles.
 * unstable_cache memoises the computed payload for 1h and ALL of it is shared — index + N children
 * = one upstream pass, not N+1.
 *
 * Deliberately ONE cache entry rather than one per section: separate entries can expire at different
 * moments, and an index that disagrees with the children it points at is worse than a slightly stale
 * one that agrees with itself.
 *
 * Busted on demand with revalidateTag('sitemap'), which must not happen once per product or every
 * bust opens another window for a crawler poll to pay for a full catalogue crawl that the next bust
 * discards. That is enforced on the producing side: App\Services\Seo\SeoNotifier::bustSitemapCache()
 * coalesces to at most one bust per process per minute, so a promotion wave — one artisan process —
 * refreshes this entry once, after the products it created are committed, not once per product.
 */
const cachedSitemapEntries = unstable_cache(computeSitemapEntries, ['sitemap-entries'], {
  revalidate: 3600,
  tags: ['sitemap'],
});

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
 * Five minutes, not the full hour, and that is a deliberate trade. It is long enough to collapse the
 * burst this is actually defending against — Googlebot fetching /sitemap.xml and then each of its
 * children in quick succession, which with no cache at all is N+1 independent full crawls against a
 * 600 GET/min-per-IP budget, i.e. a rate-limit that turns every sitemap URL into a 503 rather than
 * merely a slow 200. It is short enough that it neither pins tens of MB in the SSR container's heap
 * for an hour nor leaves revalidateTag('sitemap') ignored for one.
 */
const SHARED_CRAWL_WINDOW_MS = 5 * 60 * 1000;

let sharedCrawl: { at: number; entries: SectionedSitemapEntry[] } | null = null;
let inFlight: Promise<SectionedSitemapEntry[]> | null = null;
let dataCacheRefusesPayload = false;

/** Exactly what Next measures before deciding whether to store an unstable_cache result. */
function dataCacheItemBytes(entries: SectionedSitemapEntry[]): number {
  // Next stores { kind:'FETCH', data:{ headers, body, status, url }, revalidate } where `body` is
  // JSON.stringify(result), then measures JSON.stringify() of the whole ENVELOPE — so the body is
  // JSON nested inside JSON and every quote inside it costs a second character. Measured over the
  // exact entry shape the sources push, that escaping adds ~9% (278 → 302 bytes per entry), which is
  // the difference between alarming at ~7,000 URLs and alarming at ~7,500. The +128 is the constant
  // envelope; over-estimating slightly is the safe direction, because the fallback engaging early
  // costs nothing.
  return JSON.stringify(JSON.stringify(entries)).length + 128;
}

/**
 * The single entry point. Everything above is what it caches; this is what makes the cache hold.
 *
 * ── WHY unstable_cache ALONE IS NOT ENOUGH ONCE THE CATALOGUE GROWS ──────────────────────────
 * At ~302 bytes per entry as Next measures it, 5,000 entries = 1.51MB (stored) and 8,000 = 2.41MB
 * (refused). The 2MB ceiling falls somewhere around 7,000 URLs — invisible at today's ~700, and
 * crossed partway through the iHerb import. Past that point unstable_cache still RUNS
 * computeSitemapEntries on every call and then silently stores nothing, so "index + N children = one
 * upstream pass" quietly becomes N+1 full crawls, `revalidateTag('sitemap')` becomes a dead letter,
 * and the 1h TTL becomes a comment. None of that is visible in a status code.
 *
 * So: keep the data cache (it is still right while the payload fits — cross-process, survives a
 * restart, honours the tag instantly), measure what it was asked to store, and when that is over the
 * ceiling fall back to a process-local snapshot for a short window. The fallback is not a
 * replacement for the data cache; it is the floor that keeps one crawler burst from becoming N+1
 * crawls. The permanent fix for a 20,000-product catalogue is a `cacheHandler` in next.config.js,
 * which the warning below names.
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
  // burst after a deploy is N simultaneous full crawls.
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
