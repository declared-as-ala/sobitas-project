/**
 * WHAT SEARCH CONSOLE IS ACTUALLY BEING SHOWN, URL BY URL.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────
 * The coverage report names buckets ("Not found (404)": 1,060; "Page with redirect": 817) and
 * never names the CAUSE. Worse, the two are connected in a way the report cannot show: a 404 that
 * gets a redirect stops being a 404 and becomes a redirect — the first number falls, the second
 * rises, and nothing is indexed either way. Rounds of "fixing 404s" can move pages between buckets
 * forever without a single URL entering the index.
 *
 * So this reads the real exports and asks production what it answers TODAY, then classifies the
 * answer by whether it can ever end in an indexed page:
 *
 *   OK        200 at the end of <=2 hops. Done.
 *   GONE      410. Also done — it is the status that drains the bucket fastest.
 *   DEAD      404, or a redirect that lands on one. Never acceptable: the hop is spent and cached.
 *   SOFT      redirect that lands on a HUB (/shop, /blog, /brands, /). Google's documented
 *             treatment of "redirects to an irrelevant page" is soft 404 — the URL is not dropped
 *             and not indexed, it just moves to a different bucket. This is the shape that makes a
 *             coverage report stop improving, and it is invisible to any check that only reads the
 *             final status code, because the final status is 200.
 *   CHAIN     >=3 hops. Crawl budget spent on nothing.
 *   LOOP      cycle, or more hops than any real redirect needs.
 *
 * ── HOW TO READ THE OUTPUT ───────────────────────────────────────────────────────────────────
 * Grouped by first path segment, because that is the unit a fix acts on: one middleware rule
 * retires a whole prefix. A cluster of 234 URLs under /blogs is one line of code; 234 individual
 * admin redirects is a week of typing and it rots.
 *
 *   node scripts/check-gsc-coverage.mjs <dir-of-extracted-exports>
 *   BASE_URL=http://localhost:3123 node scripts/check-gsc-coverage.mjs ./gsc
 *
 * Each <dir>/<n>/ is one unzipped Coverage Drilldown export (Tableau.csv + Metadonnees.csv).
 * Writes gsc-coverage-report.json in the CWD for the fix passes to consume.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const ROOT = process.argv[2];
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const MAX_HOPS = 5;
const LIMIT = Number(process.env.LIMIT || 0);
const ONLY = process.env.ONLY || '';

if (!ROOT) {
  console.error('usage: node scripts/check-gsc-coverage.mjs <dir-of-extracted-exports>');
  process.exit(2);
}

/* Cloudflare caches per UA-variant and middleware rewrites bots to /x-crawler/*. Measuring with a
   default agent reads whichever variant happened to be cached — that is how two runs of the same
   check disagreed about the same URL earlier in this project. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

/* A destination that answers 200 but tells the visitor nothing about the URL they asked for.
   Landing here is the difference between "retired" and "retired honestly". */
const HUBS = new Set(['/', '/shop', '/blog', '/brands', '/marques', '/categories']);

function normalise(p) {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

function readExports(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (!statSync(p).isDirectory()) continue;
    const files = readdirSync(p);
    const table = files.find((f) => /^Tableau\.csv$/i.test(f));
    const meta = files.find((f) => /tadonn/i.test(f) && f.endsWith('.csv'));
    if (!table) continue;
    let issue = entry;
    if (meta) {
      const line = readFileSync(join(p, meta), 'utf8')
        .split(/\r?\n/)
        .find((l) => /^Probl/.test(l));
      if (line) issue = line.replace(/^[^,]*,/, '').replace(/^"|"$/g, '').trim();
    }
    const urls = readFileSync(join(p, table), 'utf8')
      .split(/\r?\n/)
      .slice(1)
      .map((l) => l.split(',')[0].replace(/^"|"$/g, '').trim())
      .filter((u) => /^https?:\/\//.test(u));
    out.push({ issue, urls });
  }
  return out;
}

async function probe(rawUrl) {
  let url = rawUrl;
  const chain = [];
  let hops = 0;
  let status = 0;

  for (;;) {
    let res;
    try {
      res = await fetch(url, {
        headers: { 'user-agent': UA },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      return { status: 0, hops, chain, verdict: 'ERROR', note: String(err?.name || err) };
    }
    status = res.status;

    if (status >= 300 && status < 400) {
      /* `Headers.get()` joins repeated headers with ", " and `next start` emits the same
         `location` twice on a cache MISS. A browser and Googlebot both take the first value. */
      const loc = res.headers.get('location')?.split(', ')[0];
      if (!loc) return { status, hops, chain, verdict: 'DEAD', note: 'redirect without location' };
      let next;
      try {
        next = new URL(loc, url).toString();
      } catch {
        return { status, hops, chain, verdict: 'DEAD', note: 'unparseable location' };
      }
      if (next === url || chain.includes(next)) return { status, hops, chain, verdict: 'LOOP' };
      chain.push(next);
      url = next;
      if (++hops > MAX_HOPS) return { status, hops, chain, verdict: 'LOOP', note: 'hop cap' };
      continue;
    }
    break;
  }

  let final = url;
  let finalPath = url;
  let finalQuery = '';
  try {
    const u = new URL(url);
    finalPath = normalise(u.pathname);
    finalQuery = u.search;
    final = finalPath + finalQuery;
  } catch {
    /* keep the raw string */
  }

  if (status === 410) return { status, hops, chain, verdict: 'GONE', final };
  if (status === 404) return { status, hops, chain, verdict: 'DEAD', final };
  if (status >= 500) return { status, hops, chain, verdict: 'ERROR', final };

  /* ── WHAT IS *NOT* A HUB DUMP ────────────────────────────────────────────────────────────────
   * The first run of this script reported 431 SOFT and every one was real. The second reported 83,
   * and roughly half of those were this script being wrong. Three shapes, all of which land on a
   * hub path and none of which throws anything away:
   *
   *   PARAM STRIP        `/?p=123 -> /` and `/shop?filter_gout=raisin -> /shop`. The path did not
   *                      change; a junk query was removed. Consolidating duplicates onto the
   *                      canonical URL is the fix, not the defect.
   *   SEARCH HANDOFF     `/produits-search/AMINO -> /shop?search=AMINO`. The term the URL carried
   *                      is still there. This only looked like a dump because `final` was built
   *                      from `pathname` alone, so the script threw away the very thing it was
   *                      checking had been preserved.
   *   RENAME             a single-segment path meaning "the shop" reaching the shop.
   *
   * A dump is a URL that CARRIED something — a slug, an id, a term — arriving somewhere that has
   * none of it. That is now the test, and it is the same one check-dead-product-urls uses.
   */
  if (status === 200 && hops > 0 && HUBS.has(finalPath)) {
    const src = (() => {
      try {
        return new URL(rawUrl);
      } catch {
        return null;
      }
    })();
    const srcPath = src ? normalise(src.pathname) : '';
    const pathUnchanged = srcPath === finalPath;
    const carriedPayload = srcPath.split('/').filter(Boolean).length >= 2;
    const destinationKeptIt = finalQuery.length > 0;

    if (!pathUnchanged && carriedPayload && !destinationKeptIt) {
      return { status, hops, chain, verdict: 'SOFT', final };
    }
  }
  if (hops >= 3) return { status, hops, chain, verdict: 'CHAIN', final };
  return { status, hops, chain, verdict: 'OK', final };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
      if (++done % 200 === 0) process.stderr.write(`  ${done}/${items.length}\n`);
    }
  });
  await Promise.all(workers);
  return results;
}

const groups = readExports(ROOT);
const seen = new Map();
for (const g of groups) {
  for (const u of g.urls) {
    if (!seen.has(u)) seen.set(u, g.issue);
  }
}
let targets = [...seen].map(([url, issue]) => ({ url, issue }));
if (ONLY) targets = targets.filter((t) => t.url.includes(ONLY));
const work = LIMIT ? targets.slice(0, LIMIT) : targets;

console.log(`GSC COVERAGE — ${BASE}`);
console.log(
  `${groups.length} exports, ${targets.length} unique URLs` +
    (work.length !== targets.length ? ` (probing ${work.length})` : '')
);
for (const g of groups) console.log(`   ${String(g.urls.length).padStart(5)}  ${g.issue}`);
console.log('');

const rows = await mapLimit(work, CONCURRENCY, async (t) => {
  const r = await probe(t.url);
  let path = t.url;
  try {
    path = normalise(decodeURIComponent(new URL(t.url).pathname)) + (new URL(t.url).search || '');
  } catch {
    /* keep the raw string */
  }
  return { ...t, path, ...r };
});

const seg = (p) => {
  const s = p.split('?')[0].split('/').filter(Boolean)[0];
  return s ? `/${s}` : '/';
};

const byVerdict = {};
for (const r of rows) (byVerdict[r.verdict] ||= []).push(r);

console.log('── VERDICTS ─────────────────────────────────────────────');
for (const [v, list] of Object.entries(byVerdict).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${v.padEnd(6)} ${String(list.length).padStart(5)}`);
}

console.log('\n── NEEDS WORK, GROUPED BY PREFIX (the unit a fix acts on) ────');
const broken = rows.filter((r) => ['DEAD', 'SOFT', 'CHAIN', 'LOOP', 'ERROR'].includes(r.verdict));
const clusters = {};
for (const r of broken) (clusters[`${seg(r.path)}  ${r.verdict}`] ||= []).push(r);
for (const [k, list] of Object.entries(clusters).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(list.length).padStart(4)}  ${k}`);
  for (const r of list.slice(0, 3)) {
    console.log(`          ${r.path}  ->  ${r.final ?? r.chain.at(-1) ?? '—'} (${r.status})`);
  }
}

writeFileSync('gsc-coverage-report.json', JSON.stringify({ base: BASE, rows }, null, 2));
console.log(`\nwrote gsc-coverage-report.json (${rows.length} rows)`);

const fatal = (byVerdict.DEAD?.length || 0) + (byVerdict.LOOP?.length || 0) + (byVerdict.ERROR?.length || 0);
process.exit(fatal > 0 ? 1 : 0);
