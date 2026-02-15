/**
 * Fetch wrapper with 429 retry, AbortController, and in-flight deduplication.
 * Use for GET calls to the backend API to avoid 429 and duplicate requests.
 */

const API_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api')
    : '';

const MAX_429_RETRIES = 2;
const RETRY_DELAYS_MS = [400, 900];

function jitter(ms: number): number {
  return Math.floor(ms * (0.8 + Math.random() * 0.4));
}

/** In-flight GET requests by URL to avoid duplicate parallel calls */
const inFlight = new Map<string, Promise<unknown>>();

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
    if (existing) return existing as Promise<T>;
  }

  const promise = doFetch<T>(url, options, 0);
  if (useDedupe) {
    inFlight.set(url, promise);
    promise.finally(() => inFlight.delete(url));
  }
  return promise;
}
