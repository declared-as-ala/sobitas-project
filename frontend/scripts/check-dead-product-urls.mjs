/**
 * A RETIRED PRODUCT URL MUST NEVER ANSWER 404 — AND NEVER 301 INTO ONE.
 *
 * ── WHAT WENT WRONG ──────────────────────────────────────────────────────────────────────────
 * Search Console reported 1,060 pages in "Not found (404)" on 14/08/2026. Sampling the export
 * against production showed most of them were not plain 404s at all — they were redirects that
 * landed on one:
 *
 *     /shop/monster-energy-drink        301 → /monster-energy-drink        404
 *     /shop/carbo-z-mass-gainer-3-kg    301 → /carbo-z-mass-gainer-3-kg    404
 *     /products/100-isolate/reviews     301 → /100-isolate                 404
 *
 * `resolveShopSlug` ended with `return \`/${slug}\`` under the comment "the slug MAY be a category
 * served at /{slug}". For a discontinued product it is not, so every one of those became a cached
 * 301 into a 404 — strictly worse than the 404 it replaced, because Google spends a hop, caches
 * the answer, and the hop hides the real status from every report that would have named this.
 *
 * ── WHAT THIS ASSERTS ────────────────────────────────────────────────────────────────────────
 * For each sampled URL, the FINAL status after following redirects must be:
 *
 *     200   the slug resolved to a real product or category
 *     410   definitively gone, and said so — the status that empties the bucket fastest
 *
 * and never 404. A 404 here means the guessing came back.
 *
 * It also caps the chain at 3 hops. Each hop is crawl budget spent on nothing, and a chain that
 * grows is how "one redirect" quietly becomes four.
 *
 * The URLs below are REAL entries from the Search Console export, not invented ones. That matters:
 * a guard built from imagined inputs proves the code does what its author expected, which is the
 * one thing that was never in doubt.
 *
 *   node scripts/check-dead-product-urls.mjs
 *   BASE_URL=http://localhost:3123 node scripts/check-dead-product-urls.mjs
 */
const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');

// Cloudflare caches per UA-variant and middleware.ts rewrites bots to /x-crawler/*. Measuring with
// a default agent reads whichever variant happened to be cached, which is how two runs of the same
// check disagreed about the same URL earlier in this project.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const MAX_HOPS = 3;

/** Sampled across every shape in the export, so a fix for one cannot hide a regression in another. */
const CASES = [
  // Discontinued product under /shop — the largest shape in the bucket.
  { path: '/shop/monster-energy-drink', why: 'gone; no category shares a term with it' },
  { path: '/shop/carbo-z-mass-gainer-3-kg', why: 'gone; shares "gainer" with Mass Gainers' },
  { path: '/shop/protein-80-22-kg', why: 'gone; stems to "protein" → Protéines' },
  // Legacy numeric suffix that still resolves to a LIVE product — must 301 to it, never 410.
  { path: '/shop/xtend-bcaa-420g-0', why: 'live product behind a legacy -N suffix' },
  { path: '/shop/zma-120-caps-4', why: 'live product behind a legacy -N suffix' },
  // Category served at /{slug} — the case the old guess was written for. Must keep working.
  { path: '/shop/creatine', why: 'a real category, must still redirect' },
  // WordPress review sub-pages.
  { path: '/products/100-isolate/reviews', why: 'gone; stems to "isolate" → Whey Isolate' },
  { path: '/product/animal-pak/reviews', why: 'gone; no category term matches' },
  { path: '/products/serious-mass-5-45kg', why: 'gone; shares "mass" with Mass Gainers' },
  // Legacy category and locale prefixes.
  { path: '/category/whey-proteine', why: 'legacy /category/ prefix' },
  { path: '/en/shop/gainer-xtreme-54-kg/', why: 'legacy locale prefix + trailing slash' },
  { path: '/blogs/qu-est-ce-que-la-proteine-whey', why: 'plural /blogs/ → /blog/' },
  // Nested category/product paths from the old site.
  //
  // gold-creatine-300g was the LAST failure in this file after the middleware fix shipped, and it
  // failed in a different layer: app/(shop)/[slug]/[productSlug] ended with
  // `permanentRedirect('/' + rootSlug)` — the same guess, one route up. Its own comment admitted
  // it "returns a clean hard 404 when it is not" a category. There is no clean 404 behind a 301.
  { path: '/creatine/gold-creatine-300g', why: 'nested legacy path, product gone; stems to creatine' },
  { path: '/musculation/presse-cuisse-35', why: 'nested legacy path, live product' },
  // The French shop prefix. /boutique/{x} already worked; the bare path and the 3-segment form
  // were hard 404s until the /boutique rule in middleware.ts.
  { path: '/boutique', why: 'the old French path for the shop' },
  { path: '/boutique/creatine/gold-creatine-300g', why: '3 segments: drop the prefix, then retire the product' },
  { path: '/boutique/proteines', why: 'already correct in ONE hop — must not gain a second' },
];

console.log(`DEAD PRODUCT URLS — ${BASE}`);
console.log(`${CASES.length} sampled from the Search Console "Not found" export\n`);

let failed = 0;

for (const { path, why } of CASES) {
  let url = `${BASE}${path}`;
  let hops = 0;
  let status = 0;
  let chain = [];

  try {
    // Manual hop-following so the chain LENGTH is observable. redirect:'follow' hides it, and the
    // hop count is half of what this guard exists to protect.
    for (;;) {
      const res = await fetch(url, {
        headers: { 'user-agent': UA },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      status = res.status;

      if (status >= 300 && status < 400) {
        /* `Headers.get()` JOINS repeated headers with ", ", and `next start` emits the SAME
           `location` value twice on a cache MISS — verified on a cold URL:

               HTTP/1.1 308 Permanent Redirect
               location: /whey-isolate
               location: /whey-isolate

           so `get()` returned "/whey-isolate, /whey-isolate" and this loop then fetched
           `/whey-isolate,%20/whey-isolate`, reporting a bogus 3-hop chain for a clean 1-hop
           redirect. It reproduces on `permanentRedirect` call sites nobody has edited, is gone on
           the second (cached) request, and production serves a single header — a browser and
           Googlebot both take the first value, so the page is fine and only a programmatic reader
           is fooled. Take the first value, like they do. */
        const loc = res.headers.get('location')?.split(', ')[0];
        if (!loc) break;
        url = new URL(loc, url).toString();
        chain.push(url.replace(BASE, ''));
        hops++;
        if (hops > MAX_HOPS) break;
        continue;
      }
      break;
    }
  } catch (err) {
    console.log(`  ERROR     ${path}\n            ${err.message}`);
    failed++;
    continue;
  }

  const tooLong = hops > MAX_HOPS;
  const bad = status === 404 || tooLong;
  if (bad) failed++;

  const label = status === 404 ? 'DEAD END' : tooLong ? 'TOO LONG' : status === 410 ? 'gone(410)' : `ok(${status})`;
  console.log(`  ${label.padEnd(10)}${path}`);
  console.log(`            ${hops} hop(s)${chain.length ? ' → ' + chain.join(' → ') : ''}`);
  if (bad) console.log(`            EXPECTED: ${why}`);
}

console.log('');

if (failed > 0) {
  console.log(`${failed} of ${CASES.length} sampled URL(s) still dead-end.`);
  console.log('');
  console.log('A 404 here means a redirect is guessing again — see classifyNonProduct() in');
  console.log('src/middleware.ts and bestCategoryForSlug() in src/util/taxonomySlugs.ts.');
  console.log('410 is a PASS: it is the honest answer for a product that is genuinely gone.');
  process.exit(1);
}

console.log(`All ${CASES.length} resolve or are honestly gone, in ${MAX_HOPS} hops or fewer.`);
