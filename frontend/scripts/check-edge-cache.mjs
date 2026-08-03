/**
 * Prove the Cloudflare cache rules are (a) working and (b) not serving the wrong body type.
 *
 * ── THE FAILURE THIS EXISTS TO CATCH ──────────────────────────────────────────────────────
 * Next.js serves the SAME URL as either an HTML document or an RSC (React) flight payload,
 * chosen by request headers, and advertises that with `Vary: rsc, next-router-state-tree, …`.
 * Cloudflare honours `Vary` only for `Accept-Encoding` — it ignores the rest. So if the edge ever
 * caches one representation and replays it for the other, the storefront breaks in a way that is
 * invisible to an uptime check: a browser asking for a page receives React flight data and paints
 * a blank screen, or the client router receives HTML and navigation dies.
 *
 * A `cf-cache-status: HIT` therefore proves nothing on its own. Every request below is checked for
 * the BODY IT ACTUALLY RECEIVED as well as its cache status, which is the only assertion that
 * distinguishes "caching works" from "caching is corrupting the site".
 *
 *   node scripts/check-edge-cache.mjs [--base https://protein.tn]
 */
const argv = process.argv.slice(2);
const one = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const BASE = one('base', 'https://protein.tn').replace(/\/$/, '');

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

const UA = 'Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'user-agent': UA, ...headers } });
  const body = await res.text();
  return {
    status: res.status,
    cache: res.headers.get('cf-cache-status') ?? '—',
    age: res.headers.get('age') ?? '—',
    type: res.headers.get('content-type') ?? '',
    timing: res.headers.get('server-timing') ?? '',
    body,
  };
}

/** An RSC flight payload is a line-oriented format ("0:…", "1:…"); a document starts with a doctype. */
const isHtml = (b) => /^\s*<!DOCTYPE html/i.test(b);
const isFlight = (b) => /^\s*\d+:/.test(b);

console.log(`\n══ edge cache · ${BASE} ══\n`);

// ── 1. The document, twice. The second must be served from the edge. ─────────────────────────
console.log('  HTML document');
const doc1 = await get('/');
const doc2 = await get('/');
check('first request is cacheable (not DYNAMIC)', doc1.cache !== 'DYNAMIC', `cf-cache-status: ${doc1.cache}`);
check('second request is a HIT', doc2.cache === 'HIT', `cf-cache-status: ${doc2.cache}, age ${doc2.age}`);
check('…and it is still HTML', isHtml(doc2.body), doc2.type);
check('…and it is not a React payload', !isFlight(doc2.body));

// ── 2. THE DANGEROUS ONE. An RSC request must NOT be answered from the HTML cache. ───────────
console.log('\n  RSC / router request (the one that can break the site)');
const rsc = await get('/', { RSC: '1' });
check('bypasses the cache', rsc.cache === 'BYPASS' || rsc.cache === 'DYNAMIC', `cf-cache-status: ${rsc.cache}`);
check('returns a React payload, NOT the cached HTML', !isHtml(rsc.body), `${rsc.type} · starts "${rsc.body.slice(0, 24).replace(/\n/g, ' ')}"`);

const prefetch = await get('/', { RSC: '1', 'Next-Router-Prefetch': '1' });
check('prefetch request also bypasses', prefetch.cache === 'BYPASS' || prefetch.cache === 'DYNAMIC', `cf-cache-status: ${prefetch.cache}`);

// ── 3. And a normal request AFTER the RSC ones still gets HTML. ──────────────────────────────
console.log('\n  document again, after the RSC requests');
const doc3 = await get('/');
check('still HTML (RSC response did not poison the cache)', isHtml(doc3.body), `cf-cache-status: ${doc3.cache}`);

// ── 4. Personalised routes must never be cached. ─────────────────────────────────────────────
console.log('\n  routes that must NOT be cached');
for (const p of ['/checkout', '/account', '/cart', '/login']) {
  const r = await get(p);
  check(`${p} not served from cache`, r.cache !== 'HIT', `cf-cache-status: ${r.cache}`);
}

// ── 5. Static assets and optimized images (the owner's own rules 3 and 4). ───────────────────
console.log('\n  static assets');
const cssHref = (doc1.body.match(/href="(\/_next\/static\/css\/[^"]+)"/) || [])[1];
if (cssHref) {
  await get(cssHref);
  const css = await get(cssHref);
  check('stylesheet is a HIT', css.cache === 'HIT', `cf-cache-status: ${css.cache}`);
}
const imgSrc = (doc1.body.match(/href="(\/_next\/image\?url=[^"]+)"/) || [])[1]?.replace(/&amp;/g, '&');
if (imgSrc) {
  await get(imgSrc);
  const img = await get(imgSrc);
  check('optimized image is a HIT', img.cache === 'HIT', `cf-cache-status: ${img.cache}`);
}

console.log(`\n  origin timing on the first (uncached) request: ${doc1.timing || '—'}`);
console.log(`\n=== ${failures} failure(s) ===\n`);
process.exit(failures > 0 ? 1 : 0);
