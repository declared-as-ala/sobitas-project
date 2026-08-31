/**
 * Admin-defined redirect rules (301 / 302 / 410) sourced from the Laravel backend's
 * `/redirections` endpoint (managed in Filament → "Redirections"). This lets the store owner
 * retire dead URLs — the "Not found (404)" bucket in Search Console — without a code deploy.
 *
 * Design notes:
 * - The frontend runs as a long-lived Node server (not per-request serverless isolates), so a
 *   module-level cache with a TTL persists across requests: we hit the backend at most once per
 *   TTL per worker. First request after boot blocks (≤1.5s) to warm the cache; after that it's a
 *   stale-while-revalidate Map lookup with a background refresh — zero added latency on the hot path.
 * - Everything FAILS OPEN. Any network/parse error yields an empty map, so a backend hiccup can
 *   never take the storefront's middleware down. A misconfigured rule for `/` is ignored so the
 *   homepage can never be hijacked.
 */

export type RedirectRule = { to: string | null; code: number };

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const EMPTY: Map<string, RedirectRule> = new Map();

let cache: Map<string, RedirectRule> | null = null;
let cacheAt = 0;
let inflight: Promise<void> | null = null;

function apiBase(): string {
  return (
    process.env.API_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace('/api-proxy', '') ||
    'https://admin.protein.tn/api'
  );
}

/**
 * Normalise a path for exact matching: path only (drop host/query), decoded, lowercased, and with
 * any trailing slash stripped (root stays "/"). Applied identically to the stored `old_url` and the
 * incoming request path so `/Whey-Gold/` and `/whey-gold` match the same rule.
 */
export function normalizeRedirectKey(input: string): string {
  let s = (input || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    try { s = new URL(s).pathname; } catch { /* keep raw */ }
  }
  // Drop any query/hash the admin may have pasted into old_url.
  s = s.split('?')[0].split('#')[0];
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  s = s.toLowerCase();
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/+$/, '');
  return s === '' ? '/' : s;
}

/**
 * The DESTINATION half, which was trimmed and otherwise trusted.
 *
 * `old_url` has been normalised since this file was written; `new_url` was passed through as typed.
 * Live rule id=11 on 15/08/2026 was `/pendant-l-entrainement -> /Intra-Workout`, hand-typed with the
 * stored capitalisation of the subcategory. Both capitals cost real time, because a miscapitalised
 * path is not a 404 here — MySQL's collation is case-insensitive, so `(shop)/[slug]` resolves the
 * category, renders it, and only then notices in the page body that the canonical slug disagrees and
 * issues its own redirect. Measured on production, that second hop took between 6 and 17 seconds and
 * did not answer at all when cold.
 *
 * So an admin typo turned one redirect into two, the second of them slower than any crawler waits.
 * Middleware now folds case before anything else runs, which catches this at request time — but the
 * rule should not emit the bad URL in the first place: a redirect that immediately redirects again is
 * a chain, and chains are what the coverage report counts.
 *
 * Only the PATH is lowered. Query and fragment are left exactly as typed, because a `?ref=CoachAli`
 * or a tracking value is case-significant and none of this is about them.
 */
export function normalizeRedirectDestination(input: string): string {
  const raw = input.trim();
  if (!raw) return raw;

  // Absolute URLs are admin-configurable on purpose (→ admin.protein.tn). Leave the host alone —
  // `sameOriginOrTrusted` in middleware is what decides whether it is allowed.
  if (/^https?:\/\//i.test(raw)) return raw;

  const cut = raw.search(/[?#]/);
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const rest = cut === -1 ? '' : raw.slice(cut);

  // Percent-escapes are stepped over: `%D9%85` is a live Arabic blog slug and lowering its hex
  // digits rewrites a URL that was already correct.
  return path.replace(/%[0-9A-Fa-f]{2}|[A-Z]+/g, (m) => (m.startsWith('%') ? m : m.toLowerCase())) + rest;
}

async function fetchRules(): Promise<Map<string, RedirectRule>> {
  const map = new Map<string, RedirectRule>();
  try {
    const res = await fetch(`${apiBase()}/redirections`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(1500),
      /**
       * `next: { revalidate }` rather than `cache: 'no-store'`.
       *
       * Next treats a no-store fetch as a dynamic signal and opts the ENTIRE calling route out of
       * static generation. This module is reached from resolveCanonicalUrl(), which every
       * indexable page calls to emit its canonical — so a no-store here made every category,
       * product and brand page dynamic. Measured after the http.ts cache fix: `/` cached
       * (x-nextjs-cache: HIT) while /creatine and every product still returned
       * `Cache-Control: private, no-cache, no-store`, because they were still going through here.
       *
       * Caching is safe: these are admin-managed redirect rules that change a few times a year,
       * this module already keeps its own in-process cache with a TTL, and middleware — where a
       * stale rule would actually matter — reads the same data through that in-process path
       * rather than relying on the Data Cache.
       */
      next: { revalidate: 300, tags: ['admin-redirects'] },
    });
    if (!res.ok) return map;
    const rows = await res.json();
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
      const key = normalizeRedirectKey(String(row?.old_url ?? ''));
      // Never let a stray rule hijack the homepage.
      if (!key || key === '/') continue;
      const code = Number(row?.code) || 301;
      const to = row?.new_url ? normalizeRedirectDestination(String(row.new_url)) : null;
      // 301/302 need a destination; 410 (Gone) does not.
      if (code !== 410 && !to) continue;
      // Guard against self-redirect loops (old_url === new_url).
      if (to && normalizeRedirectKey(to) === key) continue;
      map.set(key, { to, code });
    }
  } catch {
    // fail open — return whatever we accumulated (possibly empty)
  }
  return map;
}

function refresh(): Promise<void> {
  if (!inflight) {
    inflight = (async () => {
      const m = await fetchRules();
      cache = m;
      cacheAt = Date.now();
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/**
 * Return the admin redirect rule for a request path, or null. Cached in-process; fails open.
 */
export async function getAdminRedirect(pathname: string): Promise<RedirectRule | null> {
  const now = Date.now();
  if (!cache) {
    // Cold cache: block until warm (bounded by the 1.5s fetch timeout).
    await refresh();
  } else if (now - cacheAt > TTL_MS) {
    // Warm but stale: serve immediately, refresh in the background.
    void refresh();
  }
  const rule = (cache ?? EMPTY).get(normalizeRedirectKey(pathname));
  return rule ?? null;
}
