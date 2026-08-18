/**
 * LIVE half of the URL contract. Probes a running site and fails on any violation.
 *
 *   node scripts/check-indexability-live.mjs                        # production
 *   BASE_URL=http://localhost:3457 node scripts/check-indexability-live.mjs
 *   node scripts/check-indexability-live.mjs --only=L1,L4           # one rule at a time
 *
 * ── WHY A LIVE CHECK, WHEN THE STATIC ONE ALREADY RUNS IN CI ──────────────────────────────────
 * Because every defect this was written from is a RUNTIME property that the source denies.
 * app/(shop)/shop/[slug]/[subcategory]/page.tsx is four lines long and calls permanentRedirect().
 * Reading it, the route redirects. Running it, the route answers HTTP 200 with a meta-refresh —
 * for valid input as well as invalid. No amount of source reading finds that.
 *
 * ── CONCURRENCY IS 2 ON PURPOSE ───────────────────────────────────────────────────────────────
 * An earlier probe of this origin at 6 produced 126 HTTP 502s, and Next's error page carries
 * `noindex,nofollow` — so the run "discovered" a site-wide noindex catastrophe that it had itself
 * caused. A checker that changes what it measures is worse than no checker.
 *
 * ── EVERY PROBE CARRIES A NONCE ───────────────────────────────────────────────────────────────
 * `/blog/zz-{n}` with a fixed n measures whatever the CDN cached the first time it was asked. The
 * nonce makes every run a cache MISS, so the answer comes from the origin.
 */
import {
  ROUTE_CONTRACT, STATIC_PAGES, NOINDEX_PAGES, MACHINE_PREFIXES,
  MUST_BE_TERMINAL, HUBS, TERMINAL, withNonce,
} from './urlContract.mjs';

const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
const ONLY_SET = ONLY ? new Set(ONLY.split(',')) : null;
const NONCE = process.env.NONCE || String(Math.floor(Math.random() * 1e9));

const BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const failures = [];
const notes = [];
const fail = (rule, url, msg) => failures.push({ rule, url, msg });
const note = (msg) => notes.push(msg);
const on = (rule) => !ONLY_SET || ONLY_SET.has(rule);

/* ── fetching ───────────────────────────────────────────────────────────────────────────────── */

const rel = (u) => {
  try {
    const x = new URL(u, BASE);
    return x.pathname + x.search;
  } catch {
    return u || '';
  }
};

/** One request, no redirect following, with the SEO-relevant signals pulled out of the response. */
async function probe(path, ua = GOOGLEBOT) {
  const url = path.startsWith('http') ? path : BASE + path;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'user-agent': ua },
      redirect: 'manual',
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return { url, status: 0, error: e.name === 'TimeoutError' ? 'timeout' : String(e.message || e) };
  }

  const out = {
    url,
    status: res.status,
    location: res.headers.get('location') || null,
    xRobots: res.headers.get('x-robots-tag') || '',
    cacheControl: res.headers.get('cache-control') || '',
  };
  if (res.status !== 200) return out;

  const html = await res.text();
  out.html = html;
  out.canonicals = [...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)]
    .map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1] || '')
    .filter(Boolean);
  out.robots = [...html.matchAll(/<meta[^>]+name=["']robots["'][^>]*>/gi)]
    .map((m) => m[0].match(/content=["']([^"']+)["']/i)?.[1] || '')
    .filter(Boolean);
  out.title = (html.match(/<title[^>]*>([^<]*)</i)?.[1] || '').trim();
  out.metaRefresh = /http-equiv=["']refresh["']/i.test(html);
  return out;
}

/** Follow the redirect chain, returning every hop. */
async function chase(path, ua = GOOGLEBOT, maxHops = 6) {
  const hops = [];
  let current = path.startsWith('http') ? path : BASE + path;
  for (let i = 0; i <= maxHops; i++) {
    const r = await probe(current, ua);
    hops.push(r);
    if (r.status >= 300 && r.status < 400 && r.location) {
      current = new URL(r.location, current).toString();
      continue;
    }
    break;
  }
  return hops;
}

/** Run `tasks` (thunks) two at a time. */
async function pool(tasks, width = 2) {
  let i = 0;
  const workers = Array.from({ length: width }, async () => {
    while (i < tasks.length) await tasks[i++]();
  });
  await Promise.all(workers);
}

const isNoindex = (values) => values.some((v) => /\bnoindex\b/i.test(v));

/* ── L1  a dynamic route must never answer 200 for input it cannot serve ────────────────────── */

async function L1() {
  const tasks = ROUTE_CONTRACT.filter((c) => c.probe).map((c) => async () => {
    const path = withNonce(c.probe, NONCE);
    const hops = await chase(path);
    const last = hops[hops.length - 1];

    if (last.error) return fail('L1', path, `request failed: ${last.error}`);

    const allowed = new Set(c.missing);
    // A redirect is only acceptable if the contract says so AND it terminates.
    const redirected = hops.length > 1;
    if (!allowed.has(hops[0].status) && !(redirected && allowed.has(hops[0].status))) {
      if (hops[0].status === 200 && c.noindex200Ok && isNoindex(last.robots ?? [])) {
        // Documented exception: an unguessable, unlinked, noindex token page. Still asserted to be
        // noindex on every run, so it cannot quietly become indexable.
        return;
      }
      if (hops[0].status === 200) {
        return fail(
          'L1',
          path,
          `HTTP 200 for a ${c.route} segment that cannot exist — a SOFT 404 over an unbounded slug ` +
            `space.\n        title: ${JSON.stringify((last.title || '').slice(0, 70))}` +
            `\n        robots: ${JSON.stringify(last.robots || [])}` +
            `\n        canonical: ${JSON.stringify((last.canonicals || []).map(rel))}` +
            `\n        cache-control: ${last.cacheControl}` +
            (last.metaRefresh ? `\n        + <meta http-equiv="refresh"> — a redirect that never was` : '') +
            `\n        contract allows: ${c.missing.join(' / ')}`
        );
      }
      return fail('L1', path, `HTTP ${hops[0].status}; contract allows ${c.missing.join(' / ')}`);
    }

    // If it redirected, it must land somewhere terminal or valid — never on a hub, never on a 404
    // reached through a hop, and never in more than 2 hops.
    if (redirected) {
      if (hops.length - 1 > 2) fail('L1', path, `${hops.length - 1} redirect hops`);
      if (last.status === 200 && HUBS.has(rel(last.url))) {
        fail('L1', path, `redirects to the hub ${rel(last.url)} — Google reads that as a soft 404`);
      }
    }
  });
  await pool(tasks);
}

/* ── L2  browser and Googlebot must agree ───────────────────────────────────────────────────── */

async function L2() {
  const paths = [
    ...STATIC_PAGES,
    ...ROUTE_CONTRACT.filter((c) => c.sample).map((c) => c.sample),
    ...ROUTE_CONTRACT.filter((c) => c.probe).map((c) => withNonce(c.probe, NONCE)),
  ];
  const tasks = paths.map((p) => async () => {
    const [b, g] = [await probe(p, BROWSER), await probe(p, GOOGLEBOT)];
    if (b.error || g.error) return;
    if (b.status !== g.status) {
      fail('L2', p, `status differs by user-agent: browser ${b.status}, Googlebot ${g.status}`);
    }
    if (b.status === 200 && g.status === 200) {
      const bi = isNoindex(b.robots ?? []);
      const gi = isNoindex(g.robots ?? []);
      if (bi !== gi) {
        fail(
          'L2',
          p,
          `indexability differs by user-agent: browser ${JSON.stringify(b.robots)}, ` +
            `Googlebot ${JSON.stringify(g.robots)}`
        );
      }
    }
  });
  await pool(tasks);
}

/* ── L3  the same URL must answer the same way twice ────────────────────────────────────────── */

async function L3() {
  // Three passes. Nondeterministic indexability is what a metadata catch-fallback produces, and it
  // is invisible to any check that fetches once: /blog/tag/whey returned noindex, noindex, then
  // "index, follow" on three consecutive fetches, from a CDN BYPASS, i.e. from the origin.
  const paths = [...STATIC_PAGES.slice(0, 6), ...ROUTE_CONTRACT.filter((c) => c.sample).map((c) => c.sample)];
  const tasks = paths.map((p) => async () => {
    const seen = [];
    for (let i = 0; i < 3; i++) {
      const r = await probe(p);
      if (r.error) return;
      seen.push({ status: r.status, robots: (r.robots ?? []).join('|'), canonical: (r.canonicals ?? []).map(rel).join('|') });
    }
    const uniq = [...new Set(seen.map((s) => JSON.stringify(s)))];
    if (uniq.length > 1) {
      fail('L3', p, `answer changed between identical requests:\n        ` + uniq.join('\n        '));
    }
  });
  await pool(tasks);
}

/* ── L4  every indexable 200 carries exactly one clean self-canonical ───────────────────────── */

async function L4() {
  const paths = [...STATIC_PAGES, ...ROUTE_CONTRACT.filter((c) => c.sample && c.indexable).map((c) => c.sample)];
  const tasks = paths.map((p) => async () => {
    const r = await probe(p);
    if (r.error || r.status !== 200) {
      if (!r.error) fail('L4', p, `expected HTTP 200, got ${r.status}`);
      return;
    }
    if (isNoindex(r.robots ?? []) || /noindex/i.test(r.xRobots)) {
      return fail('L4', p, `a page that is meant to be indexable is noindex (${[...(r.robots ?? []), r.xRobots].filter(Boolean).join(', ')})`);
    }
    const cans = r.canonicals ?? [];
    if (cans.length === 0) return fail('L4', p, 'no rel=canonical');
    if (cans.length > 1) return fail('L4', p, `${cans.length} rel=canonical tags: ${cans.map(rel).join(', ')}`);
    if ((r.robots ?? []).length > 1) {
      fail('L4', p, `${r.robots.length} <meta name="robots"> tags: ${JSON.stringify(r.robots)}`);
    }

    const c = cans[0];
    if (!/^https:\/\//i.test(c)) fail('L4', p, `canonical is not an absolute https URL: ${c}`);
    if (/^https?:\/\/www\./i.test(c)) fail('L4', p, `canonical points at the www host: ${c}`);
    if (/\/$/.test(new URL(c, BASE).pathname) && new URL(c, BASE).pathname !== '/') {
      fail('L4', p, `canonical has a trailing slash: ${c}`);
    }
  });
  await pool(tasks);
}

/* ── L5  a canonical must resolve to a 200 that points at itself ────────────────────────────── */

async function L5() {
  const paths = ROUTE_CONTRACT.filter((c) => c.sample && c.indexable).map((c) => c.sample);
  const tasks = paths.map((p) => async () => {
    const r = await probe(p);
    if (r.error || r.status !== 200 || !(r.canonicals ?? []).length) return;
    const target = r.canonicals[0];
    if (rel(target) === rel(p)) return; // self-canonical, nothing to chase
    const hops = await chase(target);
    const last = hops[hops.length - 1];
    if (last.error) return;
    if (last.status !== 200) {
      return fail('L5', p, `canonical ${rel(target)} answers ${last.status} — it nominates a page that does not exist`);
    }
    if (hops.length > 1) {
      fail('L5', p, `canonical ${rel(target)} redirects (${hops.length - 1} hop) — nominate the final URL directly`);
    }
    const theirs = (last.canonicals ?? [])[0];
    if (theirs && rel(theirs) !== rel(last.url)) {
      fail('L5', p, `canonical chain: ${rel(p)} → ${rel(target)} → ${rel(theirs)}`);
    }
  });
  await pool(tasks);
}

/* ── L6  machine prefixes: disallowed AND noindex, and never a 200 to a crawler ─────────────── */

async function L6() {
  const robotsTxt = await (await fetch(BASE + '/robots.txt', { signal: AbortSignal.timeout(30_000) })).text();
  for (const prefix of MACHINE_PREFIXES) {
    const bare = prefix.replace(/\/$/, '');
    if (!new RegExp(`^Disallow:\\s*${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?\\s*$`, 'im').test(robotsTxt)) {
      fail('L6', '/robots.txt', `does not Disallow ${prefix}`);
    }
  }
  const tasks = [
    ['/api-proxy/blog_tags', 'noindex header'],
    ['/x-crawler/shop', 'terminal'],
    [`/x-crawler/category/whey-proteine`, 'terminal'],
  ].map(([p, kind]) => async () => {
    const r = await probe(p);
    if (r.error) return;
    if (kind === 'terminal') {
      if (!TERMINAL.has(r.status)) {
        /*
         * ADVISORY. Refusing /x-crawler in middleware WAS implemented, and it 404'd every
         * category and product page to Googlebot — the rewrite re-entered middleware on a cold
         * cache, so the guard could not tell "someone asked for the internal path" from "we sent
         * them there". See the long note in middleware.ts. robots.txt's Disallow is the defence.
         */
        note(`L6 advisory: ${p} answers ${r.status} when requested directly. Only robots.txt keeps it out; a middleware refusal was tried and 404'd the whole site to Googlebot.`);
      }
    } else if (!/noindex/i.test(r.xRobots)) {
      /*
       * ADVISORY, NOT A FAILURE, AND THE DISTINCTION IS LOAD-BEARING.
       *
       * next.config.js DOES declare `X-Robots-Tag: noindex, nofollow` for /api-proxy/:path*, and
       * it does not arrive. Measured 18/08/2026: the response carries `x-served-by:
       * admin.protein.tn`, `server: cloudflare`, `x-powered-by: PHP/8.3.33` — /api-proxy/:path*
       * rewrites to a DIFFERENT ORIGIN, and Next does not attach its headers to a response it
       * only proxied.
       *
       * Middleware could add it, but `api-proxy/` is deliberately excluded from the matcher so
       * that real API traffic does not pay for a middleware pass. So the enforceable lever here
       * is the robots.txt Disallow above (which IS a hard failure), and the header would have to
       * be set by the Laravel app. Failing the build over something this file cannot fix would
       * only teach people to ignore it.
       */
      note(`L6 advisory: ${p} has no X-Robots-Tag: noindex. The next.config rule exists but /api-proxy rewrites to a different origin, so Next cannot attach headers — the backend would have to send it. The robots.txt Disallow is enforced above.`);
    }
  });
  await pool(tasks);
}

/* ── L7  nothing noindex or non-200 may be in the sitemap ───────────────────────────────────── */

async function L7() {
  const index = await (await fetch(BASE + '/sitemap.xml', { signal: AbortSignal.timeout(60_000) })).text();
  const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (children.length === 0) return fail('L7', '/sitemap.xml', 'the sitemap index lists no children');

  const all = [];
  for (const child of children) {
    const xml = await (await fetch(child, { signal: AbortSignal.timeout(90_000) })).text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) all.push(m[1]);
  }
  note(`sitemap: ${children.length} children, ${all.length} URLs`);

  // Sample rather than crawl: 5,700 URLs at concurrency 2 is an hour, and the failure modes here
  // are systematic (a whole section wrong), not per-URL.
  const step = Math.max(1, Math.floor(all.length / 40));
  const sample = all.filter((_, i) => i % step === 0).slice(0, 40);
  const tasks = sample.map((u) => async () => {
    const hops = await chase(u);
    const last = hops[hops.length - 1];
    if (last.error) return;
    if (hops[0].status !== 200) {
      return fail('L7', rel(u), `sitemap URL answers ${hops[0].status}${hops.length > 1 ? ` → ${last.status} ${rel(last.url)}` : ''} — a sitemap must list final, 200 URLs only`);
    }
    if (isNoindex(last.robots ?? []) || /noindex/i.test(last.xRobots)) {
      return fail('L7', rel(u), 'sitemap URL is noindex — "Submitted URL marked noindex" by construction');
    }
    const c = (last.canonicals ?? [])[0];
    if (c && rel(c) !== rel(u)) {
      fail('L7', rel(u), `sitemap URL canonicalises elsewhere (${rel(c)}) — submit the canonical, not the duplicate`);
    }
  });
  await pool(tasks);
}

/* ── L8  noindex pages must stay crawlable; dead URL classes must be terminal ───────────────── */

async function L8() {
  const robotsTxt = await (await fetch(BASE + '/robots.txt', { signal: AbortSignal.timeout(30_000) })).text();
  const disallowed = [...robotsTxt.matchAll(/^Disallow:\s*(\S+)\s*$/gim)].map((m) => m[1]);

  const tasks = [
    ...NOINDEX_PAGES.map((p) => async () => {
      const r = await probe(p);
      if (r.error) return;
      if (r.status === 200 && !isNoindex(r.robots ?? []) && !/noindex/i.test(r.xRobots)) {
        fail('L8', p, 'a transactional/private page that is not noindex');
      }
      // Blocking a page that already says noindex prevents Google from ever SEEING the noindex.
      const blocked = disallowed.some((d) => d !== '/' && p.startsWith(d.replace(/\/$/, '')));
      if (blocked && r.status === 200 && isNoindex(r.robots ?? [])) {
        note(`L8 advisory: ${p} is BOTH noindex and robots.txt-disallowed. Google cannot crawl it to see the noindex, so an already-indexed copy can never drop out. robots.ts already documents this trade for the faceted /shop params.`);
      }
    }),
    ...MUST_BE_TERMINAL.map((p) => async () => {
      const hops = await chase(p);
      const last = hops[hops.length - 1];
      if (last.error) return;
      if (!TERMINAL.has(hops[0].status)) {
        const landed = hops.length > 1 ? ` → ${last.status} ${rel(last.url)}` : '';
        const soft = hops.length > 1 && last.status === 200 && HUBS.has(rel(last.url));
        fail(
          'L8',
          p,
          `HTTP ${hops[0].status}${landed} — a dead URL class must be 404 or 410.` +
            (soft ? ' Redirecting it to a hub is a soft 404: the hop is spent and the URL is never retired.' : '') +
            (hops[0].status >= 500 ? ' A 5xx is the worst answer — Google treats it as temporary and keeps retrying.' : '')
        );
      }
    }),
  ];
  await pool(tasks);
}

/* ── run ────────────────────────────────────────────────────────────────────────────────────── */

const RULES = [
  ['L1', 'no dynamic route answers 200 for input it cannot serve', L1],
  ['L2', 'browser and Googlebot agree on status and indexability', L2],
  ['L3', 'the same URL answers the same way twice', L3],
  ['L4', 'every indexable 200 has exactly one clean self-canonical', L4],
  ['L5', 'every canonical resolves to a 200 that points at itself', L5],
  ['L6', 'machine endpoints are disallowed, noindexed and unreachable', L6],
  ['L7', 'the sitemap lists only final, 200, indexable, self-canonical URLs', L7],
  ['L8', 'private pages stay crawlable; dead URL classes are terminal', L8],
];

console.log(`URL contract — live check against ${BASE}  (nonce ${NONCE})\n`);
for (const [id, label, fn] of RULES) {
  if (!on(id)) continue;
  const before = failures.length;
  process.stdout.write(`  ${id}  ${label} … `);
  try {
    await fn();
  } catch (e) {
    fail(id, '(rule)', `the check itself threw: ${e.message}`);
  }
  const n = failures.length - before;
  console.log(n === 0 ? 'ok' : `${n} violation${n > 1 ? 's' : ''}`);
}

if (notes.length) {
  console.log('');
  for (const n of notes) console.log(`  · ${n}`);
}

if (failures.length === 0) {
  console.log(`\n✓ all rules pass\n`);
  process.exit(0);
}

console.log(`\n${'─'.repeat(96)}`);
for (const f of failures) console.log(`\n[${f.rule}] ${f.url}\n        ${f.msg}`);
console.log(`\n${failures.length} violation${failures.length > 1 ? 's' : ''}\n`);
process.exit(1);
