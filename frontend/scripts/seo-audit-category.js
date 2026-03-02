#!/usr/bin/env node
/**
 * SEO audit for a category page (e.g. /category/creatine).
 * Checks: 200, meta title length + main keyword, single H1, canonical, schema (Breadcrumb, ItemList, FAQ), no noindex.
 *
 * Usage:
 *   node scripts/seo-audit-category.js [slug]
 *   BASE_URL=https://protein.tn node scripts/seo-audit-category.js creatine
 *
 * Default slug: creatine. Default BASE_URL: http://localhost:3000
 */

const slug = process.argv[2] || 'creatine';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const path = `/category/${slug}`;
const url = path.startsWith('http') ? path : BASE.replace(/\/$/, '') + path;

const META_TITLE_MIN = 30;
const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

function getTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function getMetaDescription(html) {
  const m = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return m ? m[1].trim() : null;
}

function parseCanonical(html) {
  const match = html.match(/<link[^>]*\srel=["']canonical["'][^>]*\shref=["']([^"']+)["']/i)
    || html.match(/<link[^>]*\shref=["']([^"']+)["'][^>]*\srel=["']canonical["']/i);
  return match ? match[1].trim() : null;
}

function countH1(html) {
  const matches = html.match(/<h1[^>]*>/gi) || [];
  return matches.length;
}

function hasNoindex(html) {
  return /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)
    || /<meta[^>]*content=["'][^"']*noindex[^>]*name=["']robots["']/i.test(html);
}

function extractLdJson(html) {
  const scripts = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      scripts.push(JSON.parse(m[1].trim()));
    } catch (_) {
      scripts.push(null);
    }
  }
  return scripts;
}

function hasSchemaType(schema, type) {
  if (!schema || typeof schema !== 'object') return false;
  const t = schema['@type'];
  if (Array.isArray(t)) return t.includes(type);
  return t === type;
}

async function main() {
  let failed = 0;
  console.log('SEO audit category:', path, '(base:', BASE + ')\n');

  const res = await fetch(url, { redirect: 'manual' });
  if (res.status !== 200) {
    console.log('FAIL: page returned', res.status);
    process.exit(1);
  }
  const html = await res.text();

  // Meta title
  const title = getTitle(html);
  if (!title) {
    console.log('FAIL: no <title>');
    failed++;
  } else {
    const len = title.length;
    if (len < META_TITLE_MIN) {
      console.log('FAIL: meta title too short (' + len + ' chars, min ' + META_TITLE_MIN + ')');
      failed++;
    } else if (len > META_TITLE_MAX) {
      console.log('WARN: meta title long for CTR (' + len + ' chars, ideal ≤' + META_TITLE_MAX + ')');
    }
    const keyword =
      slug === 'creatine'
        ? /créatine|creatine/i
        : (slug === 'whey-protein' || slug === 'proteine-whey')
          ? /whey/i
          : new RegExp(slug.replace(/-/g, '[- ]'), 'i');
    if (!keyword.test(title)) {
      console.log('FAIL: meta title does not contain main keyword');
      failed++;
    } else {
      console.log('OK: meta title length', len, 'and contains keyword');
    }
  }

  // Meta description
  const desc = getMetaDescription(html);
  if (desc && desc.length > META_DESC_MAX) {
    console.log('WARN: meta description long (' + desc.length + ' chars, ideal ≤' + META_DESC_MAX + ')');
  } else if (desc) {
    console.log('OK: meta description present (' + desc.length + ' chars)');
  }

  // Canonical
  const canonical = parseCanonical(html);
  if (!canonical) {
    console.log('FAIL: no canonical link');
    failed++;
  } else {
    const expectedPath = path;
    const canonicalPath = canonical.replace(/^https?:\/\/[^/]+/, '') || '/';
    if (!canonicalPath.startsWith('/category/') || !canonicalPath.includes(slug)) {
      console.log('WARN: canonical path may not match category:', canonicalPath);
    }
    console.log('OK: canonical', canonical);
  }

  // Single H1
  const h1Count = countH1(html);
  if (h1Count !== 1) {
    console.log('FAIL: expected exactly 1 H1, found', h1Count);
    failed++;
  } else {
    console.log('OK: exactly 1 H1');
  }

  // No noindex
  if (hasNoindex(html)) {
    console.log('FAIL: page has noindex');
    failed++;
  } else {
    console.log('OK: no noindex');
  }

  // Schema
  const schemas = extractLdJson(html);
  const breadcrumb = schemas.find((s) => hasSchemaType(s, 'BreadcrumbList'));
  const itemList = schemas.find((s) => hasSchemaType(s, 'ItemList'));
  const faq = schemas.find((s) => hasSchemaType(s, 'FAQPage'));

  if (!breadcrumb) {
    console.log('FAIL: BreadcrumbList schema not found');
    failed++;
  } else {
    console.log('OK: BreadcrumbList schema present');
  }
  if (!itemList) {
    console.log('FAIL: ItemList schema not found');
    failed++;
  } else {
    console.log('OK: ItemList schema present');
  }
  if ((slug === 'creatine' || slug === 'whey-protein' || slug === 'proteine-whey') && !faq) {
    console.log('WARN: FAQPage schema not found (expected for this category)');
  } else if (faq) {
    console.log('OK: FAQPage schema present');
  }

  console.log('\n--- Result ---');
  if (failed > 0) {
    console.log(failed + ' check(s) failed.');
    process.exit(1);
  }
  console.log('All checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
