// Offline audit of the actual builders, using the installed TypeScript compiler (no dependencies).
// Google contracts, split by feature; references only, NEVER fetched by this script:
// https://developers.google.com/search/docs/appearance/structured-data/product-snippet
// https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
// https://developers.google.com/search/docs/appearance/structured-data/return-policy
// https://developers.google.com/search/docs/appearance/structured-data/sd-policies
// https://developers.google.com/search/docs/appearance/google-images
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import net from 'node:net';
import ts from 'typescript';

// Fail closed if any imported code starts trying to fetch. No .env loading.
globalThis.fetch = () => { throw new Error('Offline schema audit: network forbidden'); };
net.Socket.prototype.connect = () => { throw new Error('Offline schema audit: network forbidden'); };
process.env.NEXT_PUBLIC_STORAGE_URL = 'https://admin.protein.tn/storage';
process.env.NEXT_PUBLIC_BASE_URL = 'https://protein.tn';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
function loadTs(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, mod);
  mod.require = (specifier) => {
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return require(specifier);
    const base = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    const target = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    assert.ok(target, `Cannot resolve ${specifier}`);
    return /\.tsx?$/.test(target) ? loadTs(target) : require(target);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const schemaFile = path.join(root, 'src/util/structuredData.ts');
const builders = loadTs(schemaFile);
const { getProductStockStatus } = loadTs(path.join(root, 'src/util/cartStock.ts'));
const { getPriceDisplay } = loadTs(path.join(root, 'src/util/productPrice.ts'));
const { buildProductCanonicalUrl } = loadTs(path.join(root, 'src/util/productUrl.ts'));
const base = 'https://protein.tn';
const terms = (s) => new Set(s.split(' ').map((v) => `https://schema.org/${v}`));
const availability = terms('BackOrder Discontinued InStock InStoreOnly LimitedAvailability OnlineOnly OutOfStock PreOrder PreSale SoldOut');
const conditions = terms('NewCondition UsedCondition RefurbishedCondition DamagedCondition');
const returnCategories = terms('MerchantReturnFiniteReturnWindow MerchantReturnNotPermitted MerchantReturnUnlimitedWindow');
const returnMethods = terms('ReturnAtKiosk ReturnByMail ReturnInStore');
const returnFees = terms('FreeReturn ReturnFeesCustomerResponsibility ReturnShippingFees');
const arr = (v) => v == null ? [] : Array.isArray(v) ? v : [v];
const nonempty = (v) => typeof v === 'string' && !!v.trim();
function absolute(v) {
  if (!nonempty(v) || /\s/.test(v)) return false;
  try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password; } catch { return false; }
}
function imageUrl(v) {
  return absolute(v) && !/^(localhost|127\.|0\.|10\.|192\.168\.|\[::1\])/i.test(new URL(v).hostname);
}
function date(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v ?? '')) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
const numeric = (v) => (typeof v === 'number' || (typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v))) && Number.isFinite(Number(v)) && Number(v) >= 0;
const walk = (v, visit, at = '$') => {
  if (!v || typeof v !== 'object') return;
  visit(v, at);
  for (const [key, child] of Object.entries(v)) walk(child, visit, `${at}.${key}`);
};
function gtinValid(v, length) {
  if (typeof v !== 'string' || !/^\d+$/.test(v) || !(length ? [length] : [8, 12, 13, 14]).includes(v.length)) return false;
  const digits = [...v].map(Number);
  const check = digits.pop();
  return (10 - digits.reverse().reduce((sum, n, i) => sum + n * (i % 2 ? 1 : 3), 0) % 10) % 10 === check;
}
const rules = [];
const rule = (id, level, check) => rules.push({ id, level, check });
// A decimal STRING is supported by Google. Do not classify it as a number-type error.
rule('Product type + nonempty name', 'required', ({ s }) => s?.['@type'] === 'Product' && nonempty(s.name));
rule('Snippet: offers (no ratings needed)', 'required', ({ s }) => arr(s?.offers).length > 0);
rule('Merchant: Product image present', 'required', ({ s }) => arr(s?.image).length > 0);
rule('Offer type + price numeric/dot/nonnegative', 'required', ({ s }) => arr(s?.offers).every((o) => o['@type'] === 'Offer' && numeric(o.price)));
rule('Merchant: price > 0', 'required', ({ s }) => arr(s?.offers).every((o) => numeric(o.price) && Number(o.price) > 0));
rule('Currency ISO 4217 / matches visible TND', 'guard', ({ s }) => arr(s?.offers).every((o) => o.priceCurrency === 'TND'));
rule('Price matches visible effective price', 'guard', ({ s, p }) => arr(s?.offers).every((o) => Number(o.price) === getPriceDisplay(p).finalPrice));
rule('Availability enum (when supplied)', 'guard', ({ s }) => arr(s?.offers).every((o) => o.availability == null || availability.has(o.availability)));
rule('Availability follows known stock; unknown omitted', 'guard', ({ s, p }) => {
  const status = getProductStockStatus(p);
  const expected = status.isUnknown ? undefined : `${base.replace('protein.tn', 'schema.org')}/${status.isBackOrder ? 'BackOrder' : status.isOutOfStock ? 'OutOfStock' : 'InStock'}`;
  return arr(s?.offers).every((o) => o.availability === expected);
});
rule('Condition enum (when supplied)', 'guard', ({ s }) => arr(s?.offers).every((o) => o.itemCondition == null || conditions.has(o.itemCondition)));
rule('All URL/ID fields absolute HTTP(S)', 'guard', ({ s }) => {
  let ok = true;
  walk(s, (node) => { for (const [k, v] of Object.entries(node)) if (['@id', 'url', 'contentUrl', 'mainEntityOfPage'].includes(k) && typeof v !== 'object') ok &&= absolute(v); });
  return ok;
});
rule('Image URLs public HTTP(S), no data URI', 'guard', ({ s }) => arr(s?.image).every(imageUrl));
rule('No site banner/logo substituted for product image', 'guard', ({ s }) => arr(s?.image).every((v) => !/\/(og-banner\.jpg|logo\.png|icon\.png)(?:\?|$)/.test(v)));
rule('Images unique; associatedMedia agrees', 'guard', ({ s }) => new Set(arr(s?.image)).size === arr(s?.image).length && arr(s?.associatedMedia).every((m) => m['@type'] === 'ImageObject' && arr(s?.image).includes(m.contentUrl) && m.url === m.contentUrl));
rule('Product/Offer canonical URLs + stable Product ID', 'guard', ({ s, canonical }) => s?.['@id'] === `${canonical}#product` && s.url === canonical && (s.mainEntityOfPage?.['@id'] ?? s.mainEntityOfPage) === canonical && arr(s.offers).every((o) => o.url === canonical));
rule('No conflicting types/values for a repeated ID', 'guard', ({ graph }) => {
  const ids = new Map(); let ok = true;
  walk(graph, (node) => {
    if (!node['@id']) return;
    const previous = ids.get(node['@id']) ?? {};
    for (const [key, value] of Object.entries(node)) {
      if (previous[key] === undefined) continue;
      if (key === '@type' && arr(previous[key]).some((v) => arr(value).includes(v))) continue;
      if (JSON.stringify(previous[key]) !== JSON.stringify(value)) ok = false;
    }
    ids.set(node['@id'], { ...previous, ...node });
  }); return ok;
});
rule('Fragment references resolve to described nodes', 'guard', ({ graph }) => {
  const defined = new Set(); const refs = [];
  walk(graph, (node) => { if (node['@id']) { if (Object.keys(node).some((k) => k !== '@id')) defined.add(node['@id']); else refs.push(node['@id']); } });
  // External/document IRIs need not be fetched or declared locally. Local fragments do.
  return refs.every((id) => !new URL(id).hash || defined.has(id));
});
rule('Category ItemList links to same canonical, no Product ID reuse', 'guard', ({ list, canonical, s }) => (!list['@id'] || list['@id'] !== s?.['@id']) && list.itemListElement[0]?.url === canonical && (!list.itemListElement[0]?.['@id'] || list.itemListElement[0]['@id'] !== s?.['@id']));
rule('Date fields valid ISO calendar dates', 'guard', ({ s }) => arr(s?.offers).every((o) => ['priceValidUntil', 'validFrom', 'validThrough'].every((k) => o[k] == null || date(o[k]))));
rule('Expiry not past; validFrom <= expiry', 'data', ({ s }) => arr(s?.offers).every((o) => (!o.priceValidUntil || o.priceValidUntil >= new Date().toISOString().slice(0, 10)) && (!o.validFrom || !o.priceValidUntil || o.validFrom <= o.priceValidUntil)));
rule('Return policy type/country/category/days', 'guard', ({ s }) => arr(s?.offers).every((o) => arr(o.hasMerchantReturnPolicy).every((r) => r['@type'] === 'MerchantReturnPolicy' && r.applicableCountry === 'TN' && returnCategories.has(r.returnPolicyCategory) && (!r.returnPolicyCategory.endsWith('FiniteReturnWindow') || Number.isInteger(r.merchantReturnDays) && r.merchantReturnDays >= 0))));
rule('Return method/fees enums + conditional fee', 'guard', ({ s }) => arr(s?.offers).every((o) => arr(o.hasMerchantReturnPolicy).every((r) => (!r.returnMethod || arr(r.returnMethod).every((v) => returnMethods.has(v))) && (!r.returnFees || returnFees.has(r.returnFees)) && (!r.returnFees?.endsWith('/ReturnShippingFees') || r.returnShippingFees?.['@type'] === 'MonetaryAmount' && numeric(r.returnShippingFees.value) && r.returnShippingFees.currency === 'TND'))));
rule('No shipping promises for unknown/unavailable stock', 'guard', ({ s, p }) => { const st = getProductStockStatus(p); return !(st.isUnknown || st.isOutOfStock) || arr(s?.offers).every((o) => !o.shippingDetails); });
rule('Shipping type/destination/rate/currency', 'guard', ({ s }) => arr(s?.offers).every((o) => arr(o.shippingDetails).every((d) => d['@type'] === 'OfferShippingDetails' && d.shippingDestination?.['@type'] === 'DefinedRegion' && d.shippingDestination.addressCountry === 'TN' && d.shippingRate?.['@type'] === 'MonetaryAmount' && numeric(d.shippingRate.value) && d.shippingRate.currency === o.priceCurrency)));
rule('Delivery types/day units/nonnegative ordered ranges', 'guard', ({ s }) => arr(s?.offers).every((o) => arr(o.shippingDetails).every((d) => d.deliveryTime?.['@type'] === 'ShippingDeliveryTime' && ['handlingTime', 'transitTime'].every((k) => { const q = d.deliveryTime[k]; return q?.['@type'] === 'QuantitativeValue' && q.unitCode === 'DAY' && Number.isInteger(q.minValue) && Number.isInteger(q.maxValue) && q.minValue >= 0 && q.minValue <= q.maxValue; }))));
rule('No stale extra Offer prices/expiry/ID', 'guard', ({ s, canonical }) => arr(s?.offers).every((o) => (!o['@id'] || o['@id'] === `${canonical}#offer`) && !o.priceSpecification && !o.validThrough && !o.lowPrice && !o.highPrice));
rule('GTIN length/digits/checksum; typed GTIN agrees', 'data', ({ s }) => ['gtin', 'gtin8', 'gtin12', 'gtin13', 'gtin14'].every((k) => s?.[k] == null || gtinValid(s[k], k === 'gtin' ? undefined : Number(k.slice(4))) && (!s.gtin || k === 'gtin' || s[k].padStart(14, '0') === s.gtin.padStart(14, '0'))));
rule('No rating/review nodes emitted', 'guard', ({ s }) => { let ok = true; walk(s, (n) => { if (['aggregateRating', 'review', 'reviews'].some((k) => k in n) || ['Review', 'AggregateRating', 'Rating'].includes(n['@type'])) ok = false; }); return ok; });
rule('Description nonempty text', 'recommended', ({ s }) => nonempty(s?.description));
rule('Brand named and correctly typed', 'recommended', ({ s }) => ['Brand', 'Organization'].includes(s?.brand?.['@type']) && nonempty(s.brand.name));
rule('SKU text', 'recommended', ({ s }) => nonempty(s?.sku));
rule('GTIN or MPN supplied', 'recommended', ({ s }) => ['gtin', 'gtin8', 'gtin12', 'gtin13', 'gtin14', 'mpn'].some((k) => nonempty(s?.[k])));
rule('Availability supplied', 'recommended', ({ s }) => arr(s?.offers).every((o) => nonempty(o.availability)));
rule('Shipping details supplied', 'recommended', ({ s }) => arr(s?.offers).every((o) => !!o.shippingDetails));
rule('Return policy supplied', 'recommended', ({ s }) => arr(s?.offers).every((o) => !!o.hasMerchantReturnPolicy));
rule('Price expiry supplied', 'recommended', ({ s }) => arr(s?.offers).every((o) => !!o.priceValidUntil));

const fixtureDir = path.join(root, 'scripts/fixtures/meta-descriptions');
const files = fs.readdirSync(fixtureDir).filter((f) => f.endsWith('.json')).sort();
assert.equal(files.length, 40, 'Audit cohort changed: review the baseline and denominator');
const failures = Object.fromEntries(rules.map((r) => [r.id, new Set()]));
const paths = { backend: 0, fallback: 0 };
const sourceGaps = { stock: 0, gtin: 0, fullBackendGraph: 0, thirdPartyImage: 0 };
const digest = createHash('sha256');
const cases = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(fixtureDir, file), 'utf8'); digest.update(file).update(raw);
  const payload = JSON.parse(raw); const p = payload.product ?? payload.data?.product ?? payload.data ?? payload;
  assert.ok(p.id && p.slug && p.json_ld_product, `Invalid fixture ${file}`);
  sourceGaps.stock += Number(getProductStockStatus(p).isUnknown);
  sourceGaps.gtin += Number(!p.gtin);
  sourceGaps.fullBackendGraph += Number(!p.json_ld_product['@type']);
  sourceGaps.thirdPartyImage += Number(/images-iherb\.com/.test(p.seo?.image ?? ''));
  const canonical = buildProductCanonicalUrl(p, base);
  for (const [mode, built] of Object.entries({ backend: builders.sanitizeBackendProductJsonLd(p, p.json_ld_product, canonical), fallback: builders.buildProductJsonLd(p, canonical) })) {
    const s = JSON.parse(JSON.stringify(built)); paths[mode]++;
    const list = builders.buildItemListSchema([{ name: p.designation_fr, url: canonical }], base);
    const graph = [s, list, builders.buildOrganizationSchema(base), builders.buildWebSiteSchema(base)];
    const context = { s, p, canonical, list, graph };
    cases.push(context);
    for (const r of rules) if (!r.check(context)) failures[r.id].add(file);
  }
}
const counts = Object.fromEntries(rules.map((r) => [r.id, failures[r.id].size]));
const baselineFile = path.join(root, 'scripts/fixtures/product-schema-before.json');
if (process.argv.includes('--record-before')) {
  assert.ok(!fs.existsSync(baselineFile), 'Baseline already exists; refusing to overwrite');
  fs.writeFileSync(baselineFile, JSON.stringify({ measuredAt: new Date().toISOString(), fixtureSha256: digest.copy().digest('hex'), builderSha256: createHash('sha256').update(fs.readFileSync(schemaFile)).digest('hex'), counts }, null, 2) + '\n');
}
const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null;
if (baseline) assert.equal(baseline.fixtureSha256, digest.digest('hex'), 'Fixture cohort changed; before counts are no longer comparable');
console.log('40 fixtures; 80 graphs (backend + fallback). Counts = distinct products failing either path.');
console.table(rules.map((r) => ({ rule: r.id, level: r.level, before: baseline?.counts[r.id] ?? 'unrecorded', after: counts[r.id] })));
console.log('Fixture coverage gaps:', sourceGaps);
console.log('NOT VERIFIED offline: image HTTP status/MIME/pixels/relevance/robots on remote hosts, Googlebot/WAF access, indexing, manual actions, merchant country/program eligibility.');
if (process.argv.includes('--details')) for (const r of rules) if (counts[r.id]) console.log(`${r.id}: ${[...failures[r.id]].join(', ')}`);
if (!process.argv.includes('--record-before')) {
  const blocking = rules.filter((r) => ['guard', 'required'].includes(r.level) && counts[r.id]);
  if (blocking.length) process.exitCode = 1;

  // Separate edge regressions: these are NOT additional real products in the 40-product table.
  const example = { id: 1, slug: 'schema-edge', designation_fr: 'Produit de test', prix: 26.125,
    cover: 'https://admin.protein.tn/storage/produits/test.webp', brand: { designation_fr: 'Exemple' } };
  const canonical = `${base}/shop/schema-edge`;
  const make = (p, raw = {}) => [builders.buildProductJsonLd(p, canonical), builders.sanitizeBackendProductJsonLd(p, raw, canonical)];
  let regressions = 0;
  const { CrawlerProductView } = loadTs(path.join(root, 'src/app/components/crawler/CrawlerProductView.tsx'));
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  for (const [stock, expected, label] of [
    [{}, undefined, 'Disponibilité à confirmer'],
    [{ qte: 3, rupture: 0 }, 'InStock', 'En stock'],
    [{ qte: 1, rupture: 0, low_stock_threshold: 2 }, 'InStock', 'Stock faible'],
    [{ qte: 0, rupture: 1 }, 'BackOrder', 'Sur commande'],
    [{ qte: 5, force_out_of_stock: true }, 'OutOfStock', 'Rupture de stock'],
  ]) {
    const p = { ...example, ...stock, schema: { availability: 'https://schema.org/InStock', price_currency: 'EUR' } };
    const html = renderToStaticMarkup(React.createElement(CrawlerProductView, { product: p }));
    assert.ok(html.includes(`<strong>${label}</strong>`), `Crawler stock label: ${label}`);
    for (const s of make(p, { offers: [{ '@id': `${base}/#wrong`, shippingDetails: { '@type': 'OfferShippingDetails' } }] })) {
      assert.equal(s.offers.availability, expected && `https://schema.org/${expected}`);
      assert.equal(!!s.offers.shippingDetails, expected === 'InStock');
      assert.equal(s.offers.price, '26.125');
      assert.equal(s.offers.priceCurrency, 'TND');
      assert.ok(!('0' in s.offers));
      regressions++;
    }
  }
  const future = new Date(); future.setFullYear(future.getFullYear() + 2);
  const promoEnd = future.toISOString().slice(0, 10);
  const later = new Date(future); later.setDate(later.getDate() + 10);
  for (const s of make({ ...example, promo: 20, promo_expiration_date: promoEnd,
    price_valid_until: later.toISOString().slice(0, 10), created_at: '2026-02-30 12:00:00' },
  { offers: { '@id': `${base}/#stale`, priceSpecification: { price: '99,95', priceCurrency: 'EUR' }, validThrough: '2000-01-01' } })) {
    assert.equal(s.offers.priceValidUntil, promoEnd);
    assert.equal(s.offers.price, '20');
    assert.ok(!s.offers.validFrom && !s.offers.validThrough && !s.offers.priceSpecification && !s.offers['@id']);
    regressions++;
  }
  for (const s of make({ ...example, price_valid_until: '2026-02-30', schema: { item_condition: 'brand new' } })) {
    assert.equal(s.offers.priceValidUntil, undefined);
    assert.equal(s.offers.itemCondition, undefined);
    regressions++;
  }
  for (const s of make({ ...example, price_valid_until: '2000-01-01' })) {
    assert.equal(s.offers.priceValidUntil, '2000-01-01', 'Do not conceal expired source data'); regressions++;
  }
  for (const prix of [undefined, null, 'broken', '12.34.56', 'bad12', '1e3', -2, Infinity]) {
    for (const s of make({ ...example, prix })) { assert.equal(s, null, 'No invented free offer'); regressions++; }
  }
  for (const s of make({ ...example, prix: '26,125' })) { assert.equal(s.offers.price, '26.125'); regressions++; }
  for (const bad of ['data:image/png;base64,AAAA', 'https://', 'http://127.0.0.1/a.jpg', 'https://user:pass@example.com/a.jpg']) {
    for (const s of make({ ...example, cover: bad }, { image: bad })) {
      assert.equal(s.image, undefined); assert.equal(s.associatedMedia, undefined); regressions++;
    }
  }
  for (const s of make({ ...example, cover: 'data:image/png;base64,AAAA', seo: { image: example.cover } }, { image: 'https://' })) {
    assert.deepEqual(s.image, [example.cover]); regressions++;
  }
  for (const s of make({ ...example, qte: 0, rupture: 1 }, { offers: {
    shippingDetails: { '@type': 'OfferShippingDetails', deliveryTime: 'tomorrow' },
    hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnPeriod', returnFees: 'https://schema.org/ReturnFeesCustomerPaying' },
  } })) {
    assert.equal(s.offers.shippingDetails, undefined);
    assert.equal(s.offers.hasMerchantReturnPolicy.returnPolicyCategory, 'https://schema.org/MerchantReturnFiniteReturnWindow');
    assert.equal(s.offers.hasMerchantReturnPolicy.returnFees, 'https://schema.org/ReturnFeesCustomerResponsibility');
    regressions++;
  }
  const currentGtin = builders.sanitizeBackendProductJsonLd({ ...example, gtin: '012345678905' }, { gtin12: '740985273807' }, canonical);
  assert.equal(currentGtin.gtin, '012345678905'); assert.equal(currentGtin.gtin12, undefined); regressions++;
  // Positive + negative controls for rules that the real fixtures cannot exercise (no GTINs).
  assert.equal(gtinValid('740985273807', 12), true);
  assert.equal(gtinValid('740985273808', 12), false);
  const valid = cases[0];
  for (const [id, mutate] of [
    ['Offer type + price numeric/dot/nonnegative', (s) => { s.offers.price = '12,34'; }],
    ['Currency ISO 4217 / matches visible TND', (s) => { s.offers.priceCurrency = 788; }],
    ['Availability enum (when supplied)', (s) => { s.offers.availability = 'rupture'; }],
    ['Date fields valid ISO calendar dates', (s) => { s.offers.priceValidUntil = '2026-02-30'; }],
    ['Return policy type/country/category/days', (s) => { s.offers.hasMerchantReturnPolicy.returnPolicyCategory = 'https://schema.org/MerchantReturnFiniteReturnPeriod'; }],
    ['Return method/fees enums + conditional fee', (s) => { s.offers.hasMerchantReturnPolicy.returnFees = 'https://schema.org/ReturnFeesCustomerPaying'; }],
    ['Image URLs public HTTP(S), no data URI', (s) => { s.image = ['data:image/png;base64,AAAA']; }],
  ]) {
    const s = structuredClone(valid.s); mutate(s);
    assert.equal(rules.find((r) => r.id === id).check({ ...valid, s }), false, `Negative control: ${id}`); regressions++;
  }
  console.log(`Edge regressions: ${regressions} passed; 5 actual crawler HTML stock states rendered offline.`);
}

export { builders, loadTs, root, base, cases, rules };
