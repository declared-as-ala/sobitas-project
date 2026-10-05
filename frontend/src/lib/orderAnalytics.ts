import type { NextRequest } from 'next/server';

/** layout.tsx's GA4 property (G-0J0J27JZ7D): its session cookie is `_ga_0J0J27JZ7D`. */
const PROPERTY_SESSION_COOKIE = '_ga_0J0J27JZ7D';

const CLIENT_ID_RE = /^\d{1,20}\.\d{1,20}$/;
const SESSION_ID_RE = /^\d{1,20}$/;

/** `_ga` = `GA1.1.<rand>.<ts>` (the second number is the cookie-domain depth) → `<rand>.<ts>`. */
function clientIdFrom(cookie: string | undefined): string | null {
  const match = /^GA\d+\.\d+\.(.+)$/.exec(String(cookie ?? '').trim());
  const id = match?.[1] ?? '';
  return CLIENT_ID_RE.test(id) ? id : null;
}

/** `_ga_<id>` = `GS1.1.<sid>.…` (legacy) or `GS2.1.s<sid>$o…$g…` (current) → `<sid>`. */
function sessionIdFrom(cookie: string | undefined): string | null {
  const value = String(cookie ?? '').trim();
  const sid = /^GS1\.\d+\.(\d+)(?:\.|$)/.exec(value)?.[1]
    ?? /^GS2\.\d+\.s(\d+)(?:\$|$)/.exec(value)?.[1]
    ?? '';
  return SESSION_ID_RE.test(sid) ? sid : null;
}

/**
 * Stamp an outgoing order payload with the shopper's GA4 identifiers, read from the request's
 * first-party cookies, so the backend can attribute the order in GA4.
 *
 * ── FALLBACK DETECTION ──────────────────────────────────────────────────────────────────────
 * Whether the browser can report the purchase is the browser's own answer: `gtag_loaded`, read by
 * isGtagLoaded() (lib/analytics/ga4.ts) when the order button was pressed. It is the only value
 * kept from the browser's `ga`, and only when it is a boolean. When it is false the backend sends
 * the purchase server-side (Measurement Protocol) under this `client_id` and says so in its
 * response (`ga4_server_purchase`), and the browser then sends nothing. The `_ga` cookie cannot
 * answer that question: it outlives an ad blocker installed after an earlier visit, and is absent
 * when gtag.js runs with cookies refused. Bodies from older bundles carry no flag, and the backend
 * falls back to `client_id: null` = "gtag.js never ran". The order is never refused over any of this.
 *
 * Like withAffiliateAttribution, the ids come from the REQUEST: the browser's `ga` key is replaced,
 * and `ga` is always set, `{ client_id, session_id }` (each a string or null) plus `gtag_loaded`
 * when the browser sent one. `browserGa` is the browser's `ga` when the payload was rebuilt
 * server-side (the quick-order proxy); it defaults to the payload's own `ga`.
 */
export function withAnalyticsContext<T extends object>(payload: T, request: NextRequest, browserGa?: unknown): T {
  const next = { ...(payload as unknown as Record<string, unknown>) };
  const fromBrowser = browserGa !== undefined ? browserGa : next.ga;
  const flag = fromBrowser && typeof fromBrowser === 'object'
    ? (fromBrowser as Record<string, unknown>).gtag_loaded
    : undefined;
  delete next.ga;

  let clientId: string | null = null;
  let sessionId: string | null = null;
  try {
    clientId = clientIdFrom(request.cookies.get('_ga')?.value);
    const sessionCookies = request.cookies.getAll().filter((cookie) => cookie.name.startsWith('_ga_'));
    // The property's own cookie first: a returning browser may still hold an older property's.
    const preferred = sessionCookies.find((cookie) => cookie.name === PROPERTY_SESSION_COOKIE) ?? sessionCookies[0];
    sessionId = sessionIdFrom(preferred?.value);
  } catch {
    /* unreadable cookies: the backend treats the order as untracked */
  }

  next.ga = {
    client_id: clientId,
    session_id: sessionId,
    ...(typeof flag === 'boolean' ? { gtag_loaded: flag } : {}),
  };
  return next as unknown as T;
}
