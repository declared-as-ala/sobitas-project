/**
 * Drive the REAL sitemap crawler against every response shape this backend can produce.
 *
 * ── WHY THIS IS NOT A UNIT TEST OF A COPY ────────────────────────────────────────────────────
 * It imports src/util/sitemapCrawl.ts itself (Node 22.6+/24 strips the types), so what is exercised
 * here is the code that runs in production, not a paraphrase of it. Every previous defect in this
 * area — the walk that stopped after page 1, the `total`-without-`last_page` shape that disabled the
 * row-count fallback, the clamped per_page that made a full page look short — was a defect in
 * termination logic that no status code could show. Termination logic is exactly the kind of thing
 * a table of fixtures can pin down, and exactly the kind of thing comments cannot.
 *
 * With API_BASE set it ALSO runs the crawler against the live endpoints and asserts that what it
 * fetched equals what each endpoint says exists:
 *
 *     API_BASE=https://admin.protein.tn/api node scripts/check-sitemap-crawl.mjs
 *
 * Run:  node scripts/check-sitemap-crawl.mjs
 * Exit: 0 = every shape terminated correctly and completeness was judged correctly.
 *
 * ── THE RUNTIME THIS NEEDS IS PINNED, IN THREE PLACES ────────────────────────────────────────────
 * Importing a .ts specifier needs Node 22.6+. When this check joined `prebuild`, .github/workflows/
 * deploy-frontend.yml and frontend/Dockerfile were both still on Node 20, which answers
 * `node: bad option: --experimental-strip-types` with exit 9 — so every CI build and every image
 * build failed before Next.js started. Both pins are now Node 24, package.json declares
 * `engines.node >= 22.6` and .nvmrc says 24. Moving any one of them alone re-breaks the build.
 */
import { crawlPaginated, describeCrawl, readPageMeta, readPageRows } from '../src/util/sitemapCrawl.ts';

let failed = 0;
let passed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

/**
 * A fake paginated endpoint.
 *
 * `clampTo` is the server-side per_page cap — ApisController::resolvePerPage() returns
 * min(per_page, 100) — so the fixture can reproduce "asked for 500, got 100", which is what
 * getCategories does on every single call today.
 *
 * `envelope` picks which of the four real shapes to answer in.
 */
function makeEndpoint({ total, clampTo = 100, envelope = 'pagination', rowsKey = 'rows', duplicateAcross = 0 }) {
  const calls = [];
  const rows = Array.from({ length: total }, (_, i) => ({ id: i + 1, slug: `row-${i + 1}` }));

  return {
    calls,
    fetchPage: async (page, perPage) => {
      const size = Math.min(perPage, clampTo);
      calls.push({ page, perPage, size });
      const start = (page - 1) * size;
      let slice = rows.slice(start, start + size);

      // An unstable sort (latest('created_at') with no tiebreaker over a bulk import) can return the
      // same row on two adjacent pages. The crawl must collapse those, not count them.
      if (duplicateAcross > 0 && page > 1 && start > 0) {
        slice = [...rows.slice(start - duplicateAcross, start), ...slice].slice(0, size);
      }

      const lastPage = Math.max(1, Math.ceil(total / size));

      switch (envelope) {
        case 'pagination': // /all_products — the flat block
          return { [rowsKey]: slice, pagination: { total, last_page: lastPage, per_page: size, current_page: page } };
        case 'meta': // paginatedResponse() — /categories, /all_brands, /all_articles, /pages
          return { data: slice, meta: { total, last_page: lastPage, per_page: size, page } };
        case 'total-only': // what services/api.ts leaves when it reshapes a paginator
          return { [rowsKey]: slice, pagination: { total } };
        case 'bare': // no paginator metadata at all
          return { [rowsKey]: slice };
        case 'raw-paginator': // an untouched LengthAwarePaginator
          return { [rowsKey]: { data: slice, total, last_page: lastPage, per_page: size } };
        case 'array': // a flat array with no envelope whatsoever
          return slice;
        default:
          throw new Error(`unknown envelope ${envelope}`);
      }
    },
  };
}

const opts = (fetchPage, extra = {}) => ({
  label: 'fixture',
  perPage: 100,
  maxRequests: 600,
  concurrency: 4,
  rowsKey: 'rows',
  fetchPage,
  ...extra,
});

/* -- TRANSIENT-FAILURE RETRY -----------------------------------------------------------------
 *
 * THE INCIDENT: on 11/08/2026 /sitemap.xml and every child answered 503 on six consecutive checks,
 * while a hand-run crawl of the identical endpoints completed with NO shortfall. The crawl was not
 * wrong about the data; it was losing single requests. It issues ~20 (12 pages of /all_products at
 * 1,160 published products, plus brands, categories, pages, articles) against a backend sharing its
 * database with the catalogue import, where the SAME request measured between 1.2s and 4.5s purely
 * on load. With Promise.all and no retry, one blip anywhere took the whole sitemap down.
 *
 * The rule that a partial crawl must NEVER be published is unchanged and is asserted below too --
 * the retry buys resilience to the transport, not tolerance of missing rows.
 */
function flakyEndpoint({ total, failuresByPage }) {
  const remaining = new Map(Object.entries(failuresByPage).map(([p, n]) => [Number(p), n]));
  const attempts = new Map();
  const rows = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
  return {
    attempts,
    fetchPage: async (page, size) => {
      attempts.set(page, (attempts.get(page) ?? 0) + 1);
      const left = remaining.get(page) ?? 0;
      if (left > 0) {
        remaining.set(page, left - 1);
        throw new Error(`simulated transient failure on page ${page}`);
      }
      const start = (page - 1) * size;
      return {
        rows: rows.slice(start, start + size),
        pagination: { total, last_page: Math.max(1, Math.ceil(total / size)), per_page: size, current_page: page },
      };
    },
  };
}

console.log('\nsitemap crawl - transient-failure retry\n');

{
  const ep = flakyEndpoint({ total: 410, failuresByPage: { 3: 2 } });
  let crawl = null, threw = null;
  try { crawl = await crawlPaginated(opts(ep.fetchPage)); } catch (e) { threw = e; }
  check(
    'a page that fails twice then succeeds no longer takes the whole sitemap down',
    threw === null && crawl?.rows.length === 410 && describeCrawl('fixture', crawl).verified,
    threw ? `threw: ${threw.message}` : `got ${crawl?.rows.length} rows`
  );
  check(
    'the retried page was actually attempted 3 times (2 failures + 1 success)',
    ep.attempts.get(3) === 3,
    `attempts on page 3: ${ep.attempts.get(3)}`
  );
  check(
    'pages that succeeded first time were not retried',
    ep.attempts.get(2) === 1 && ep.attempts.get(4) === 1,
    `page2=${ep.attempts.get(2)} page4=${ep.attempts.get(4)}`
  );
}

{
  const ep = flakyEndpoint({ total: 250, failuresByPage: { 1: 2 } });
  let crawl = null, threw = null;
  try { crawl = await crawlPaginated(opts(ep.fetchPage)); } catch (e) { threw = e; }
  check(
    'the FIRST page retries as well (it is fetched outside the batch loop)',
    threw === null && crawl?.rows.length === 250,
    threw ? `threw: ${threw.message}` : `got ${crawl?.rows.length} rows`
  );
}

{
  const ep = flakyEndpoint({ total: 410, failuresByPage: { 3: 99 } });
  let crawl = null, threw = null;
  try { crawl = await crawlPaginated(opts(ep.fetchPage)); } catch (e) { threw = e; }
  check(
    'a page that NEVER succeeds still aborts the crawl - a partial sitemap is never published',
    threw !== null && crawl === null,
    threw ? '' : `did not throw; got ${crawl?.rows.length} rows`
  );
  check(
    'it gave up after a bounded number of attempts rather than looping for ever',
    ep.attempts.get(3) === 3,
    `attempts on page 3: ${ep.attempts.get(3)}`
  );
  check(
    'the fatal error names the endpoint and the page, so the log says what to look at',
    threw !== null && /fixture/.test(threw.message) && /page 3/.test(threw.message),
    threw ? threw.message.slice(0, 140) : ''
  );
}

{
  let calls = 0;
  const fetchPage = async () => { calls++; return { pagination: { total: 10, last_page: 1, per_page: 100 } }; };
  let threw = null;
  try { await crawlPaginated(opts(fetchPage)); } catch (e) { threw = e; }
  check(
    'a malformed page (200, no rows array) is NOT retried - it throws on first sight',
    threw !== null && calls === 1,
    `calls=${calls} ${threw ? threw.message.slice(0, 90) : 'did not throw'}`
  );
}


console.log('\nsitemap crawl — response shapes\n');

/* ── 1. last_page present ──────────────────────────────────────────────────────────────────── */
{
  const ep = makeEndpoint({ total: 410, envelope: 'pagination' });
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  const verdict = describeCrawl('fixture', crawl);
  check(
    'last_page present: walks every page and verifies against total (410 over 5 pages)',
    crawl.rows.length === 410 && crawl.terminatedBy === 'metadata' && verdict.verified,
    `got ${crawl.rows.length} rows, terminatedBy=${crawl.terminatedBy}, verified=${verdict.verified}`
  );
}

/* ── 2. meta envelope (every paginatedResponse endpoint) ───────────────────────────────────── */
{
  // The exact live shape of /all_articles: 224 published articles over 3 pages. Before this
  // rebuild the sitemap fetched page 1 and submitted 100 of them.
  const ep = makeEndpoint({ total: 224, envelope: 'meta' });
  const crawl = await crawlPaginated(opts(ep.fetchPage, { rowsKey: 'articles' }));
  const verdict = describeCrawl('fixture', crawl);
  check(
    'meta envelope: 224 articles over 3 pages, not the 100 a single fetch returns',
    crawl.rows.length === 224 && verdict.verified && crawl.requests === 3,
    `got ${crawl.rows.length} rows in ${crawl.requests} requests, verified=${verdict.verified}`
  );
}

/* ── 3. total present, last_page ABSENT ────────────────────────────────────────────────────── */
{
  const ep = makeEndpoint({ total: 410, envelope: 'total-only' });
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  const verdict = describeCrawl('fixture', crawl);
  check(
    'total but no last_page: falls back to the row-count walk instead of stopping at page 1',
    crawl.rows.length === 410 && crawl.terminatedBy === 'row-count',
    `got ${crawl.rows.length} rows, terminatedBy=${crawl.terminatedBy} — 100 here is the "unknown treated as 1" bug`
  );
  check(
    'total but no last_page: the total is still used to VERIFY the row-count walk',
    verdict.verified && crawl.expectedTotal === 410,
    `verified=${verdict.verified}, expectedTotal=${crawl.expectedTotal}`
  );
}

/* ── 4. neither total nor last_page ────────────────────────────────────────────────────────── */
{
  const ep = makeEndpoint({ total: 410, envelope: 'bare' });
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  const verdict = describeCrawl('fixture', crawl);
  check(
    'no metadata at all: still walks to the last short page',
    crawl.rows.length === 410 && crawl.terminatedBy === 'row-count',
    `got ${crawl.rows.length} rows`
  );
  check(
    'no metadata at all: reports UNVERIFIED rather than claiming it checked',
    !verdict.verified && verdict.shortfall === 0 && /could not be verified/.test(verdict.message),
    verdict.message
  );
}

/* ── 5. the server clamps per_page ─────────────────────────────────────────────────────────── */
{
  // getCategories asks for per_page=500 on every call; resolvePerPage() returns min(500, 100).
  // If "is this page full?" were tested against the REQUESTED size, page 1 would look short and the
  // walk would stop with 100 of 250 rows.
  const ep = makeEndpoint({ total: 250, clampTo: 100, envelope: 'bare' });
  const crawl = await crawlPaginated(opts(ep.fetchPage, { perPage: 500 }));
  check(
    'server clamps per_page 500 → 100: reads the honoured size back and keeps walking',
    crawl.rows.length === 250 && crawl.effectivePageSize === 100,
    `got ${crawl.rows.length} rows, effectivePageSize=${crawl.effectivePageSize} (100 rows here is the clamp bug)`
  );
  check(
    'server clamps per_page: every request still ASKS for the value it was given',
    ep.calls.every((c) => c.perPage === 500),
    JSON.stringify(ep.calls.slice(0, 3))
  );
}

/* ── 6. raw LengthAwarePaginator ───────────────────────────────────────────────────────────── */
{
  const ep = makeEndpoint({ total: 130, envelope: 'raw-paginator' });
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  check(
    'raw paginator { rows: { data, total, last_page } }: rows AND count read from the same envelope',
    crawl.rows.length === 130 && describeCrawl('fixture', crawl).verified,
    `got ${crawl.rows.length} rows`
  );
}

/* ── 7. a bare array, i.e. NO metadata whatsoever ──────────────────────────────────────────── */
{
  // 42 rows and no `per_page` anywhere: "is this a clamped full page, or the whole table?" is
  // genuinely unanswerable from this response. The walk probes rather than guessing — correct row
  // count, at a bounded cost of at most one extra batch. Guessing "it's the end" is the truncation
  // this module exists to prevent, so the extra requests are the price and they are asserted, not
  // hoped for.
  const ep = makeEndpoint({ total: 42, clampTo: 100, envelope: 'array' });
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  check(
    'a flat array with no metadata: right row count, and the probe stays inside one batch',
    crawl.rows.length === 42 && crawl.requests <= 1 + 4,
    `got ${crawl.rows.length} rows in ${crawl.requests} request(s)`
  );
}

/* ── 7b. per_page from the response removes the ambiguity entirely ─────────────────────────── */
{
  // The same 42-row table, but the server states per_page: one request, no probe.
  const ep = makeEndpoint({ total: 42, clampTo: 100, envelope: 'meta' });
  const crawl = await crawlPaginated(opts(ep.fetchPage, { rowsKey: 'data' }));
  check(
    'per_page in the response: a short page is known to be the end, so no probe is spent',
    crawl.rows.length === 42 && crawl.requests === 1 && crawl.effectivePageSize === 100,
    `got ${crawl.rows.length} rows in ${crawl.requests} request(s), effectivePageSize=${crawl.effectivePageSize}`
  );
}

/* ── 8. the endpoint under-delivers: the crawl must SAY SO ─────────────────────────────────── */
{
  // total says 500, only 100 rows exist. This is a hole, and a hole must never be published.
  const ep = {
    fetchPage: async (page, perPage) => ({
      rows: page === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })) : [],
      pagination: { total: 500, last_page: 5, per_page: perPage },
    }),
  };
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  const verdict = describeCrawl('fixture', crawl);
  check(
    'a crawl that came up 400 rows short is reported short, not published',
    !verdict.verified && verdict.shortfall === 400,
    `verified=${verdict.verified}, shortfall=${verdict.shortfall} — ${verdict.message}`
  );
}

/* ── 9. concurrent inserts: drift, not a magic percentage ──────────────────────────────────── */
{
  // The total climbs while we paginate — a promotion wave running during the crawl. `drift` must
  // absorb exactly that much and no more.
  let seen = 0;
  const ep = {
    fetchPage: async (page, perPage) => {
      const total = 200 + page; // one row inserted per page fetched
      const rows = page <= 2 ? Array.from({ length: 100 }, (_, i) => ({ id: (page - 1) * 100 + i + 1 })) : [];
      seen += rows.length;
      return { rows, pagination: { total, last_page: 2, per_page: perPage } };
    },
  };
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  const verdict = describeCrawl('fixture', crawl);
  check(
    'a total that moved during the crawl relaxes the check by exactly the drift',
    crawl.drift === 1 && crawl.rows.length === 200 && verdict.verified,
    `drift=${crawl.drift}, rows=${crawl.rows.length}, verified=${verdict.verified} (${verdict.message})`
  );
}

/* ── 10. an unstable sort repeats rows across pages ────────────────────────────────────────── */
{
  const ep = makeEndpoint({ total: 300, envelope: 'pagination', duplicateAcross: 5 });
  const crawl = await crawlPaginated(opts(ep.fetchPage));
  check(
    'rows repeated across a page boundary collapse instead of inflating the count',
    crawl.duplicates > 0 && crawl.rows.length <= 300 && new Set(crawl.rows.map((r) => r.id)).size === crawl.rows.length,
    `rows=${crawl.rows.length}, duplicates=${crawl.duplicates}`
  );
}

/* ── 11. a malformed page must THROW, never truncate ───────────────────────────────────────── */
{
  const ep = {
    fetchPage: async (page) =>
      page === 3 ? { error: 'boom' } : { rows: Array.from({ length: 100 }, (_, i) => ({ id: page * 1000 + i })), pagination: { total: 500, last_page: 5 } },
  };
  let threw = null;
  try {
    await crawlPaginated(opts(ep.fetchPage));
  } catch (e) {
    threw = e;
  }
  check(
    'a page with no rows array aborts the crawl instead of caching a partial catalogue',
    threw !== null && /returned no rows array/.test(String(threw.message)),
    threw ? threw.message : 'no throw — a partial crawl would have been published'
  );
}

/* ── 12. runaway pagination hits a ceiling, loudly ─────────────────────────────────────────── */
{
  // last_page keeps climbing — broken metadata. The loop must be bounded by THIS code, not by the
  // backend behaving.
  let n = 0;
  const ep = {
    fetchPage: async (page, perPage) => {
      n++;
      return { rows: Array.from({ length: 100 }, (_, i) => ({ id: page * 1000 + i })), pagination: { total: 9e9, last_page: page + 50, per_page: perPage } };
    },
  };
  let threw = null;
  try {
    await crawlPaginated(opts(ep.fetchPage, { maxRequests: 25 }));
  } catch (e) {
    threw = e;
  }
  check(
    'a last_page that never stops climbing throws at the request ceiling',
    threw !== null && /request ceiling/.test(String(threw.message)) && n <= 30,
    threw ? `${threw.message} (after ${n} requests)` : `no throw after ${n} requests`
  );
}

/* ── 13. an empty table ────────────────────────────────────────────────────────────────────── */
{
  const ep = makeEndpoint({ total: 0, envelope: 'meta' });
  const crawl = await crawlPaginated(opts(ep.fetchPage, { rowsKey: 'data' }));
  check(
    'an empty table is one request, zero rows, and verified',
    crawl.rows.length === 0 && crawl.requests === 1 && describeCrawl('fixture', crawl).verified,
    `rows=${crawl.rows.length}, requests=${crawl.requests}`
  );
}

/* ── 14. the envelope readers themselves ───────────────────────────────────────────────────── */
{
  check(
    'readPageMeta: total alone yields lastPage=null (UNKNOWN), never 1',
    readPageMeta({ pagination: { total: 20000 } })?.lastPage === null,
    JSON.stringify(readPageMeta({ pagination: { total: 20000 } }))
  );
  check(
    'readPageMeta: reads the keyed *_meta envelope paginatedKeyedResponse() emits',
    readPageMeta({ products_meta: { total: 7, last_page: 1 } }, 'products')?.total === 7
  );
  check(
    'readPageRows: null (malformed) is distinguished from [] (empty)',
    readPageRows({ nothing: 1 }, 'rows') === null && Array.isArray(readPageRows({ rows: [] }, 'rows'))
  );
}

/* ── 15. LIVE endpoints, when asked ────────────────────────────────────────────────────────── */
const API_BASE = (process.env.API_BASE || '').replace(/\/$/, '');
if (API_BASE) {
  console.log(`\nlive endpoints (${API_BASE})\n`);

  const live = [
    { label: '/all_products', path: '/all_products', rowsKey: 'products' },
    { label: '/all_articles', path: '/all_articles', rowsKey: 'articles' },
    { label: '/all_brands', path: '/all_brands' },
    { label: '/categories', path: '/categories' },
    { label: '/pages', path: '/pages' },
  ];

  for (const { label, path, rowsKey } of live) {
    try {
      const crawl = await crawlPaginated({
        label,
        perPage: 100,
        maxRequests: 600,
        concurrency: 4,
        rowsKey,
        fetchPage: async (page, perPage) => {
          const res = await fetch(`${API_BASE}${path}?page=${page}&per_page=${perPage}`, {
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) throw new Error(`${label} page ${page} → HTTP ${res.status}`);
          return res.json();
        },
      });
      const verdict = describeCrawl(label, crawl);
      check(
        `${label}: fetched ${crawl.rows.length} of a reported ${crawl.expectedTotal} over ${crawl.requests} request(s)`,
        verdict.verified,
        verdict.message
      );
    } catch (e) {
      check(`${label}: live crawl completed`, false, String(e.message ?? e));
    }
  }
} else {
  console.log('\n(set API_BASE=https://admin.protein.tn/api to also crawl the live endpoints)\n');
}

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${passed} passed)\n`);
process.exit(failed === 0 ? 0 : 1);
