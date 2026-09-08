#!/usr/bin/env node
/**
 * Does any category page link to a URL that redirects, or to itself?
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * The "catégories liées" block is built from `related_category_slugs`, which arrives from TWO
 * places that disagree: the Filament category record and content/categories/*.json. Neither
 * validates that the slug it names is a URL that still resolves.
 *
 * On 08/09/2026 six of them did not, measured this way on a real build:
 *
 *     /proteine-whey            -> /whey-proteine       linked from /whey-proteine
 *     /complements-alimentaires -> /proteines           linked from /whey-proteine
 *     /proteine                 -> /proteines           linked from /creatine
 *     /gainers-haute-energie    -> /gainers-proteines   linked from /mass-gainers
 *     /proteines-completes      -> /proteines           linked from /whey-isolate
 *     /Intra-Workout            -> /intra-workout       linked from /performance
 *
 * The first is the one that matters and the reason this is a guard rather than a one-off sweep:
 * /whey-proteine linked to /proteine-whey, which 308s straight back to /whey-proteine. The
 * canonical page for the site's most valuable commercial cluster linked to a redirect to ITSELF,
 * and had done for as long as the block existed, because nothing looked.
 *
 * A sweep of the JSON files fixed eleven of twelve and could not fix the twelfth: that one came
 * from the API. Hence RELATED_SLUG_CANONICAL and the self-filter in resolveCategorySeo.ts — and
 * hence this, which fails if either stops working or the backend adds a seventh.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────
 *     node scripts/check-related-slug-hops.mjs --base http://127.0.0.1:3191
 *
 * Run it against a LOCAL build. Against production the CDN caches by URL and a bot and a browser
 * share one entry, which is how this class of bug survives (see check-crawler-parity.mjs).
 *
 * Exits non-zero on any hop or self-link.
 */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const BASE = (arg('base', 'http://127.0.0.1:3100') || '').replace(/\/$/, '');
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/* The category pages that carry the commercial cluster, plus the ones whose related lists were
   the stale ones. Not every category — this is a shape check, and the shape is shared. */
const PAGES = (arg('pages', '') || '').trim()
  ? arg('pages', '').split(',').map((s) => s.trim()).filter(Boolean)
  : [
      '/whey-proteine', '/proteines', '/creatine', '/pre-workout', '/glutamine', '/bcaa',
      '/mass-gainers', '/prise-de-masse', '/whey-isolate', '/performance', '/post-workout',
      '/glucides', '/collagene', '/hmb', '/bruleurs-de-graisse', '/intra-workout',
    ];

const get = (url, redirect) =>
  fetch(url, { headers: { 'User-Agent': GOOGLEBOT }, redirect });

/* One-segment internal hrefs only. Product URLs are /{category}/{product} and are a different
   contract; brand and blog links are checked elsewhere. */
const HREF = /href="(\/[A-Za-z0-9][A-Za-z0-9-]*)"/g;

const linkedFrom = new Map();
let failures = 0;

for (const page of PAGES) {
  const res = await get(`${BASE}${page}`, 'follow');
  if (res.status !== 200) {
    console.error(`STATUS ${page}: ${res.status}`);
    failures += 1;
    continue;
  }
  const html = await res.text();
  for (const m of html.matchAll(HREF)) {
    if (!linkedFrom.has(m[1])) linkedFrom.set(m[1], new Set());
    linkedFrom.get(m[1]).add(page);
  }
}

const hops = [];
const selfLinks = [];

for (const [target, pages] of linkedFrom) {
  for (const page of pages) {
    if (target === page) selfLinks.push([page, target]);
  }
  const res = await get(`${BASE}${target}`, 'manual');
  if (res.status >= 300 && res.status < 400) {
    hops.push([target, res.headers.get('location'), [...pages]]);
  }
}

console.log(`${linkedFrom.size} distinct internal one-segment link target(s) across ${PAGES.length} pages.`);

for (const [page, target] of selfLinks) {
  console.error(`SELF-LINK  ${page} links to itself (${target})`);
  failures += 1;
}

for (const [target, location, pages] of hops) {
  console.error(`HOP        ${target} -> ${location}`);
  console.error(`           linked from: ${pages.join(', ')}`);
  failures += 1;
}

if (failures) {
  console.error(
    `\n${failures} internal link(s) spend a hop or point at themselves. Add the slug to ` +
      `RELATED_SLUG_CANONICAL in src/util/resolveCategorySeo.ts, or fix it in the Filament ` +
      `category record — the map is what makes the API's copy fixable from this repository.`
  );
  process.exit(1);
}
console.log('\nrelated-slug hops — clean. No category page links to a redirect or to itself.');
