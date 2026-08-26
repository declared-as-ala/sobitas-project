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

/**
 * BOTH AGENTS, EVERY CASE — AND THE REASON IS THE LAST BUG THIS FILE MISSED.
 *
 * The note that used to sit here was right about the mechanism and wrong about the conclusion. It
 * said Cloudflare caches per UA-variant and middleware rewrites bots to /x-crawler/*, and then
 * pinned a single Chrome UA so two runs could not disagree. Pinning one agent does not remove the
 * divergence, it just picks which half of it you are blind to — and it picked the half that does
 * not appear in Search Console.
 *
 * Measured on production 17/08/2026, with this file green:
 *
 *     /creatine/gold-creatine-300g                 Chrome 200   Googlebot 404
 *     /gainers/serious-mass-5-45kg                 Chrome 200   Googlebot 404
 *     /eaa/beef-aminos-200-tabs                    Chrome 200   Googlebot 404   (a LIVE product)
 *
 * `gold-creatine-300g` is a case in the list below, described in its own comment as "the LAST
 * failure in this file after the middleware fix shipped". It was still failing — for the only
 * visitor whose result is reported — and this guard could not see it, because the recovery lived
 * in app/(shop)/[slug]/[productSlug] and Googlebot is rewritten to x-crawler/product before it
 * gets there. Two routes, one of them unmeasured, is how they drifted.
 *
 * A case must now hold under BOTH agents. The bot variant is the one that matters for the report
 * this guard exists to drain, and asserting only the human variant is asserting the wrong thing.
 */
const AGENTS = [
  {
    name: 'browser',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  },
  {
    name: 'Googlebot',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
];

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

  /* ── THE SHAPES ONLY GOOGLEBOT EVER FAILED ────────────────────────────────────────────────
   *
   * All four were 200 to a browser and 404 to Googlebot on 17/08/2026, because the recovery lived
   * in app/(shop)/** and middleware rewrites bots to x-crawler/** before they reach it. They are
   * here as much for the AGENTS loop above as for themselves: run these under one UA and they pass
   * while Search Console keeps reporting them.
   */
  { path: '/eaa/beef-aminos-200-tabs', why: 'LIVE product (id=122) with no subcategory — /shop/{slug}, never 404' },
  { path: '/gainers/serious-mass-5-45kg', why: 'gone; shares "mass" with Mass Gainers' },
  { path: '/vitamines/vegan-vitamin-d3-k2-240-tablets-weightworld', why: 'gone; stems to Vitamines' },

  /* A ROOT-LEVEL product slug — the old site's flat URL shape. `(shop)/[slug]` probes category,
     brand and CMS page and never asked whether the slug was a PRODUCT, so this 404'd to BOTH
     agents while the product was live (API id=409). 17 rules in Filament → Redirections exist to
     paper over this class one URL at a time; it resolves now. */
  { path: '/citrulline-malate-210g-ostrovit', why: 'live product -> /citrulline/citrulline-malate-210g-ostrovit' },

  /* The brand list is read from a paginated endpoint, and the page cap was written when there were
     128 brands. There are 589. Everything from `Sunlipid` to `ZUMUB` read as NOT A BRAND, so a
     legacy /brand/ URL for one was answered 410 while its landing page returned 200. */
  { path: '/brand/Universal Nutrition/25', why: 'brand past the old 500-row cap -> /universal-nutrition' },

  /* ── A RETIRED CATEGORY IN FRONT OF A LIVE PRODUCT ────────────────────────────────────────
   *
   * The product is fine; the CATEGORY segment is an old taxonomy slug. app/(shop)/[slug]/
   * [productSlug] has always 301'd these onto the canonical, but middleware forwarded only the
   * product slug to the crawler view, so it could not see the segment and answered 200 — the same
   * product published at every address anyone had ever linked. Measured 17/08/2026:
   *
   *     /isolat-de-whey/iso-whey-2-27kg-muscletech   Chrome 308 -> canonical   Googlebot 200
   *
   * Only the two-agent loop above can catch this: under one UA it passes either way. */
  { path: '/isolat-de-whey/iso-whey-2-27kg-muscletech', why: 'retired category slug -> /whey-isolate/...' },
  { path: '/gainers-haute-energie/mass-gainer-zero-7kg-eric-favre', why: 'retired category slug -> /mass-gainers/...' },
  // The French shop prefix. /boutique/{x} already worked; the bare path and the 3-segment form
  // were hard 404s until the /boutique rule in middleware.ts.
  { path: '/boutique', why: 'the old French path for the shop' },
  { path: '/boutique/creatine/gold-creatine-300g', why: '3 segments: drop the prefix, then retire the product' },
  { path: '/boutique/proteines', why: 'already correct in ONE hop — must not gain a second' },

  /* ── THE HUB DUMPS ────────────────────────────────────────────────────────────────────────
   *
   * Every path below used to answer 308 -> /shop, /brands or /proteines, from a catch-all in
   * redirects.js. The final status was 200, so no check that reads only the status code could see
   * anything wrong — and 431 of the 2,938 URLs in the Search Console exports were in this state.
   *
   * Google documents a redirect to an irrelevant page as a soft 404: the hop is spent, the URL is
   * neither dropped nor indexed, it just moves from "Not found (404)" to "Page with redirect".
   * That is exactly the pair of numbers on this property, and it is why adding redirects had
   * stopped helping.
   *
   * `finalMustNotBeHub` below is what makes these cases mean something. Without it they all pass.
   */
  { path: '/category/whey-pro-warriors-2kg', why: 'a PRODUCT slug behind /category/ — 140 like it' },
  { path: '/category/ashwagandha', why: 'a real subcategory behind /category/' },
  { path: '/brand/BIOTECH USA/6', why: 'brand name with a space and a trailing id — 114 like it' },
  { path: '/brand/JX FITNESS/52', why: 'ditto; must reach /jx-fitness, not the brand index' },
  { path: '/brands/soul-project', why: 'already slugified, still dumped on the index' },
  { path: '/musculation-products/elliptical-trainer', why: 'old equipment prefix' },
  { path: '/produit/psychotic-pre-workout', why: 'French singular product prefix' },
  { path: '/produits/creatine-monohydrate', why: 'French plural; this one IS a category' },
  { path: '/produits-search/BCAA', why: 'the search term is the only content — must not be discarded' },
  { path: '/produits-search/GLUTAMINE', why: 'ditto; glutamine is a real listing' },
  { path: '/subcategories/proteines-pour-cheveux', why: 'old subcategory prefix' },
  { path: '/product-category/acides-amines/vitamines', why: 'WooCommerce nested taxonomy' },
  { path: '/collections/brule-graisse', why: 'Shopify-era prefix' },

  /* Machine paths from the previous Laravel deployment. They were plain 404s, which invites
     Google back forever; 410 is the status that empties the bucket. */
  { path: '/public/api/searchProduct/BCAA', why: 'old API path, permanently gone' },
  { path: '/public/api/page/16', why: 'ditto — 21 of these in the export' },

  /* Product API returned a definitive 404 for each on 26/08/2026. They were the residual
     /products/* and nested-product 404s after the generic resolver pass, and must now terminate
     as 410 even when the taxonomy cache is cold. */
  { path: '/products/amino-target-xplode-275-g', why: 'confirmed retired product slug' },
  { path: '/pre-workout/king-real-preworkout-500gr-real-pharm', why: 'confirmed retired nested product' },
  { path: '/cardio-fitness/ring-de-boxe', why: 'confirmed retired product from canonical-conflict export' },

  /* ── CASE ─────────────────────────────────────────────────────────────────────────────────
   *
   * Not a 404: MySQL's collation is case-insensitive, so the category RESOLVES and the page body
   * only then notices the canonical slug disagrees and redirects. Measured before the middleware
   * fold: /Creatine 308 in 5.9 s, /Proteines 308 in 16.8 s, /WHEY-ISOLATE no answer inside 45 s.
   * These assert the hop is still there — the point was never to stop redirecting, it was to stop
   * paying for a full category render first.
   */
  { path: '/Creatine', why: 'case fold must happen in middleware, not after a category render' },
  { path: '/WHEY-ISOLATE', why: 'ditto, shouting variant' },
];

/**
 * A destination that answers 200 while telling the visitor nothing about the URL they asked for.
 *
 * Landing here is the difference between "retired" and "retired honestly", and it is invisible to
 * a status-code check because the status is 200. Root is included: a redirect to the homepage is
 * the canonical example in Google's own soft-404 documentation.
 */
const HUBS = new Set(['/', '/shop', '/blog', '/brands', '/marques', '/categories']);

console.log(`DEAD PRODUCT URLS — ${BASE}`);
console.log(
  `${CASES.length} sampled from the Search Console "Not found" export, ` +
    `each under ${AGENTS.map((a) => a.name).join(' + ')}\n`
);

let failed = 0;

for (const { path, why } of CASES) {
  for (const agent of AGENTS) {
  const UA = agent.ua;
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
    console.log(`  ERROR     ${path}  [${agent.name}]\n            ${err.message}`);
    failed++;
    continue;
  }

  const tooLong = hops > MAX_HOPS;

  /* Landing on a hub is a SOFT 404 and the status code cannot see it. Two conditions, both needed:
     the URL actually moved (a request that never redirected and happens to BE /shop is /shop
     working), and the SOURCE carried a payload — a slug, an id, a search term.

     That second test is what separates a dump from a rename. `/boutique -> /shop` and
     `/blogs -> /blog` are single-segment index-to-index redirects: the old URL meant "the shop"
     and the new one is the shop, so nothing was thrown away. `/produit/psychotic-pre-workout ->
     /shop` names a product and answers with a catalogue. Only the second is a soft 404, and an
     assertion that cannot tell them apart is one that gets muted. */
  const carriedPayload = path.split('?')[0].split('/').filter(Boolean).length >= 2;
  const landed = chain.length ? chain[chain.length - 1].split('?')[0].replace(/\/$/, '') || '/' : null;
  const dumped = hops > 0 && carriedPayload && landed !== null && HUBS.has(landed);

  const bad = status === 404 || tooLong || dumped;
  if (bad) failed++;

  const label = status === 404
    ? 'DEAD END'
    : tooLong
      ? 'TOO LONG'
      : dumped
        ? 'HUB DUMP'
        : status === 410
          ? 'gone(410)'
          : `ok(${status})`;
  console.log(`  ${label.padEnd(10)}${path}  [${agent.name}]`);
  console.log(`            ${hops} hop(s)${chain.length ? ' → ' + chain.join(' → ') : ''}`);
  if (bad) console.log(`            EXPECTED: ${why}`);
  }
}

console.log('');

if (failed > 0) {
  console.log(`${failed} of ${CASES.length * AGENTS.length} sampled probe(s) do not end anywhere useful.`);
  console.log('');
  console.log('A row failing under Googlebot but not under browser means the two routes have');
  console.log('drifted: bots are REWRITTEN to x-crawler/{product,category} by middleware.ts, so a');
  console.log('recovery written only in app/(shop)/** never runs for them. Both pairs share');
  console.log('util/retiredSlug.ts — check that the failing route still calls it.');
  console.log('');
  console.log('DEAD END — a redirect is guessing again. See classifyNonProduct() in');
  console.log('src/middleware.ts and bestCategoryForSlug() in src/util/taxonomySlugs.ts.');
  console.log('HUB DUMP — the URL reached /shop, /brands or / and learned nothing. Google reads');
  console.log('that as a soft 404, so it stays out of the index exactly as a 404 would; check for');
  console.log('a new catch-all in redirects.js, which runs BEFORE middleware and wins.');
  console.log('410 is a PASS: it is the honest answer for a product that is genuinely gone.');
  process.exit(1);
}

console.log(
  `All ${CASES.length} resolve or are honestly gone under ${AGENTS.map((a) => a.name).join(' and ')}, ` +
    `in ${MAX_HOPS} hops or fewer.`
);
