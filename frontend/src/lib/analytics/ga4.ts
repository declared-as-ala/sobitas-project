/**
 * The one way the storefront sends a GA4 event.
 *
 * Deliberately tiny and import-free: product cards, the cart context and the product page import it
 * statically, so anything heavy here would ride along in every one of those bundles. The item
 * builders that need the product-name humaniser live in `./ga4Items` and are loaded on demand.
 *
 * ── gtag OR dataLayer ───────────────────────────────────────────────────────────────────────
 * layout.tsx defines a `window.gtag` stub at once and loads gtag.js on first interaction or idle.
 * When the stub is there it is called. When it is not (a page script ran before the inline snippet,
 * or it was stripped), the call is queued on `dataLayer` the way Google's own snippet does it: as a
 * real `arguments` object, because gtag.js only drains Arguments, never plain arrays.
 *
 * Every amount is TND rounded to 3 decimals, the millime precision the orders are stored at.
 * Never pass an e-mail, a phone, a name or a user id: GA4 forbids PII and none of it is needed.
 */

export type Ga4Item = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

type GaWindow = { gtag?: unknown; dataLayer?: unknown[]; google_tag_manager?: unknown };

/** layout.tsx's GA4 property. */
const GA4_MEASUREMENT_ID = 'G-0J0J27JZ7D';

/**
 * Has gtag.js itself booted in this page? Read when the order button is pressed and sent with the
 * order as `ga.gtag_loaded`, so the backend knows whether the browser can report the purchase.
 *
 * Not `typeof gtag === 'function'` (layout.tsx's stub defines it before gtag.js loads) and not the
 * `_ga` cookie (it outlives an ad blocker installed after an earlier visit, and is absent when
 * gtag.js runs with cookies refused). gtag.js registers its tag on `window.google_tag_manager`;
 * a blocker's stand-in script does not.
 */
export function isGtagLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const gtm = (window as unknown as GaWindow).google_tag_manager;
    if (!gtm || typeof gtm !== 'object') return false;
    const tags = gtm as Record<string, unknown>;
    return Boolean(tags[GA4_MEASUREMENT_ID]) || Object.keys(tags).some((key) => /^GT?-[A-Z0-9]+$/.test(key));
  } catch {
    return false;
  }
}

const MONEY_KEYS = new Set(['value', 'price', 'shipping', 'tax']);

function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

function roundMoney(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(params)) {
    if (MONEY_KEYS.has(key) && typeof raw === 'number') {
      out[key] = Number.isFinite(raw) ? round3(raw) : 0;
    } else if (key === 'items' && Array.isArray(raw)) {
      out[key] = raw.map((item) => (item && typeof item === 'object'
        ? roundMoney(item as Record<string, unknown>)
        : item));
    } else {
      out[key] = raw;
    }
  }
  return out;
}

// Rest params give TypeScript the call signature; the body pushes the real `arguments` object,
// the exact shape Google's gtag() snippet enqueues and gtag.js drains.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pushToDataLayer(..._args: unknown[]): void {
  const w = window as unknown as GaWindow;
  w.dataLayer = w.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
}

function send(name: string, params: Record<string, unknown>): void {
  try {
    const payload = roundMoney(params);
    const w = window as unknown as GaWindow;
    if (typeof w.gtag === 'function') {
      (w.gtag as (...args: unknown[]) => void)('event', name, payload);
    } else {
      pushToDataLayer('event', name, payload);
    }
  } catch {
    // Analytics never breaks a page.
  }
}

/**
 * Send one GA4 event. No-op on the server. `defer: true` moves the send off the current task, so a
 * tap's handler (add to cart, open the drawer) paints before analytics runs — the INP budget.
 */
export function gaEvent(name: string, params: Record<string, unknown> = {}, opts: { defer?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  try {
    if (opts.defer) {
      setTimeout(() => send(name, params), 0);
    } else {
      send(name, params);
    }
  } catch {
    // no-op
  }
}

const sentPurchases = new Set<string>();

/**
 * Send the GA4 `purchase` for one order, at most once per browser.
 *
 * Refused ids: empty, `0`, and anything starting with `#`. `/api/quick-order` answers its honeypot
 * with `orderId 0` and fakes a `#id` numero when the backend sent none, and neither is an order.
 *
 * Two guards, because two things repeat: the in-memory Set covers a double submit or a StrictMode
 * double effect in this tab; `localStorage` (`ga4_purchase_${id}`, the key the confirmation page
 * already wrote) covers a reload or a second tab. Storage can throw (Safari private mode), and then
 * a possible duplicate is accepted over a lost sale — GA4 also de-duplicates on transaction_id.
 *
 * `serverReported`: the order response said `ga4_server_purchase: true` — the backend queued this
 * purchase through the Measurement Protocol (gtag.js had not booted when the order was placed), so
 * the browser records the id as sent and sends nothing: a late gtag.js would otherwise add a second.
 *
 * Sent immediately, not deferred: the order exists, and the step that follows may navigate.
 * Returns true when the event was sent.
 */
export function trackPurchaseOnce(input: {
  transactionId: string;
  value: number;
  shipping?: number;
  coupon?: string;
  items: Ga4Item[];
  serverReported?: boolean;
}): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const id = String(input.transactionId ?? '').trim();
    if (!id || id === '0' || id.startsWith('#') || id === 'undefined' || id === 'null' || id === 'NaN') return false;
    if (sentPurchases.has(id)) return false;

    const storageKey = `ga4_purchase_${id}`;
    try {
      if (window.localStorage.getItem(storageKey)) {
        sentPurchases.add(id);
        return false;
      }
    } catch {
      /* storage unavailable — the in-memory guard still holds for this tab */
    }
    sentPurchases.add(id);
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      /* private mode — accept a possible duplicate over a lost sale */
    }
    if (input.serverReported === true) return false;

    const coupon = typeof input.coupon === 'string' ? input.coupon.trim() : '';
    const shipping = typeof input.shipping === 'number' && Number.isFinite(input.shipping) ? input.shipping : undefined;
    send('purchase', {
      transaction_id: id,
      value: Number.isFinite(input.value) ? Math.max(0, input.value) : 0,
      currency: 'TND',
      tax: 0,
      ...(shipping !== undefined ? { shipping } : {}),
      ...(coupon ? { coupon } : {}),
      items: Array.isArray(input.items) ? input.items : [],
    });
    return true;
  } catch {
    return false;
  }
}
