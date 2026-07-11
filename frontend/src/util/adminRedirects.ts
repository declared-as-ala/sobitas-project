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

async function fetchRules(): Promise<Map<string, RedirectRule>> {
  const map = new Map<string, RedirectRule>();
  try {
    const res = await fetch(`${apiBase()}/redirections`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
    if (!res.ok) return map;
    const rows = await res.json();
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
      const key = normalizeRedirectKey(String(row?.old_url ?? ''));
      // Never let a stray rule hijack the homepage.
      if (!key || key === '/') continue;
      const code = Number(row?.code) || 301;
      const to = row?.new_url ? String(row.new_url).trim() : null;
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
