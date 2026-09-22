/**
 * Which /blog/{slug} URLs are real articles — cached, and FAIL-OPEN.
 *
 * ── WHY MIDDLEWARE HAS TO ANSWER THIS ─────────────────────────────────────────────────────────
 * app/(shop)/blog/[slug]/page.tsx already does everything right. It throws a status-carrying
 * ApiError, distinguishes a genuine 404 from a transient failure, and calls notFound(). The server
 * log proves the path is taken:
 *
 *     Error fetching article: Error [ApiError]: Article not found  { status: 404 }
 *
 * and the response is still **HTTP 200**, with `Cache-Control: s-maxage=600,
 * stale-while-revalidate=31535400` — a soft 404 cached for a year, over an unbounded slug space.
 * Measured identically on production and on a local production build, before and after adding the
 * missing app/(shop)/not-found.tsx boundary.
 *
 * Route-level status control is not reliable in this app: the same investigation found
 * `permanentRedirect()` from a page body degrading to `<meta http-equiv="refresh">` at 200 on two
 * other routes. Middleware runs before rendering and its status codes have never lied, which is
 * why /shop/:slug, /brand/:slug and /product/:slug are all resolved there already. This is the
 * same pattern for the one namespace that still lacked it.
 *
 * ── FAIL-OPEN, AND WHY THE MISS PATH REFRESHES ────────────────────────────────────────────────
 * The cost of a wrong 410 is far higher than the cost of a wrong 200: it de-indexes a live
 * article. So:
 *   • any failure to fetch  → null → the caller falls through to the page. Never a guess.
 *   • a slug that is absent from a WARM cache → one forced refresh before we believe it, because
 *     the alternative is that every article published in the last TTL answers 410. With the
 *     refresh, a new article is wrong for one request rather than for five minutes.
 *   • an empty result set is treated as a backend problem, not as "the blog was deleted".
 *
 * Mirrors util/taxonomySlugs.ts deliberately — same TTL, same stale-while-revalidate shape, same
 * three-valued contract. Two caches that behave differently are two things to reason about.
 */

const API_BASE =
  process.env.API_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace('/api-proxy', '') ||
  'https://admin.protein.tn/api';

const TTL_MS = 5 * 60 * 1000;
/** /all_articles reported meta.total = 224 over 3 pages on 10/08/2026. 10 pages is ample headroom. */
const MAX_PAGES = 10;
const PER_PAGE = 100;

let cache: Set<string> | null = null;
/**
 * fold(slug) → the REAL slug, for the legacy shapes that only differ by punctuation.
 *
 * The WordPress-era site published article URLs with hyphens where the CMS slug has spaces, and
 * sometimes without the accents: `/blogs/ما-هو-أفضل-كرياتين-في-تونس؟`, `/blogs/Le-magnésium-:-la-
 * condition-cachée…`. redirects.js rewrites only the `/blogs` prefix, so those arrive at
 * `/blog/{hyphenated}` and the exact Set below cannot see that the article is alive — which turned
 * a legacy link into a 301 INTO a 410 for 12 live, sitemap-listed articles (measured 22/09/2026).
 * The fold is only a spelling normalisation: it never invents a successor, and a key that two
 * different live articles fold to is dropped rather than guessed at.
 */
let folded: Map<string, string> | null = null;
let cacheAt = 0;
/**
 * Did the crawl behind `cache` reach the END of the article list?
 *
 * An incomplete set can prove a slug EXISTS (it is in there) but can never prove one does not.
 * Without this flag a deadline-truncated crawl would answer `false` for every article on the
 * pages it never fetched — 410ing live, ranking URLs. Absence is only ever asserted from a
 * complete crawl.
 */
let cacheComplete = false;
let inflight: Promise<void> | null = null;
/** Guards the miss-path refresh so a crawler hammering invented slugs cannot re-crawl the blog per request. */
let lastMissRefresh = 0;
const MISS_REFRESH_COOLDOWN_MS = 30 * 1000;

function rowsOf(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body;
  const b = body as { data?: unknown; articles?: unknown };
  if (Array.isArray(b?.data)) return b.data;
  if (Array.isArray(b?.articles)) return b.articles;
  return null;
}

/**
 * Whole-crawl deadline, not just a per-request timeout.
 *
 * The very first /blog/{slug} after a boot BLOCKS on this crawl (there is no cache to serve
 * stale). MAX_PAGES × the per-request timeout is the worst case, and 10 × 2s = 20s is not a page
 * load — it is an abandoned session. Past the deadline we stop and keep whatever we have; a
 * partial set is safe because a slug that is missing from it resolves to `null`, not to `false`.
 */
const CRAWL_DEADLINE_MS = 4000;

/**
 * Strip everything a legacy URL could plausibly have changed: accents, case, and the run of
 * punctuation/whitespace that the old site turned into a hyphen. Letters and digits of ANY script
 * survive (`\p{L}`/`\p{N}`, not `[a-z0-9]`), because most of these articles are Arabic and an
 * ASCII-only fold would collapse every one of them to the empty string.
 */
function fold(slug: string): string {
  return slug
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

async function refresh(): Promise<void> {
  try {
    const next = new Set<string>();
    const nextFolded = new Map<string, string>();
    /** Folded keys claimed by two different articles: ambiguous, so never redirected. */
    const collisions = new Set<string>();
    const deadline = Date.now() + CRAWL_DEADLINE_MS;
    let complete = false;

    for (let page = 1; page <= MAX_PAGES; page++) {
      if (Date.now() > deadline) break;
      const res = await fetch(`${API_BASE}/all_articles?per_page=${PER_PAGE}&page=${page}`, {
        headers: { Accept: 'application/json' },
        // Short: this runs inside middleware, on the request path. A slow backend must not become
        // a slow site — the timeout lands us on `null`, which falls through to the page.
        signal: AbortSignal.timeout(2000),
        next: { revalidate: 300 },
      });
      if (!res.ok) return;

      const body: unknown = await res.json();
      const rows = rowsOf(body);
      if (!rows) return;

      for (const row of rows as Array<{ slug?: string }>) {
        if (!row?.slug) continue;
        const slug = String(row.slug);
        next.add(slug);

        const key = fold(slug);
        if (!key) continue;
        const claimed = nextFolded.get(key);
        if (claimed !== undefined && claimed !== slug) collisions.add(key);
        else nextFolded.set(key, slug);
      }

      const meta = (body as { meta?: { last_page?: number } })?.meta;
      const lastPage = Number(meta?.last_page);
      if (rows.length < PER_PAGE) { complete = true; break; }
      if (Number.isFinite(lastPage) && page >= lastPage) { complete = true; break; }
    }

    // A response that parsed but produced nothing is a backend problem, not an empty blog. Keeping
    // the previous cache is the fail-open behaviour; adopting the empty one would tell middleware
    // that every article on the site had ceased to exist — and 410 all 223 of them.
    if (next.size === 0) return;

    for (const key of collisions) nextFolded.delete(key);

    cache = next;
    folded = nextFolded;
    cacheAt = Date.now();
    cacheComplete = complete;
  } catch {
    // Swallowed on purpose. See the fail-open note in the docblock.
  }
}

async function articles(): Promise<Set<string> | null> {
  if (cache !== null && Date.now() - cacheAt < TTL_MS) return cache;

  // Stale-while-revalidate once warm; block only on the very first call after boot.
  if (cache !== null) {
    if (!inflight) inflight = refresh().finally(() => { inflight = null; });
    return cache;
  }

  if (!inflight) inflight = refresh().finally(() => { inflight = null; });
  await inflight;
  return cache;
}

/**
 * Is `slug` a real published article served at `/blog/{slug}`?
 *
 * `null` means "could not find out" — the caller MUST fall through to the page rather than act on
 * it. Only `false` is a positive statement that no such article exists.
 */
export async function isArticleSlug(slug: string): Promise<boolean | null> {
  const resolved = await resolveArticleSlug(slug);
  if (resolved === null) return null;
  return resolved !== false;
}

/**
 * The REAL article slug behind `slug`, so a legacy spelling can be redirected instead of retired.
 *
 * Returns the slug itself on an exact hit, the live slug on a punctuation-only fold hit, `false`
 * only when a COMPLETE crawl says no such article exists, and `null` for "could not find out".
 * `isArticleSlug` is a thin wrapper over this; the three-valued contract is unchanged, and the
 * fold is consulted only after the exact match has already failed.
 */
export async function resolveArticleSlug(slug: string): Promise<string | false | null> {
  const clean = (slug || '').trim();
  if (!clean) return null;

  const set = await articles();
  if (!set) return null;
  if (set.has(clean)) return clean;

  const byFold = folded?.get(fold(clean));
  if (byFold) return byFold;

  // Absent from a warm cache. Before believing that — and 410ing a URL — spend one refresh, so an
  // article published since the last one is not retired by its own freshness. Rate-limited,
  // because the input here is attacker-controlled: a crawler walking invented slugs must not be
  // able to trigger a blog crawl per request.
  const now = Date.now();
  if (now - lastMissRefresh > MISS_REFRESH_COOLDOWN_MS) {
    lastMissRefresh = now;
    await refresh();
    if (!cache) return null;
    if (cache.has(clean)) return clean;
    const retry = folded?.get(fold(clean));
    if (retry) return retry;
  }

  // Only a COMPLETE crawl may assert absence. Anything else is "could not find out", which the
  // caller must not act on.
  return cacheComplete ? false : null;
}
