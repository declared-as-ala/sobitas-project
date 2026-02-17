#!/usr/bin/env node
/**
 * Validates Product structured data on product pages for Google Rich Results eligibility.
 * Run against a running dev server or production: BASE_URL=http://localhost:3000 node scripts/validate-product-rich-results.js
 * Or: BASE_URL=https://protein.tn node scripts/validate-product-rich-results.js
 * Optional: SLUGS=slug1,slug2 to test specific products; otherwise fetches first N from API or sitemap.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '5', 10);
const SLUGS_ENV = process.env.SLUGS;

const requiredProductFields = [
  ['@type', 'Product'],
  ['name'],
  ['image'],
  ['offers'],
  ['offers', 'price'],
  ['offers', 'priceCurrency'],
  ['offers', 'availability'],
  ['offers', 'url'],
];

function get(obj, path) {
  for (const key of path) {
    if (obj == null) return undefined;
    obj = obj[key];
  }
  return obj;
}

function findProductSchemas(html) {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const productSchemas = [];
  for (const script of scripts) {
    const match = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!match) continue;
    try {
      const json = JSON.parse(match[1].trim());
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item && item['@type'] === 'Product') productSchemas.push(item);
      }
    } catch {
      // ignore invalid JSON
    }
  }
  return productSchemas;
}

function validateProductSchema(schema) {
  const errors = [];
  if (!schema.name) errors.push('missing name');
  const image = schema.image;
  if (!image) errors.push('missing image');
  else if (Array.isArray(image) && image.length === 0) errors.push('image array empty');
  else if (Array.isArray(image) && image.some((u) => typeof u !== 'string' || !u.startsWith('http'))) errors.push('image must be absolute URL(s)');
  const offers = schema.offers;
  if (!offers) errors.push('missing offers');
  else {
    if (offers.price === undefined || offers.price === null) errors.push('offers.price missing');
    else if (typeof offers.price !== 'string' && typeof offers.price !== 'number') errors.push('offers.price must be string or number');
    else if (typeof offers.price === 'string' && /[^\d.]/.test(offers.price)) errors.push('offers.price should be numeric string (no "DT", no spaces)');
    if (!offers.priceCurrency) errors.push('offers.priceCurrency missing');
    if (!offers.availability) errors.push('offers.availability missing');
    if (typeof offers.availability !== 'string' || !offers.availability.includes('schema.org')) errors.push('offers.availability must be schema.org URL (InStock/OutOfStock)');
    if (!offers.url) errors.push('offers.url missing');
  }
  if (schema.aggregateRating) {
    if (typeof schema.aggregateRating.reviewCount !== 'number') errors.push('aggregateRating.reviewCount must be integer');
    const rv = schema.aggregateRating.ratingValue;
    if (rv !== undefined && typeof rv !== 'number' && typeof rv !== 'string') errors.push('aggregateRating.ratingValue must be number or string');
  }
  return errors;
}

async function fetchProductSlugs() {
  if (SLUGS_ENV) return SLUGS_ENV.split(',').map((s) => s.trim()).filter(Boolean);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://admin.protein.tn/api';
  try {
    // Backend has /latest_products (light) and /all_products (products array), not /products
    let res = await fetch(`${apiUrl}/latest_products`);
    if (!res.ok) throw new Error(`${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Response is not JSON (got ' + contentType.slice(0, 30) + '...)');
    const data = await res.json();
    const fromLatest = [
      ...(data.new_product || []),
      ...(data.packs || []),
      ...(data.best_sellers || []),
    ];
    let products = fromLatest.length >= MAX_PAGES ? fromLatest : null;
    if (products === null) {
      res = await fetch(`${apiUrl}/all_products`);
      if (!res.ok) throw new Error(`${res.status}`);
      const allData = await res.json();
      products = allData?.products ?? [];
    }
    const slugs = (Array.isArray(products) ? products : []).map((p) => p.slug).filter(Boolean);
    const seen = new Set();
    const unique = slugs.filter((s) => !seen.has(s) && seen.add(s));
    return unique.slice(0, MAX_PAGES);
  } catch (e) {
    console.warn('Could not fetch slugs from API:', e.message);
    return [];
  }
}

async function main() {
  console.log('Product Rich Results validation');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  const slugs = await fetchProductSlugs();
  if (slugs.length === 0) {
    console.log('No product slugs to check. Set SLUGS=slug1,slug2 or ensure API returns products.');
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;
  const missing = [];

  for (const slug of slugs) {
    const url = `${BASE_URL}/shop/${slug}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Googlebot' } });
      const html = await res.text();
      const productSchemas = findProductSchemas(html);
      if (productSchemas.length === 0) {
        console.log(`FAIL ${url} – no Product JSON-LD found`);
        fail++;
        missing.push({ url, issue: 'no Product schema' });
        continue;
      }
      if (productSchemas.length > 1) {
        console.log(`WARN ${url} – multiple Product schemas (${productSchemas.length}); use single main product`);
      }
      const schema = productSchemas[0];
      const errors = validateProductSchema(schema);
      if (errors.length > 0) {
        console.log(`FAIL ${url}`);
        errors.forEach((e) => console.log('  -', e));
        fail++;
        missing.push({ url, issues: errors });
      } else {
        console.log(`OK   ${url} – name="${(schema.name || '').slice(0, 40)}..." image=${Array.isArray(schema.image) ? schema.image.length : 1} offers.url=${!!schema.offers?.url}`);
        ok++;
      }
    } catch (e) {
      console.log(`ERR  ${url} – ${e.message}`);
      fail++;
      missing.push({ url, issue: e.message });
    }
  }

  console.log('');
  console.log(`Result: ${ok} passed, ${fail} failed`);
  if (missing.length > 0) {
    console.log('');
    console.log('Rich Results Test checklist:');
    console.log('1. Open https://search.google.com/test/rich-results');
    console.log('2. Enter a product URL (e.g. ' + BASE_URL + '/shop/<slug>)');
    console.log('3. Expect: Product with image, offers (price, availability, url), optional AggregateRating/Review');
    console.log('4. GSC: Enhancements → Product results; URL Inspection → Test live URL → Validate Fix');
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
