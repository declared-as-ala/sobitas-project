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
   description, or both — i.e. exactly the fields that have drifted before. */
const DEFAULT_ROUTES = [
  '/omega-3/omega-3-fish-oil-240-softgel-weightworld',
  '/creatine/creatine-monohydrate-300g-ultimate-nutrition',
  '/glutamine/thorne-l-glutamine-90-gelules',
  '/mass-gainers/serious-mass-2-7-kg',
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

async function fetchAs(url, ua) {
  const res = await fetch(url, { headers: { 'User-Agent': ua }, redirect: 'follow' });
  const html = await res.text();
  return {
    status: res.status,
    title: pick(html, /<title>([\s\S]*?)<\/title>/i),
    description: pick(html, /<meta\s+name="description"\s+content="([\s\S]*?)"/i),
    canonical: pick(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i),
    ogImage: pick(html, /<meta\s+property="og:image"\s+content="([^"]*)"/i),
  };
}

const FIELDS = ['title', 'description', 'canonical', 'ogImage'];

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
