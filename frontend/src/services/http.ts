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

const MAX_429_RETRIES = 2;
const RETRY_DELAYS_MS = [400, 900];

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
    const delay = jitter(RETRY_DELAYS_MS[attempt] ?? 900);
    await new Promise((r) => setTimeout(r, delay));
    return doFetch<T>(url, options, attempt + 1);
  }

  if (!res.ok) {
    // Read the body stream only once, then try to parse JSON from it.
    let text = '';
    try {
      text = await res.text();
    } catch {
      // ignore stream errors; we'll fall back to generic message
    }
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : text;
    } catch {
      // not JSON, keep raw text
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
    if (error instanceof ApiError && typeof console !== 'undefined') {
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
    });
  }
  return promise;
}
