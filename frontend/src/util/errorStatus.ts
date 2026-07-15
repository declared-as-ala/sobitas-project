import { ApiError } from '@/services/http';

/**
 * Extract the HTTP status from a data-layer error (axios or ApiError), else null.
 *
 * Used by detail routes to distinguish a GENUINE backend 404 (→ notFound(), a correct,
 * cacheable 404 page) from a TRANSIENT failure (timeout / 429 / 5xx / network). Transient
 * failures must be RETHROWN, not turned into notFound(): on an ISR route a notFound() render
 * is cached for the whole revalidate window, so one hiccup would serve a wrong "page
 * introuvable" for a healthy product/article until the cache expires. A rethrow renders the
 * error boundary instead and is never cached.
 */
export function getErrorStatus(e: unknown): number | null {
  if (e instanceof ApiError) return e.status;
  if (typeof e === 'object' && e !== null) {
    const maybe = e as { response?: { status?: unknown }; status?: unknown };
    if (typeof maybe.response?.status === 'number') return maybe.response.status;
    if (typeof maybe.status === 'number') return maybe.status;
  }
  return null;
}
