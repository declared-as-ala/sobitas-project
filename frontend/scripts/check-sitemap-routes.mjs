/**
 * Fail the build when the sitemap's fixed-route list drifts away from the real route tree, or when
 * the constant that NAMES product child sitemaps is edited.
 *
 * ── WHY A BUILD FAILURE AND NOT A REVIEW COMMENT ─────────────────────────────────────────────
 * The owner asked for a sitemap that stays complete "for the future edits we will make". Every
 * mechanism for that in sitemapSources.ts is dynamic — products, brands, categories, articles and
 * CMS pages are crawled, so a new row appears in the sitemap by itself. Exactly one thing is not:
 * the list of HAND-WRITTEN pages, because a hand-written page is a directory somebody created, not a
 * database row anything can enumerate at runtime.
 *
 * That list has already gone stale twice in the way this catches. /pack-builder shipped orphaned.
 * /partenaires shipped orphaned and stayed that way — measured 2026-08-10, it returns 200 with a
 * self-canonical and index,follow, and appeared in no sitemap at all. Nothing failed. Nothing could:
 * an orphaned page is invisible from every status code on the site.
 *
 * So the route tree is enumerated from src/app and every top-level page must be accounted for —
 * either submitted in STATIC_ROUTES, or named in EXCLUDED below with the reason written down. A new
 * page type is then a build failure until somebody decides which it is, which is the only version of
 * "automatic" that survives contact with a person adding a directory.
 *
 * Run: node scripts/check-sitemap-routes.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'src', 'app');

/**
 * Top-level routes that must NOT be in the sitemap, and why. Every one of these is either
 * disallowed in robots.txt, per-user, transactional, or a legacy URL shape that middleware 301s.
 * Adding a name here is a decision, which is the point of it being a list rather than a heuristic.
 */
const EXCLUDED = new Map([
  ['cart', 'transactional; robots.txt disallows /cart'],
  ['checkout', 'transactional; robots.txt disallows /checkout'],
  ['account', 'per-user; robots.txt disallows /account'],
  ['favoris', 'per-user wishlist, nothing indexable'],
  ['login', 'auth; robots.txt disallow'],
  ['register', 'auth; robots.txt disallow'],
  ['verify-email', 'auth; one-time account verification, no indexable content'],
  ['verify-phone', 'auth; private SMS verification and welcome credit, noindex'],
  ['forgot-password', 'auth; robots.txt disallow'],
  ['reset-password', 'auth; robots.txt disallow'],
  ['order-confirmation', 'per-order; robots.txt disallows /order-confirmation/'],
  ['avis', 'one-time review-invite token, not a page'],
  ['products', 'legacy /products/{id}; middleware 301s to /{subcategory}/{slug}'],
  ['product', 'legacy /product/{slug}; middleware 301s to /{subcategory}/{slug}'],
  ['category', 'legacy /category/{slug}; middleware 301s to /{slug}'],
  ['brand', 'legacy /brand/{slug}; middleware 301s to /{slug}'],
  ['page', 'legacy /page/{slug}; middleware 301s to /{slug}'],
  // /shop and /blog own dynamic children that are separate sections; the hubs themselves ARE
  // submitted, so they are not listed here — they must appear in STATIC_ROUTES.
]);

/** Top-level URL segments that actually resolve to a page, ignoring (route groups). */
function topLevelRouteSegments(dir) {
  const found = new Set();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const full = join(dir, name);

    if (name.startsWith('(') && name.endsWith(')')) {
      for (const s of topLevelRouteSegments(full)) found.add(s);
      continue;
    }
    if (name.startsWith('[') || name.startsWith('_') || name.startsWith('@')) continue;
    // Route handlers and the bot-rendering target are not indexable pages.
    if (name === 'api' || name === 'x-crawler' || name === 'sitemaps' || name.endsWith('.xml')) continue;

    const hasPage = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some((f) => {
      try {
        return statSync(join(full, f)).isFile();
      } catch {
        return false;
      }
    });
    if (hasPage) found.add(name);
  }
  return found;
}

const sourcesPath = join(root, 'src', 'util', 'sitemapSources.ts');
const src = readFileSync(sourcesPath, 'utf8');

const block = src.match(/export const STATIC_ROUTES[^=]*=\s*\[([\s\S]*?)\n\];/);
if (!block) {
  console.error('check-sitemap-routes: could not find STATIC_ROUTES in src/util/sitemapSources.ts');
  process.exit(1);
}
const submitted = new Set(
  [...block[1].matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1].replace(/^\//, '')).filter(Boolean)
);

const actual = topLevelRouteSegments(appDir);
let failed = 0;

const unaccounted = [...actual].filter((s) => !submitted.has(s) && !EXCLUDED.has(s)).sort();
if (unaccounted.length) {
  console.error('\ncheck-sitemap-routes: FAIL\n');
  console.error('These top-level pages exist in src/app and are neither submitted in the sitemap nor');
  console.error('excluded on purpose. An indexable page in no sitemap is an orphan — 200 to a browser,');
  console.error('invisible to Google, and invisible to every check on this site:\n');
  for (const s of unaccounted) console.error(`   /${s}`);
  console.error('\nAdd it to STATIC_ROUTES in src/util/sitemapSources.ts, or to EXCLUDED in this');
  console.error('script with the reason.\n');
  failed++;
}

// A submitted route whose directory no longer exists is the other direction of the same drift: the
// sitemap would advertise a URL that 404s, which Search Console reports as "Submitted URL not found".
const stale = [...submitted].filter((s) => s !== '' && !actual.has(s)).sort();
if (stale.length) {
  console.error('\ncheck-sitemap-routes: FAIL\n');
  console.error('STATIC_ROUTES submits these, but no page.tsx owns them any more — the sitemap would');
  console.error('advertise URLs that 404:\n');
  for (const s of stale) console.error(`   /${s}`);
  console.error('');
  failed++;
}

/*
 * ── THE FROZEN CONSTANT ────────────────────────────────────────────────────────────────────────
 * A product's child sitemap is products-{floor(id / PRODUCT_ID_BAND_SIZE)}.xml, so this number is
 * part of a URL that has been submitted to Google. Changing it renames every product child sitemap
 * at once: the old names stop being produced by buildSitemapFiles(), and the child route — which
 * resolves names only from the manifest — starts answering them 404. Search Console reports
 * "Sitemap could not be read" for files it was told about, and no other status code on the site
 * moves.
 *
 * It used to share one constant with the non-product chunk size, so "the listings section is getting
 * big, bump the chunk" was a one-token edit that did this. The two are now separate and only this
 * one is pinned here.
 */
const FROZEN_BAND_SIZE = 5000;
const xmlPath = join(root, 'src', 'util', 'sitemapXml.ts');
const xmlSrc = readFileSync(xmlPath, 'utf8');
const bandMatch = xmlSrc.match(/const PRODUCT_ID_BAND_SIZE\s*=\s*(\d+)/);
if (!bandMatch) {
  console.error('\ncheck-sitemap-routes: FAIL — PRODUCT_ID_BAND_SIZE is gone from src/util/sitemapXml.ts.');
  console.error('Product child sitemap filenames are derived from it; it cannot be removed silently.\n');
  failed++;
} else if (Number(bandMatch[1]) !== FROZEN_BAND_SIZE) {
  console.error('\ncheck-sitemap-routes: FAIL\n');
  console.error(`PRODUCT_ID_BAND_SIZE changed from ${FROZEN_BAND_SIZE} to ${bandMatch[1]}.`);
  console.error('That renames every products-N.xml. Every product child sitemap already submitted to');
  console.error('Google becomes a 404 the moment this deploys. If that is genuinely intended, update');
  console.error('FROZEN_BAND_SIZE in this script in the same commit and say so in the message.\n');
  failed++;
}

/*
 * The other half of "lastmod is a real change date": nothing in the sitemap may synthesise one.
 *
 * Comments are stripped first, because the docblock on getLastModified() explains this rule by
 * quoting the very expression it forbids — and a check that cannot tell code from the comment
 * describing it would ban its own documentation.
 */
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
if (/lastModified[^\n]*new Date\(\)/.test(code) || /\?\?\s*new Date\(\)/.test(code)) {
  console.error('\ncheck-sitemap-routes: FAIL\n');
  console.error('sitemapSources.ts synthesises a <lastmod> with new Date(). Every URL would then claim');
  console.error('to have changed at the moment of the crawl, and Google discounts a lastmod it can');
  console.error('prove is unreliable — spending the signal rather than merely wasting it. Omit the');
  console.error('element instead when a row carries no timestamp.\n');
  failed++;
}

if (failed) process.exit(1);

console.log(
  `check-sitemap-routes: OK (${actual.size} top-level pages: ${submitted.size} submitted, ` +
  `${[...actual].filter((s) => EXCLUDED.has(s)).length} excluded by design; band size ${FROZEN_BAND_SIZE} unchanged)`
);
