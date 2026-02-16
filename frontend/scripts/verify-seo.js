#!/usr/bin/env node
/**
 * SEO verification script: canonicals, redirects, sitemap, meta, schema.
 * Run against a running dev/build server: BASE_URL=http://localhost:3000 node scripts/verify-seo.js
 *
 * Verifies:
 * - Canonical link exists exactly once on indexable pages
 * - Canonical URL returns 200
 * - Duplicate routes redirect (301/308) to the canonical URL
 * - Sitemap.xml returns 200 and contains URLs
 * - Meta title length (warn if <30 or >60)
 * - Schema presence (at least one ld+json)
 * - Single H1 per page (warn if multiple)
 */

const BASE = process.env.BASE_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

const INDEXABLE_PATHS = [
  '/',
  '/shop',
  '/blog',
  '/shop?page=2',
  '/blog?page=2',
];

const REDIRECT_CHECKS = [
  { from: '/product/whey-protein', expectPath: '/shop/whey-protein', desc: '/product/:slug → /shop/:slug' },
  { from: '/products/whey-protein', expectPath: '/shop/whey-protein', desc: '/products/:slug (non-numeric) → /shop/:slug' },
];

const META_TITLE_MIN = 30;
const META_TITLE_IDEAL_MAX = 60;

function stripBase(url) {
  if (!url) return '';
  if (url.startsWith('/')) {
    const q = url.indexOf('?');
    return q >= 0 ? url : url;
  }
  try {
    const u = new URL(url, BASE);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function parseCanonical(html) {
  const match = html.match(/<link[^>]*\srel=["']canonical["'][^>]*\shref=["']([^"']+)["']/i)
    || html.match(/<link[^>]*\shref=["']([^"']+)["'][^>]*\srel=["']canonical["']/i);
  return match ? match[1].trim() : null;
}

function countCanonicals(html) {
  const re = /<link[^>]*\srel=["']canonical["'][^>]*>/gi;
  const matches = html.match(re) || [];
  return matches.length;
}

function getTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function countH1(html) {
  const matches = html.match(/<h1[^>]*>/gi) || [];
  return matches.length;
}

function countSchemaScripts(html) {
  const matches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || [];
  return matches.length;
}

async function fetchOk(url, opts = {}) {
  const res = await fetch(url, { redirect: 'manual', ...opts });
  return res;
}

async function main() {
  let failed = 0;
  const report = { canonicals: 0, redirects: 0, sitemap: false, meta: [], schema: [], h1: [] };

  console.log('SEO verification (base: ' + BASE + ')\n');

  for (const path of INDEXABLE_PATHS) {
    const url = path.startsWith('http') ? path : BASE + path;
    const label = path || '/';
    try {
      const res = await fetchOk(url);
      const html = res.status === 200 ? await res.text() : '';
      const canonical = parseCanonical(html);
      const count = countCanonicals(html);

      if (count !== 1) {
        console.log('FAIL:', label, '- canonical count:', count, '(expected 1)');
        failed++;
        continue;
      }
      if (!canonical) {
        console.log('FAIL:', label, '- no canonical href found');
        failed++;
        continue;
      }

      // Verify canonical path returns 200 on the server under test (BASE), not on canonical's host.
      // This avoids 525 when canonical points to production (e.g. sobitas.tn) and we run against localhost.
      let canonicalPath = canonical;
      try {
        const u = new URL(canonical);
        canonicalPath = u.pathname + u.search;
      } catch (_) {
        if (!canonical.startsWith('/')) canonicalPath = new URL(canonical, BASE).pathname + new URL(canonical, BASE).search;
      }
      const canonicalTestUrl = canonicalPath.startsWith('http') ? canonicalPath : BASE.replace(/\/$/, '') + (canonicalPath === '/' ? '' : canonicalPath);
      const canonicalRes = await fetchOk(canonicalTestUrl);
      if (canonicalRes.status !== 200) {
        console.log('FAIL:', label, '- canonical path returned', canonicalRes.status, canonicalPath);
        failed++;
        continue;
      }
      report.canonicals++;
      console.log('OK:', label, '→ canonical', canonical, '(200 on ' + BASE + ')');

      const title = getTitle(html);
      const titleLen = title ? title.length : 0;
      if (titleLen > 0) {
        if (titleLen < META_TITLE_MIN) report.meta.push({ path: label, issue: 'title too short', len: titleLen });
        else if (titleLen > META_TITLE_IDEAL_MAX) report.meta.push({ path: label, issue: 'title long (CTR)', len: titleLen });
      }
      const schemaCount = countSchemaScripts(html);
      if (schemaCount > 0) report.schema.push({ path: label, count: schemaCount });
      else report.schema.push({ path: label, count: 0, warn: true });
      const h1Count = countH1(html);
      if (h1Count !== 1) report.h1.push({ path: label, count: h1Count });
    } catch (e) {
      console.log('FAIL:', label, '-', e.message);
      failed++;
    }
  }

  console.log('');
  for (const { from, expectPath, desc } of REDIRECT_CHECKS) {
    const url = BASE + from;
    try {
      const res = await fetchOk(url);
      const status = res.status;
      const location = res.headers.get('location') || '';
      const locationPath = location ? stripBase(location) : '';

      const isPermanent = status === 301 || status === 308;
      const landsOnCanonical = locationPath === expectPath || locationPath === new URL(expectPath, BASE).pathname;

      if (!isPermanent) {
        console.log('FAIL:', desc, '- status', status, '(expected 301 or 308)');
        failed++;
      } else if (!landsOnCanonical) {
        console.log('FAIL:', desc, '- Location', locationPath, '(expected', expectPath, ')');
        failed++;
      } else {
        report.redirects++;
        console.log('OK:', desc, status, '→', locationPath);
      }
    } catch (e) {
      console.log('FAIL:', desc, '-', e.message);
      failed++;
    }
  }

  console.log('');
  try {
    const sitemapRes = await fetchOk(BASE + '/sitemap.xml');
    if (sitemapRes.status !== 200) {
      console.log('FAIL: sitemap.xml returned', sitemapRes.status);
      failed++;
    } else {
      const xml = await sitemapRes.text();
      const urlCount = (xml.match(/<url>/gi) || []).length;
      report.sitemap = true;
      console.log('OK: sitemap.xml 200, URLs:', urlCount);
    }
  } catch (e) {
    console.log('FAIL: sitemap.xml -', e.message);
    failed++;
  }

  if (report.meta.length > 0) {
    console.log('\nMeta title length:');
    report.meta.forEach(({ path, issue, len }) => console.log('  -', path || '/', issue, '(' + len + ' chars)'));
  }
  const noSchema = report.schema.filter((s) => s.warn || s.count === 0);
  if (noSchema.length > 0) {
    console.log('\nSchema (ld+json) missing or zero on:', noSchema.map((s) => s.path || '/').join(', '));
  }
  const badH1 = report.h1.filter((h) => h.count !== 1);
  if (badH1.length > 0) {
    console.log('\nH1 count (expect 1):');
    badH1.forEach(({ path, count }) => console.log('  -', path || '/', '→', count));
  }

  console.log('\n--- Report ---');
  console.log('Canonicals:', report.canonicals + '/' + INDEXABLE_PATHS.length);
  console.log('Redirects:', report.redirects + '/' + REDIRECT_CHECKS.length);
  console.log('Sitemap:', report.sitemap ? 'OK' : 'FAIL');
  console.log('Meta title warnings:', report.meta.length);
  console.log('Schema warnings:', noSchema.length);
  console.log('H1 warnings:', badH1.length);

  if (failed > 0) {
    console.log('\nResult: ' + failed + ' check(s) failed.');
    process.exit(1);
  }
  console.log('\nResult: all checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
