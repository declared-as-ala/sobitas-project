#!/usr/bin/env node
/**
 * Does Googlebot get the same <title> and meta description as a browser?
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * middleware.ts rewrites crawler user-agents to /x-crawler/**, so a product URL is rendered by a
 * DIFFERENT route for Google than for a shopper. That route has drifted from the human one three
 * times now, and every time the drift was invisible locally because a browser saw the good version:
 *
 *   - og:image: Google got the site-wide banner while a browser got the product photo.
 *   - robots:   a hardcoded `index: true` ignored the product's own seo_robots_index.
 *   - 08/09/2026, this script's reason: BOTH the meta description and the title diverged.
 *
 *         browser   "Complément alimentaire … riche en EPA et DHA … Prix : 179 DT."
 *         Googlebot "Omega 3 fish oil 240 softgel - weightworld — Oméga 3 en Tunisie. Livraison…"
 *
 *     A whole CTR rewrite — and a hand-curated Search Console title map — shipped to shoppers and
 *     never reached the search engine it was written for, on a page with 4,122 impressions at
 *     0.7% CTR.
 *
 * The lesson each time: the crawler route is the ONLY one Google reads, so "I checked it in the
 * browser" proves nothing about what is indexed. This asserts the two agree.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────
 *     node scripts/check-crawler-parity.mjs --base http://127.0.0.1:3100
 *     node scripts/check-crawler-parity.mjs --base https://protein.tn --routes /creatine/x,/omega-3/y
 *
 * Exits non-zero on any divergence.
 */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const BASE = (arg('base', 'http://127.0.0.1:3100') || '').replace(/\/$/, '');

const GOOGLEBOT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/* Products chosen because they carry a curated Search Console title, a formulaic backend
   description, or both — i.e. exactly the fields that have drifted before.

   The last two are a CATEGORY and a BRAND, added when the JSON-LD comparison went in: middleware
   rewrites all three page shapes to /x-crawler/**, but only the product route was ever checked,
   and the brand and category routes had each drifted in their own way (see schemaSummary above).

   ── RUN THIS AGAINST A LOCAL SERVER ──────────────────────────────────────────────────────────
   `--base https://protein.tn` is nearly useless for this: the rewrite is invisible to the CDN, so
   both requests hit ONE cache entry keyed on the URL and whichever variant got cached is returned
   to both user agents — the two views come back identical no matter how far apart they are. That
   is exactly how these divergences survived. Against 127.0.0.1 there is no such cache. To probe
   production anyway, append ?__crawler=1 (a distinct URL, and the flag isCrawler.ts exposes). */
const DEFAULT_ROUTES = [
  '/omega-3/omega-3-fish-oil-240-softgel-weightworld',
  '/creatine/creatine-monohydrate-300g-ultimate-nutrition',
  '/glutamine/thorne-l-glutamine-90-gelules',
  '/mass-gainers/serious-mass-2-7-kg',
  '/whey-proteine',
  '/biotech-usa',
];

const ROUTES = (arg('routes', '') || '').trim()
  ? arg('routes', '').split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ROUTES;

const decode = (s) =>
  String(s ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const pick = (html, re) => {
  const m = html.match(re);
  return m ? decode(m[1]) : null;
};

/**
 * ── THE STRUCTURED DATA DIVERGED TOO, AND NOTHING WAS WATCHING IT ───────────────────────────
 * The four fields above were the ones that had drifted when this script was written. On
 * 08/09/2026 the JSON-LD was measured the same way and had drifted in three more places:
 *
 *   /vitamines/platinum-multivitamin-90-tabs   browser: 7 blobs incl. WebPage | bot: 6, no WebPage
 *   /whey-proteine                             browser: 8 blobs + 6 Product  | bot: 8, 0 Product
 *   /biotech-usa   CollectionPage name  browser "BioTech USA Tunisie | Pure Whey…"  bot "Produits BIOTECH USA"
 *                  CollectionPage description  browser: curated copy           bot: absent
 *
 * So this compares the emitted graph as well: the multiset of node types, and — because a node
 * can be present and still say something different — the name/description of every page-level
 * node. Deliberately NOT a full deep-equal of the JSON: a listing's ItemList legitimately differs
 * between two renders of a rotating catalogue, and a guard that cries wolf gets switched off.
 */
function schemaSummary(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const types = [];
  const pageNodes = [];
  let m;
  while ((m = re.exec(html))) {
    let node;
    try { node = JSON.parse(m[1].trim()); } catch { types.push('UNPARSEABLE'); continue; }
    for (const n of Array.isArray(node) ? node : node['@graph'] ? node['@graph'] : [node]) {
      const t = [].concat(n['@type'] ?? '??').join('+');
      types.push(t);
      if (/Page$/.test(t)) pageNodes.push(`${t}|${decode(n.name ?? '')}|${decode(n.description ?? '')}`);
    }
  }
  return { types: types.sort().join(','), pageNodes: pageNodes.sort().join(' ~ ') };
}

async function fetchAs(url, ua) {
  const res = await fetch(url, { headers: { 'User-Agent': ua }, redirect: 'follow' });
  const html = await res.text();
  const schema = schemaSummary(html);
  return {
    status: res.status,
    title: pick(html, /<title>([\s\S]*?)<\/title>/i),
    description: pick(html, /<meta\s+name="description"\s+content="([\s\S]*?)"/i),
    canonical: pick(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i),
    ogImage: pick(html, /<meta\s+property="og:image"\s+content="([^"]*)"/i),
    /* ── ROBOTS, ADDED 09/09/2026 AFTER A DIVERGENCE THIS SCRIPT COULD NOT SEE ────────────
       /myprotein serves `noindex, follow` to Googlebot and `index, follow` to a browser, live.
       (Brand 28 has zero products; the crawler route holds an empty listing out of the index and
       the human route does not.) Whatever the intent, two routes disagreeing about INDEXABILITY
       under different user agents is the shape that separates dynamic rendering from cloaking,
       and it is the single most consequential field on the page — it decides whether any of the
       other five fields are ever read at all.
       This script compared title, description, canonical, og:image and the JSON-LD graph, and not
       this. Four documented divergences were found by measuring fields somebody thought to check;
       this one was found by accident while writing brand copy. */
    robots: pick(html, /<meta\s+name="robots"\s+content="([^"]*)"/i),
    schemaTypes: schema.types,
    schemaPageNodes: schema.pageNodes,
  };
}

const FIELDS = ['title', 'description', 'canonical', 'ogImage', 'robots', 'schemaTypes', 'schemaPageNodes'];

let failures = 0;
for (const route of ROUTES) {
  const url = `${BASE}${route}`;
  let bot, human;
  try {
    [bot, human] = await Promise.all([fetchAs(url, GOOGLEBOT), fetchAs(url, BROWSER)]);
  } catch (err) {
    console.error(`FETCH FAILED ${route}: ${err.message}`);
    failures += 1;
    continue;
  }

  if (bot.status !== 200 || human.status !== 200) {
    console.error(`STATUS ${route}: googlebot=${bot.status} browser=${human.status}`);
    failures += 1;
    continue;
  }

  const diverged = FIELDS.filter((f) => bot[f] !== human[f]);
  if (diverged.length === 0) {
    console.log(`ok    ${route}`);
    continue;
  }

  failures += 1;
  console.error(`DIVERGED ${route} -> ${diverged.join(', ')}`);
  for (const f of diverged) {
    console.error(`   ${f}`);
    console.error(`     googlebot: ${String(bot[f]).slice(0, 150)}`);
    console.error(`     browser  : ${String(human[f]).slice(0, 150)}`);
  }
}

if (failures) {
  console.error(
    `\n${failures} route(s) differ between Googlebot and a browser. ` +
      `Whatever you changed on the product route, make it in x-crawler/product/[...slug] too.`
  );
  process.exit(1);
}
console.log(`\ncrawler parity — clean across ${ROUTES.length} routes.`);
