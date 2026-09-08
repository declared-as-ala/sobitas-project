import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire, Module } from 'node:module';
import { DATA_CACHE_MAX_BYTES, DATA_CACHE_STOP_BYTES, dataCacheItemBytes,
  assertSitemapCacheSize, encodeSitemapCache, decodeSitemapCache } from '../src/util/sitemapCachePayload.ts';
import { countIndexableProducts } from './count-indexable-products.mjs';

// Model a growing catalogue well beyond the old ceiling, including unicode, dates and image URLs.
const entries = Array.from({ length: 20000 }, (_, id) => ({
  section: 'products', productId: id, url: `https://protein.tn/whey/${encodeURIComponent(`protéine-${id}`)}?a=1&b=2`,
  lastModified: new Date('2026-09-01T00:00:00Z'), changeFrequency: 'weekly', priority: 0.7,
  images: [`https://admin.protein.tn/storage/products/cover-${id}.webp`],
}));
assert.ok(dataCacheItemBytes(entries) > DATA_CACHE_MAX_BYTES);
const packed = await encodeSitemapCache(entries);
assert.deepEqual(await decodeSitemapCache(packed), JSON.parse(JSON.stringify(entries)));
const envelope = { kind: 'FETCH', data: { headers: {}, body: JSON.stringify(packed), status: 200, url: '' }, revalidate: 3600 };
assert.ok(dataCacheItemBytes(packed) >= JSON.stringify(envelope).length);
assertSitemapCacheSize(DATA_CACHE_STOP_BYTES - 1);
assert.throws(() => assertSitemapCacheSize(DATA_CACHE_STOP_BYTES), /CACHE CAPACITY:.*headroom/);
assert.throws(() => assertSitemapCacheSize(DATA_CACHE_MAX_BYTES + 1), /headroom -1 bytes/);
// Incompressible input must fail inside the producer, rather than trusting the compression ratio.
await assert.rejects(encodeSitemapCache([{ section: 'products', url: randomBytes(1600000).toString('hex') }]), /CACHE CAPACITY/);
await assert.rejects(decodeSitemapCache('corrupt'), Error);

const rows = [false, 0, true, 1, null, false].map((flag, i) => ({
  id: i + 1, slug: `p-${i}`, publier: 1, seo_robots_index: flag,
}));
// Two short, server-clamped pages; 50% intentionally noindexed is healthy.
const page = async (n) => ({ products: rows.slice((n - 1) * 3, n * 3),
  pagination: { total: 6, per_page: 3, current_page: n, last_page: 2 } });
assert.equal(await countIndexableProducts(page), 3);
rows[0].seo = { robots: { index: true } };
assert.equal(await countIndexableProducts(page), 4);
delete rows[1].seo_robots_index;
await assert.rejects(countIndexableProducts(page), /omitted seo_robots_index/);
await assert.rejects(countIndexableProducts(async () => ({ products: [], pagination: { total: 6, per_page: 3, current_page: 1, last_page: 2 } })), /cannot verify|short|empty|truncat|abort/i);
console.log('PASS: sitemap cache round-trip, 20,000 URLs, envelope budget, threshold/oversize/corruption, indexable coverage and incomplete crawl');

// Exercise the actual Next filesystem cache and sitemapData wrapper, not a mocked cache API.
// Transpile only these modules to supply deterministic sources without touching the backend.
const require = createRequire(import.meta.url);
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const { IncrementalCache } = require('next/dist/server/lib/incremental-cache/index.js');
const { nodeFs } = require('next/dist/server/lib/node-fs-methods.js');
const nextCache = require('next/cache');
const ts = require('typescript');
const cacheDir = mkdtempSync(path.join(tmpdir(), 'sitemap-cache-check-'));
const makeCache = () => new IncrementalCache({
  fs: nodeFs, dev: false, flushToDisk: true, minimalMode: false,
  serverDistDir: path.join(cacheDir, 'server'), requestHeaders: {}, maxMemoryCacheSize: 0,
  getPrerenderManifest: () => ({ version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: { previewModeId: 'test' } }),
});
globalThis.__incrementalCache = makeCache();
function loadTs(name, dependencies) {
  const file = new URL(`../src/util/${name}.ts`, import.meta.url);
  const mod = new Module(file.pathname);
  mod.require = id => dependencies[id] ?? require(id);
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, file.pathname);
  return mod.exports;
}
let crawls = 0;
let failSource = false;
const staticEntry = { section: 'static', url: 'https://protein.tn/' };
const sitemapData = loadTs('sitemapData', {
  'next/cache': nextCache,
  '@/util/sitemapCachePayload': { encodeSitemapCache, decodeSitemapCache },
  '@/util/sitemapSources': {
    loadSharedContext: async () => ({ ctx: {}, note: '[fixture] shared context' }),
    SITEMAP_SOURCES: [{ id: 'static', section: 'static', critical: true, load: async () => ({
      entries: [staticEntry], verified: true, note: '[fixture] static',
    }) }, { id: 'products', section: 'products', critical: true, load: async () => {
      crawls++;
      if (failSource) throw new Error('fixture source unavailable');
      return { entries, verified: true, note: '[fixture] products' };
    } }],
  },
});
const beforeXml = loadTs('sitemapXml', { '@/util/sitemapData': { getSitemapEntries: async () => [staticEntry, ...entries] } });
const afterXml = loadTs('sitemapXml', { '@/util/sitemapData': sitemapData });
await Promise.all(Array.from({ length: 8 }, () => sitemapData.getSitemapEntries()));
assert.equal(crawls, 1, 'concurrent cold requests must share one crawl');
globalThis.__incrementalCache = makeCache();
const manifest = await afterXml.getSitemapManifest();
assert.equal(afterXml.renderSitemapIndex(manifest), beforeXml.renderSitemapIndex(await beforeXml.getSitemapManifest()));
for (const f of manifest) {
  assert.equal(afterXml.renderUrlSet(await afterXml.getEntriesForFile(f.file)),
    beforeXml.renderUrlSet(await beforeXml.getEntriesForFile(f.file)), `${f.file} XML must be byte-identical`);
}
assert.equal(crawls, 1, 'a fresh cache instance must read the stored snapshot from disk');
assert.equal(readdirSync(path.join(cacheDir, 'cache/fetch-cache')).length, 1);
await globalThis.__incrementalCache.revalidateTag('sitemap');
failSource = true;
await assert.rejects(sitemapData.getSitemapEntries(), /fixture source unavailable/);
failSource = false;
await sitemapData.getSitemapEntries();
assert.equal(crawls, 3, 'tag invalidation must reload; a rejection must not pin inFlight');
console.log('PASS: actual Next cache persistence, concurrent crawl sharing, tag invalidation, failure recovery and byte-identical fixture XML');
