/**
 * Prove the Cloudflare cache rules are (a) working and (b) not serving the wrong body type.
 *
 * ── THE FAILURE THIS EXISTS TO CATCH ──────────────────────────────────────────────────────
 * Cloudflare honours `Vary` only for `Accept-Encoding` — it ignores every other Vary header. Two
 * different origin responses therefore collapse onto one cache entry, and whichever request
 * arrives FIRST decides what every later visitor receives. This bites protein.tn on two axes:
 *
 *   1. `Vary: rsc, next-router-state-tree, …` — Next serves the SAME URL as either an HTML
 *      document or an RSC flight payload. Cross-contamination means a browser asking for a page
 *      gets React data and paints a blank screen, or the client router gets HTML and navigation
 *      dies. Handled by excluding those headers in the cache rule.
 *
 *   2. `Vary: Accept` on /_next/image — the optimizer picks AVIF / WebP / JPEG from the Accept
 *      header. Cross-contamination means an AVIF-capable phone is served a 3x larger JPEG, or —
 *      worse — a browser too old for AVIF is served AVIF and paints a BROKEN IMAGE.
 *
 * A `cf-cache-status: HIT` therefore proves nothing on its own. Every request below is checked for
 * the BODY IT ACTUALLY RECEIVED as well as its cache status, which is the only assertion that
 * distinguishes "caching works" from "caching is corrupting the site".
 *
 * ── THIS SCRIPT ONCE CAUSED THE BUG IT IS MEANT TO CATCH ───────────────────────────────────
 * The first version sent no `Accept` header, so Node defaulted to a bare wildcard. It pulled the
 * image URL out of `href="/_next/image?…"` — which is the HERO PRELOAD, i.e. the mobile LCP
 * element — and requested it twice. Next correctly answered JPEG, because a bare wildcard
 * advertises no modern format. Cloudflare cached that, and the homepage LCP image was served to
 * every visitor as an 80 kB JPEG instead of a ~50 kB AVIF, under `max-age=2592000` — THIRTY DAYS.
 *
 * Hence the rule now baked in below: A VERIFIER MUST SEND WHAT A BROWSER SENDS. `ACCEPT_HTML` and
 * `ACCEPT_IMAGE` are copied from real Chrome, `get()` requires one of them, and there is no code
 * path that omits Accept. The format assertion added in section 6 is the regression test for the
 * damage this script did.
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

// Verbatim from Chrome 120. Never simplify these to a bare `*/*` wildcard — that is precisely
// what poisoned the hero cache entry to JPEG. See the header comment.
const ACCEPT_HTML =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
const ACCEPT_IMAGE = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';

/**
 * `accept` is REQUIRED, not defaulted. A default is exactly how the hero got poisoned: the caller
 * forgets, the tool sends something no browser sends, and the reply it caches is one no browser
 * wanted. Making it explicit forces every call site to state which client it is imitating.
 */
async function get(path, accept, headers = {}) {
  if (!accept) throw new Error(`get(${path}) called without an Accept header — see the header comment`);
  const res = await fetch(`${BASE}${path}`, { headers: { 'user-agent': UA, accept, ...headers } });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    cache: res.headers.get('cf-cache-status') ?? '—',
    age: res.headers.get('age') ?? '—',
    type: res.headers.get('content-type') ?? '',
    timing: res.headers.get('server-timing') ?? '',
    bytes: buf.length,
    body: buf.toString('utf8'),
  };
}

/** An RSC flight payload is a line-oriented format ("0:…", "1:…"); a document starts with a doctype. */
const isHtml = (b) => /^\s*<!DOCTYPE html/i.test(b);
const isFlight = (b) => /^\s*\d+:/.test(b);

console.log(`\n══ edge cache · ${BASE} ══\n`);

// ── 1. The document, twice. The second must be served from the edge. ─────────────────────────
console.log('  HTML document');
const doc1 = await get('/', ACCEPT_HTML);
const doc2 = await get('/', ACCEPT_HTML);
check('first request is cacheable (not DYNAMIC)', doc1.cache !== 'DYNAMIC', `cf-cache-status: ${doc1.cache}`);
check('second request is a HIT', doc2.cache === 'HIT', `cf-cache-status: ${doc2.cache}, age ${doc2.age}`);
check('…and it is still HTML', isHtml(doc2.body), doc2.type);
check('…and it is not a React payload', !isFlight(doc2.body));

// ── 2. THE DANGEROUS ONE. An RSC request must NOT be answered from the HTML cache. ───────────
console.log('\n  RSC / router request (the one that can break the site)');
const rsc = await get('/', ACCEPT_HTML, { RSC: '1' });
check('bypasses the cache', rsc.cache === 'BYPASS' || rsc.cache === 'DYNAMIC', `cf-cache-status: ${rsc.cache}`);
check(
  'returns a React payload, NOT the cached HTML',
  !isHtml(rsc.body),
  `${rsc.type} · starts "${rsc.body.slice(0, 24).replace(/\n/g, ' ')}"`,
);

const prefetch = await get('/', ACCEPT_HTML, { RSC: '1', 'Next-Router-Prefetch': '1' });
check('prefetch request also bypasses', prefetch.cache === 'BYPASS' || prefetch.cache === 'DYNAMIC', `cf-cache-status: ${prefetch.cache}`);

// ── 3. And a normal request AFTER the RSC ones still gets HTML. ──────────────────────────────
console.log('\n  document again, after the RSC requests');
const doc3 = await get('/', ACCEPT_HTML);
check('still HTML (RSC response did not poison the cache)', isHtml(doc3.body), `cf-cache-status: ${doc3.cache}`);

// ── 4. Personalised routes must never be cached. ─────────────────────────────────────────────
console.log('\n  routes that must NOT be cached');
for (const p of ['/checkout', '/account', '/cart', '/login']) {
  const r = await get(p, ACCEPT_HTML);
  check(`${p} not served from cache`, r.cache !== 'HIT', `cf-cache-status: ${r.cache}`);
}

// ── 5. Static assets (the owner's own rule 3). ───────────────────────────────────────────────
console.log('\n  static assets');
const cssHref = (doc1.body.match(/href="(\/_next\/static\/css\/[^"]+)"/) || [])[1];
if (cssHref) {
  await get(cssHref, 'text/css,*/*;q=0.1');
  const css = await get(cssHref, 'text/css,*/*;q=0.1');
  check('stylesheet is a HIT', css.cache === 'HIT', `cf-cache-status: ${css.cache}`);
}

// ── 6. Optimized images — cached AND in the right format. ────────────────────────────────────
// The format assertion is the whole point. `Vary: Accept` is ignored by Cloudflare, so a single
// request from any client that does not advertise AVIF (a crawler, a curl, a monitoring probe, an
// older in-app browser) can pin this URL to JPEG for the full 30-day TTL — for everyone.
console.log('\n  optimized images (format, not just cache status)');
const heroSrc = (doc1.body.match(/rel="preload"[^>]*?as="image"[^>]*?href="(\/_next\/image\?[^"]+)"/) || [])[1]?.replace(/&amp;/g, '&');
const anySrc = (doc1.body.match(/(\/_next\/image\?url=[^"'\s>]+)/) || [])[1]?.replace(/&amp;/g, '&');
const imgSrc = heroSrc ?? anySrc;

if (imgSrc) {
  await get(imgSrc, ACCEPT_IMAGE);
  const img = await get(imgSrc, ACCEPT_IMAGE);
  check('optimized image is a HIT', img.cache === 'HIT', `cf-cache-status: ${img.cache}`);
  check(
    'served as AVIF to an AVIF-capable phone',
    img.type === 'image/avif',
    `${img.type} · ${Math.round(img.bytes / 1024)} kB${img.type !== 'image/avif' ? ' — cache entry is pinned to the wrong format, PURGE THIS URL' : ''}`,
  );
  if (heroSrc) console.log(`         (this is the hero preload = the mobile LCP element)`);
}

// ── 7. Prove ONLY AVIF can ever enter the image cache. ───────────────────────────────────────
// THE DESIGN THIS TESTS. Cloudflare Free has no way to put `Accept` into the cache key: custom
// cache keys are Enterprise, dynamic Rewrite URL rules are Pro+, and Snippets are not available on
// this account either. So instead of separating the formats, the cache rule ADMITS ONLY ONE of
// them: `/_next/image` is Eligible for cache *only when the request advertises AVIF*. Every other
// client — WebP-only, legacy, crawler, curl — misses the rule and goes to the origin, which
// negotiates correctly as it always did.
//
// Poisoning then becomes impossible rather than merely unlikely: the only requests that can ever
// populate an entry are the ones that produce AVIF, so the only thing an entry can ever contain is
// AVIF. That is a stronger guarantee than the format-in-the-cache-key design it replaces, and it
// costs the ~5% of traffic without AVIF support their edge cache hit.
//
// Safe to run unconditionally: the legacy request below cannot cache, which is the point.
console.log('\n  only AVIF may enter the image cache');
{
  const thumb = [...doc1.body.matchAll(/(\/_next\/image\?url=[^"'\s>]+)/g)]
    .map((m) => m[1].replace(/&amp;/g, '&'))
    .find((u) => u !== heroSrc);

  if (!thumb) {
    console.log('   —     no non-hero image found to probe');
  } else {
    await get(thumb, ACCEPT_IMAGE);
    const modern = await get(thumb, ACCEPT_IMAGE);
    const legacy = await get(thumb, 'image/png,image/*'); // no AVIF, no WebP
    const modernAgain = await get(thumb, ACCEPT_IMAGE);

    check('an AVIF client is cached at the edge', modern.cache === 'HIT', `cf-cache-status: ${modern.cache}`);
    check('…and receives AVIF', modern.type === 'image/avif', modern.type);
    check(
      'a legacy client is NOT cached (so it can never poison)',
      legacy.cache !== 'HIT',
      `cf-cache-status: ${legacy.cache}${legacy.cache === 'HIT' ? ' — the AVIF condition is missing from the image cache rule' : ''}`,
    );
    check('…and receives a format it can actually decode', legacy.type !== 'image/avif', legacy.type);
    check(
      'the legacy request did not displace the AVIF entry',
      modernAgain.type === 'image/avif',
      `${modernAgain.type}${modernAgain.type !== 'image/avif' ? ' — PURGE this URL' : ''}`,
    );
  }
}

console.log(`\n  origin timing on the first (uncached) request: ${doc1.timing || '—'}`);
console.log(`\n=== ${failures} failure(s) ===\n`);
process.exit(failures > 0 ? 1 : 0);
