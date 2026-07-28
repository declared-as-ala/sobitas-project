import { unstable_noStore as noStore } from 'next/cache';

/**
 * Load a page's PRIMARY content for a cacheable (ISR) route WITHOUT ever baking an
 * empty/failed render into Next.js' Full Route Cache.
 *
 * The bug this prevents — the "Aucun … disponible" affichage bug:
 * A server component that does `try { await fetch } catch { return [] }` on an ISR page
 * (`export const revalidate = N`). If the fetch throws — backend momentarily unreachable,
 * a 5xx, or (the common one) a 429 because `next build` prerenders every page at once and
 * bursts the API — the empty fallback renders "successfully", so Next caches an EMPTY page
 * for the whole revalidate window. Users then see "no products / no packs" even though the
 * API is perfectly healthy, until the cache expires or someone manually revalidates.
 *
 * How this fixes it: when the fetcher THROWS, we call noStore(), which opts THIS render out
 * of the Full Route Cache. Next then re-renders the route on the next request (at runtime the
 * backend is reachable) instead of serving the baked-empty page. A SUCCESSFUL response — even
 * an empty list — is returned and cached normally, because a real empty state is a real state.
 *
 * Use ONLY for the primary content whose absence breaks the page. Incidental data (enrichment,
 * sidebars, "you may also like"…) should keep failing soft WITHOUT poisoning the cache, so wrap
 * only the critical fetch and leave secondary `.catch(() => [])` calls as they are.
 *
 * Server components only — noStore() throws on the client.
 */
/**
 * `rethrow: true` — for surfaces where an empty render is worse than an error, above all the
 * bot-only /x-crawler/* routes. noStore() only stops the empty page being CACHED; the current
 * request still returns HTTP 200 with placeholder content, which Googlebot happily records as
 * a thin/soft-404 page. Rethrowing produces an uncached 5xx that a crawler simply retries.
 * Default stays `false`, so every existing call site keeps its current soft-fail behaviour.
 */
export async function loadForCache<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  options: { rethrow?: boolean } = {}
): Promise<T> {
  try {
    return await fetcher();
  } catch (err) {
    // Do NOT cache this failed render — let the route re-render on the next request.
    noStore();
    console.error('[loadForCache] primary content fetch failed — this render will not be cached:', err);
    if (options.rethrow) throw err;
    return fallback;
  }
}
