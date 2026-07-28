/**
 * Fetch wrapper with 429 retry, AbortController, and in-flight deduplication.
 * Use for GET calls to the backend API to avoid 429 and duplicate requests.
 */

function getApiBase(): string {
  if (typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/i.test(window.location.hostname)) {
    return `${window.location.origin}/api-proxy`;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';
}
const API_BASE = getApiBase();

// The Laravel API rate-limits per IP and the ENTIRE SSR fleet shares ONE VPS IP, so under
// crawl load the bucket empties and stays empty for the rest of the 60-second FIXED window.
// Retrying after 400/900ms therefore almost never landed in a refilled window: the call
// failed, the route degraded to a generic-title / no-canonical shell, and Googlebot indexed
// that shell. Back off long enough to actually cross a window edge.
const MAX_429_RETRIES = 3;
const RETRY_DELAYS_MS = [800, 2500, 6000];

/** Transient upstream failures worth another try on an idempotent GET. */
const RETRYABLE_5XX = new Set([502, 503, 504]);
const MAX_5XX_RETRIES = 2;
const RETRY_5XX_DELAYS_MS = [500, 1500];

/**
 * Never sleep longer than this on a server-sent Retry-After. Laravel may send up to 60s;
 * Node's global fetch has NO timeout, so an unbounded sleep here would pin an SSR render
 * open for a full minute and risk tripping the reverse proxy's read timeout.
 */
const MAX_RETRY_AFTER_MS = 8_000;

/**
 * Laravel's ThrottleRequests always sets `Retry-After: <seconds>` on a 429. It is the only
 * value that actually knows when the window resets — obeying it beats every guess we make.
 */
function retryAfterMs(res: Response): number | null {
  const raw = res.headers.get('retry-after');
  if (!raw) return null;
  const secs = Number(raw.trim());
  if (!Number.isFinite(secs) || secs <= 0) return null;
  return Math.min(secs * 1000, MAX_RETRY_AFTER_MS);
}

function jitter(ms: number): number {
  return Math.floor(ms * (0.8 + Math.random() * 0.4));
}

const IN_FLIGHT_TTL_MS = 30_000;

/** In-flight GET requests by URL; TTL ensures hung requests don't leak entries. */
const inFlight = new Map<string, { promise: Promise<unknown>; ttlId: ReturnType<typeof setTimeout> }>();

export type ApiFetchOptions = {
  signal?: AbortSignal;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip dedupe (e.g. for POST) */
  skipDedupe?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function doFetch<T>(
  url: string,
  options: ApiFetchOptions,
  attempt: number
): Promise<T> {
  const { signal, method = 'GET', body, headers = {} } = options;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
    cache: 'no-store',
  });

  if (res.status === 429 && attempt < MAX_429_RETRIES) {
    const delay = retryAfterMs(res) ?? jitter(RETRY_DELAYS_MS[attempt] ?? 6000);
    await new Promise((r) => setTimeout(r, delay));
    return doFetch<T>(url, options, attempt + 1);
  }

  // A GET is idempotent, so 502/503/504 is safe to retry. Without this, one blip from the
  // reverse proxy surfaced in a page's catch block and degraded the render into a 200 shell.
  // NOTE: `attempt` is shared with the 429 path on purpose — a request that already burned
  // retries on 429 does not get a fresh 5xx budget, which bounds total latency.
  if (method === 'GET' && RETRYABLE_5XX.has(res.status) && attempt < MAX_5XX_RETRIES) {
    const delay = retryAfterMs(res) ?? jitter(RETRY_5XX_DELAYS_MS[attempt] ?? 1500);
    await new Promise((r) => setTimeout(r, delay));
    return doFetch<T>(url, options, attempt + 1);
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(
      (body as any)?.message ?? `HTTP ${res.status}`,
      res.status,
      body
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Fetch JSON from the backend API.
 * - Retries only on 429 (max 2 retries, exponential backoff + jitter).
 * - Never retries 404.
 * - Deduplicates in-flight GET requests by URL.
 * - Uses cache: 'no-store'.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const { method = 'GET', skipDedupe } = options;

  const useDedupe = method === 'GET' && !skipDedupe;
  if (useDedupe) {
    const existing = inFlight.get(url);
    if (existing) return existing.promise as Promise<T>;
  }

  // Wrap the raw fetch promise with a catch so rejections always have a handler.
  // This prevents Node.js from treating ApiError rejections as "unhandledRejection"
  // in cases where callers forget to await or attach their own .catch.
  const rawPromise = doFetch<T>(url, options, 0);
  const promise = rawPromise.catch((error) => {
    // Log unexpected errors only — 404s are expected (e.g. subcategory probing).
    if (error instanceof ApiError && error.status !== 404 && typeof console !== 'undefined') {
      console.error('[apiFetch] Unhandled ApiError', {
        url,
        status: error.status,
        message: error.message,
      });
    }
    throw error;
  });
  if (useDedupe) {
    const ttlId = setTimeout(() => {
      inFlight.delete(url);
    }, IN_FLIGHT_TTL_MS);
    inFlight.set(url, { promise, ttlId });
    promise.finally(() => {
      const entry = inFlight.get(url);
      if (entry) {
        clearTimeout(entry.ttlId);
        inFlight.delete(url);
      }
    }).catch(() => {}); // suppress unhandled rejection propagated through finally chain
  }
  return promise;
}
