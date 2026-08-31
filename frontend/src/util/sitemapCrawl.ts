/**
 * THE VERIFIED PAGINATED CRAWL — one implementation, used by every sitemap source.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────────────────────
 * sitemapData.ts used to carry ~130 lines of extremely careful pagination logic that applied to
 * PRODUCTS ONLY. Every other source was a bare one-shot fetch with `?per_page=100` glued onto the
 * URL in services/api.ts, and ApisController::resolvePerPage() clamps per_page to
 * MAX_PER_PAGE = 100 for every one of them. So the guarantees the products crawl argues for at
 * length — walk to the real end, verify the count you got against the count the server reported,
 * refuse to publish a short file — protected one of the six content types and none of the others.
 *
 * That was not theoretical. Measured against the live API on 2026-08-10:
 *
 *      /all_articles?per_page=100   →  100 rows,  meta.total = 224   ← 124 blog URLs missing
 *      /all_brands?per_page=100     →  100 rows,  meta.total = 128   ←  28 brands never considered
 *      /categories?per_page=500     →    6 rows,  meta.total =   6     (clamped to 100; fits today)
 *      /pages?per_page=100          →    6 rows,  meta.total =   6
 *
 * and /sitemaps/blog.xml on production contained exactly 100 <url> entries out of 224 published
 * articles. Nothing logged, nothing failed, every status code 200. That is the same defect the
 * products crawl was hardened against, sitting unnoticed in four other sources, because the fix
 * had been written as a special case instead of as a mechanism.
 *
 * So: ONE crawler. Every source walks its endpoint to the end and proves it got there, or the
 * sitemap refuses to publish. A new page type gets the same guarantees by construction rather than
 * by remembering to reimplement them.
 *
 * ── THE FOUR RESPONSE SHAPES IT HAS TO SURVIVE ───────────────────────────────────────────────
 * These are not hypothetical; they are what the endpoints and the client between them actually
 * produce, and each one is exercised by scripts/check-sitemap-crawl.mjs against this exact code:
 *
 *   1. `last_page` PRESENT (`/all_products`, via the flat `pagination` block; every
 *      paginatedResponse() endpoint, via `meta`). Walk to last_page, verify against `total`.
 *   2. `total` PRESENT, `last_page` ABSENT. This is what services/api.ts::getAllProducts produces
 *      when the upstream sends a raw Laravel paginator: it flattens `products.data` into an array
 *      and rebuilds `pagination` from `raw.pagination` only, so the page count does not survive the
 *      client. `last_page === null` means UNKNOWN, never 1 — conflating the two is what once cut
 *      /sitemap.xml to the first 100 products with a 200 and no warning. Walk by row count, and
 *      still verify the result against `total`.
 *   3. NEITHER present. Walk by row count: a full page means more exist, a short page is the end.
 *      Completeness is then unverifiable, and it says so instead of implying it checked.
 *   4. THE SERVER CLAMPS per_page. resolvePerPage() returns min(per_page, 100), so asking for 500
 *      silently yields 100. Every loop decision is taken from the response, never from the request:
 *      the page size used for "is this page full?" is the size the FIRST page actually came back
 *      with, not the size we asked for.
 */

/**
 * Page count, row total and the page size the SERVER honoured, from whichever envelope carried them.
 *
 * `perPage` is read for one reason: it is the server telling us, in its own words, what it did with
 * our `per_page`. resolvePerPage() returns min(per_page, 100), so the value we asked for is evidence
 * of nothing. Every Laravel paginator emits it, which removes the "is this short page a clamp or the
 * end of the table?" ambiguity for every real endpoint here.
 */
export type PageMeta = { total: number | null; lastPage: number | null; perPage: number | null };

/**
 * The paginator metadata on one page, read from whichever envelope actually arrived.
 *
 * Four are checked because four are what this backend can emit, and which one reaches a given
 * caller is a property of services/api.ts rather than of the endpoint:
 *
 *   • `res.pagination` — the flat block ApisController::allProducts() sends.
 *   • `res.meta`       — what paginatedResponse() sends (/categories, /all_brands, /all_articles,
 *                        /pages). services/api.ts drops it on the floor for all four of those,
 *                        which is precisely how 124 blog articles went missing in silence.
 *   • `res.<key>_meta` — what paginatedKeyedResponse() sends.
 *   • `res.<key>`      — a raw LengthAwarePaginator: `{ data: [...], total, last_page }`.
 *
 * `null` means "this page told us nothing about how many pages exist", which the caller must treat
 * as UNKNOWN and never as one.
 */
export function readPageMeta(res: unknown, rowsKey?: string): PageMeta | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as Record<string, unknown>;

  const envelopes: unknown[] = [r.pagination, r.meta];
  if (rowsKey) {
    envelopes.push(r[`${rowsKey}_meta`]);
    // A raw paginator only counts as an envelope when it is NOT the already-flattened array.
    if (r[rowsKey] && !Array.isArray(r[rowsKey])) envelopes.push(r[rowsKey]);
  }

  for (const envelope of envelopes) {
    if (!envelope || typeof envelope !== 'object') continue;
    const e = envelope as { total?: unknown; last_page?: unknown; per_page?: unknown };
    const total = Number(e.total);
    const lastPage = Number(e.last_page);
    const perPage = Number(e.per_page);
    const hasTotal = Number.isFinite(total) && total >= 0;
    const hasLastPage = Number.isFinite(lastPage) && lastPage > 0;
    const hasPerPage = Number.isFinite(perPage) && perPage > 0;
    if (hasTotal || hasLastPage || hasPerPage) {
      return {
        total: hasTotal ? total : null,
        lastPage: hasLastPage ? lastPage : null,
        perPage: hasPerPage ? perPage : null,
      };
    }
  }

  return null;
}

/**
 * The rows on one page: a bare array, `{ data: [...] }`, `{ <key>: [...] }`, or a raw paginator at
 * `{ <key>: { data: [...] } }`.
 *
 * Symmetric with readPageMeta on purpose — rows and page count must be read out of the SAME set of
 * envelopes, or a shape whose count is understood would still abort the crawl here. `null` means
 * the page carried no rows array at all, which is a malformed response and not an empty table; the
 * caller throws on it rather than treating it as "the end".
 */
export function readPageRows<T>(res: unknown, rowsKey?: string): T[] | null {
  if (res === null || res === undefined) return null;
  if (Array.isArray(res)) return res as T[];
  if (typeof res !== 'object') return null;
  const r = res as Record<string, unknown>;

  const candidates: unknown[] = [];
  if (rowsKey) candidates.push(r[rowsKey]);
  candidates.push(r.data);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as T[];
    const nested = (candidate as { data?: unknown } | null | undefined)?.data;
    if (Array.isArray(nested)) return nested as T[];
  }

  return null;
}

export type PaginatedCrawl<T> = {
  /** Distinct rows, in the order first seen. */
  rows: T[];
  /** Lowest reported total any page carried, or -1 when no page reported a total at all. */
  expectedTotal: number;
  /** How much the reported total moved while we paginated (max − min). */
  drift: number;
  /** Rows returned more than once — the signature of an unstable sort. */
  duplicates: number;
  /** Rows with no usable key. Kept, never dropped. */
  unkeyed: number;
  requests: number;
  /** The page size the SERVER actually used, read off page 1. Never the size we asked for. */
  effectivePageSize: number;
  /**
   * How the crawl knew where to stop: `metadata` when a page reported a `last_page`, `row-count`
   * when none did and the walk ended on a short page. A page that reported only a `total` is
   * `row-count`: a total says how many rows exist, not where the pages end.
   */
  terminatedBy: 'metadata' | 'row-count';
};

export type CrawlOptions<T> = {
  /** Appears in every error and warning this crawl can emit. Use the endpoint name. */
  label: string;
  /** What to ask for. The server may clamp it; the crawl reads back what it got. */
  perPage: number;
  /** Hard ceiling on requests. Reaching it is a throw, never a quiet stop. */
  maxRequests: number;
  /** How many pages in flight at once. Keep small — the SSR container shares the API's per-IP budget. */
  concurrency?: number;
  /** The key rows live under in the envelope (`products`, `articles`, …), when there is one. */
  rowsKey?: string;
  fetchPage: (page: number, perPage: number) => Promise<unknown>;
  /** Stable identity for dedupe. Default: `row.id`. */
  keyOf?: (row: T) => number | undefined;
};

/**
 * Walk a paginated endpoint to its end, or throw.
 *
 * THROWS ON ANY MALFORMED PAGE, and that is the whole design. An earlier products implementation
 * `break`ed out of the loop instead, fell through to a guard that only asked "did we get ZERO?",
 * and so a crawl that died at page 137 of 200 returned ~13,700 rows, passed, and was memoised as
 * the authoritative sitemap for an hour. Google reads a sitemap that shrank as "these URLs were
 * removed". A throw reaches the route handlers, which answer 503 + Retry-After and cache nothing.
 */
/**
 * One page fetch, retried through a transient failure.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────
 * crawlPaginated throws on any failed page, deliberately: an incomplete set must never reach the
 * cache, because Google reads a sitemap that shrank as "these URLs were removed". That rule is
 * right and is unchanged.
 *
 * What was wrong is that it threw on the FIRST blip, with no retry. The crawl issues ~20 requests
 * (12 pages of /all_products at 1,160 published products, plus brands, categories, pages and
 * articles), every one against a backend that shares its database with the catalogue import —
 * hydration and content passes every ten minutes, promote/publish hourly, queue workers throughout.
 * Measured 11/08/2026, the SAME request varied between 1.2s and 4.5s purely on load. At twenty
 * chances, one timeout or one 502 takes the entire sitemap to 503, and it did: /sitemap.xml and
 * every child were 503 on six consecutive checks while a hand-run crawl of the identical endpoints
 * completed with no shortfall at all.
 *
 * So: retry the TRANSPORT, keep refusing partial DATA. A page that never arrives is still fatal —
 * it just now takes three failures instead of one to say so. Malformed-but-delivered pages are not
 * retried here at all; absorb() throws on those, and re-requesting a shape the server is confident
 * about would only waste the budget.
 *
 * Backoff is jittered because the whole point is that the origin is momentarily busy: three
 * retries landing in lockstep with the other pages of the same batch would recreate the burst that
 * caused the failure. The delays are short — this runs inside a request that Googlebot is waiting
 * on, and a sitemap that takes 10s is fine while one that 503s is not.
 */
async function fetchPageWithRetry(
  fetchPage: (page: number, perPage: number) => Promise<unknown>,
  page: number,
  perPage: number,
  label: string
): Promise<unknown> {
  const ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await fetchPage(page, perPage);
    } catch (error) {
      lastError = error;
      if (attempt === ATTEMPTS) break;
      // 250ms, 500ms, plus up to 250ms of jitter.
      const backoff = 250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      console.warn(
        `[sitemap] ${label} page ${page} failed (attempt ${attempt}/${ATTEMPTS}), retrying in ${backoff}ms: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw new Error(
    `[sitemap] ${label} page ${page} failed ${ATTEMPTS} time(s) — aborting the crawl rather than ` +
    `caching a partial ${label}. Last error: ` +
    `${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

export async function crawlPaginated<T>(opts: CrawlOptions<T>): Promise<PaginatedCrawl<T>> {
  const { label, perPage, maxRequests, rowsKey } = opts;
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const keyOf = opts.keyOf ?? ((row: T) => {
    const id = Number((row as { id?: unknown })?.id);
    return Number.isFinite(id) ? id : undefined;
  });

  const byKey = new Map<number, T>();
  const unkeyedRows: T[] = [];
  let duplicates = 0;
  let requests = 0;
  let minTotal = Number.POSITIVE_INFINITY;
  let maxTotal = 0;
  let sawPagination = false;
  let lastPage = 1;
  let reportedPerPage: number | null = null;

  /** Absorb one page and return how many rows it carried (the row count drives termination). */
  const absorb = (res: unknown, page: number): number => {
    const rows = readPageRows<T>(res, rowsKey);
    if (rows === null) {
      throw new Error(
        `[sitemap] ${label} page ${page} returned no rows array — aborting the crawl rather than caching a partial ${label}`
      );
    }
    for (const row of rows) {
      const key = keyOf(row);
      if (key === undefined) {
        // Keep it rather than drop it: a row with no id is a backend regression, and silently
        // losing URLs is the failure mode this whole module defends against.
        unkeyedRows.push(row);
        continue;
      }
      if (byKey.has(key)) {
        duplicates++;
        continue;
      }
      byKey.set(key, row);
    }

    const meta = readPageMeta(res, rowsKey);
    if (meta) {
      if (meta.perPage !== null && reportedPerPage === null) reportedPerPage = meta.perPage;
      if (meta.total !== null) {
        minTotal = Math.min(minTotal, meta.total);
        maxTotal = Math.max(maxTotal, meta.total);
      }
      /*
       * sawPagination is driven by the PAGE COUNT and by nothing else.
       *
       * Setting it on "any metadata arrived" — which readPageMeta does on `total` ALONE — flips the
       * crawl into bounded mode while `lastPage` is still its initial 1, and the walk stops after
       * page 1 of N with the row-count fallback that exists for exactly this case disabled.
       *
       * Math.max, not assignment: rows are usually sorted newest-first, so a promotion wave running
       * during the crawl adds pages at the END. Taking the max means we still walk to the new end.
       */
      if (meta.lastPage !== null) {
        sawPagination = true;
        lastPage = Math.max(lastPage, meta.lastPage);
      }
    }

    return rows.length;
  };

  // Page 1 alone first — it is what tells us how many pages exist AND what page size the server
  // actually honoured. Only then can the rest be parallelised, and only then is the fan-out bounded
  // by something the server said rather than something we assumed.
  requests++;
  const firstPageRows = absorb(await fetchPageWithRetry(opts.fetchPage, 1, perPage, label), 1);

  /*
   * THE PAGE SIZE IS READ BACK, NEVER ASSUMED.
   *
   * resolvePerPage() returns min(per_page, MAX_PER_PAGE = 100). getCategories asks for 500 and
   * receives 100. If "is this page full?" were tested against the REQUESTED size, a clamped endpoint
   * would look like it returned a short page on page 1 and the walk would stop there with 100 of N
   * rows — the exact silent truncation this module exists to make impossible.
   *
   * Preference order, strongest evidence first:
   *   1. `per_page` FROM THE RESPONSE — the server saying what it actually did. Every Laravel
   *      paginator emits it, so this is what all five real endpoints resolve to.
   *   2. The row count of page 1, when there is no paginator at all. This is a HYPOTHESIS, not a
   *      fact: a page of 42 rows might be a clamped-to-42 full page or the whole table. The walk
   *      resolves the ambiguity by probing rather than by guessing — it costs at most `concurrency`
   *      extra requests against an endpoint that returned no metadata, and it is the only choice
   *      that cannot truncate.
   *   3. The requested size, for an empty first page, so the comparison stays meaningful.
   */
  const effectivePageSize = Math.max(1, reportedPerPage ?? (firstPageRows > 0 ? firstPageRows : perPage));

  let nextPage = 2;
  let exhausted = firstPageRows < effectivePageSize;

  /** True while pages remain: bounded by the reported last_page, or by row count when there is none. */
  const hasMorePages = (): boolean => (sawPagination ? nextPage <= lastPage : !exhausted);

  while (hasMorePages()) {
    if (requests >= maxRequests) {
      throw new Error(
        `[sitemap] ${label} crawl hit the ${maxRequests}-request ceiling ` +
        `(${sawPagination ? `last_page=${lastPage}` : 'no page reported a last_page; walking by row count'}, ` +
        `${byKey.size} distinct rows so far) — refusing to keep looping`
      );
    }
    const batch: number[] = [];
    while (batch.length < concurrency && hasMorePages() && requests < maxRequests) {
      batch.push(nextPage++);
      requests++;
    }
    // Promise.all, not allSettled: one failed page means an incomplete set, and an incomplete set
    // must never reach the cache. Let the rejection propagate.
    const responses = await Promise.all(
      batch.map((page) => fetchPageWithRetry(opts.fetchPage, page, perPage, label))
    );
    const rowCounts = responses.map((res, i) => absorb(res, batch[i]));
    /*
     * The decision is taken on the HIGHEST-numbered page of the batch, not on any short page in it:
     * pages are fetched in contiguous batches, so a short page with full pages after it is a hole in
     * the middle (a concurrent delete), not the end, and stopping there would truncate exactly the
     * way this is written to prevent. Only in row-count mode — if a page in this batch DID report a
     * last_page, the bounded condition takes over from here.
     */
    if (!sawPagination) {
      exhausted = (rowCounts[rowCounts.length - 1] ?? 0) < effectivePageSize;
    }
    // Termination: `requests` grows by at least 1 per outer iteration and is hard-capped above, so
    // this loop cannot run forever even if `lastPage` keeps climbing.
  }

  return {
    rows: [...byKey.values(), ...unkeyedRows],
    expectedTotal: Number.isFinite(minTotal) ? minTotal : -1,
    drift: Number.isFinite(minTotal) ? Math.max(0, maxTotal - minTotal) : 0,
    duplicates,
    unkeyed: unkeyedRows.length,
    requests,
    effectivePageSize,
    terminatedBy: sawPagination ? 'metadata' : 'row-count',
  };
}

/**
 * Whether a crawl can PROVE it saw everything, and the sentence explaining either answer.
 *
 * Split out from the crawl so the caller decides what an unverifiable result costs: a source that
 * carries the catalogue must 503 on a shortfall, while a source whose endpoint simply reports no
 * total can only be logged. Neither is allowed to be silent — see the sitemapData.ts docblock that
 * has argued this since the day a truncated sitemap shipped with a 200.
 */
export function describeCrawl<T>(label: string, crawl: PaginatedCrawl<T>): {
  verified: boolean;
  shortfall: number;
  message: string;
} {
  const got = crawl.rows.length;

  if (crawl.expectedTotal < 0) {
    return {
      verified: false,
      shortfall: 0,
      message:
        `[sitemap] ${label} carried no reported total — completeness could not be verified. ` +
        `Walked to the end by ${crawl.terminatedBy}: ${got} distinct rows over ${crawl.requests} request(s).`,
    };
  }

  /*
   * The tolerance is `drift`, not a magic percentage. Rows are paginated newest-first, so every row
   * inserted while we walk pushes one row across a page boundary behind us — k concurrent inserts
   * can hide at most k rows from an offset crawl. `drift` is MEASURED (max reported total − min
   * reported total), so when the table is quiet it is 0 and this is a strict equality check; during
   * a promotion wave it relaxes by exactly as much as the wave moved and no more. A shortfall larger
   * than that is a real hole, and holes must 503.
   */
  const minimumAcceptable = Math.max(0, crawl.expectedTotal - crawl.drift);
  const shortfall = Math.max(0, minimumAcceptable - got);

  if (shortfall > 0) {
    return {
      verified: false,
      shortfall,
      message:
        `[sitemap] ${label} crawl incomplete: ${got} distinct rows for a reported total of ${crawl.expectedTotal} ` +
        `(drift ${crawl.drift}, ${crawl.duplicates} duplicate rows, ${crawl.requests} requests) — ` +
        `${shortfall} row(s) short`,
    };
  }

  return {
    verified: true,
    shortfall: 0,
    message: `[sitemap] ${label}: ${got}/${crawl.expectedTotal} rows over ${crawl.requests} request(s) (${crawl.terminatedBy})`,
  };
}
