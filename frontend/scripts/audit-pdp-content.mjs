#!/usr/bin/env node
/**
 * audit:pdp — measure how much content each product page actually shows Google.
 *
 * WHY THIS EXISTS
 * Nothing in scripts/ measured product content depth. The numbers quoted in
 * protein.tn/AUDIT-2026-07-31.md came from scratchpad scripts that are not in the repo, so they
 * could not be re-run and nobody could tell whether a content push had landed. Every stage of the
 * product-content programme is judged against this file.
 *
 * WHY IT SENDS A GOOGLEBOT USER-AGENT
 * middleware.ts:339 detects crawler UAs and REWRITES /{subcat}/{slug} to /x-crawler/product/{slug}.
 * Googlebot never renders ProductDetailClient.tsx. An audit run with a browser UA therefore measures
 * a page Google has never seen — it would have reported a populated "Valeurs nutritionnelles" tab
 * on products whose nutrition_values column is empty, because the client view renders the tab LABEL
 * unconditionally and only the crawler view renders the section conditionally.
 *
 * Because that distinction is the whole point, the script ASSERTS it reached the crawler view
 * (assertCrawlerView below) and aborts rather than reporting numbers for the wrong page. A checker
 * that never enters the state it is checking reports green for looking at nothing.
 *
 * WHY A RATCHET BASELINE
 * The interesting question is never "what is the number" but "did it get worse". The baseline
 * records per-product body words and the catalogue-wide coverage of each content surface; both are
 * FLOORS. Coverage may never fall, a product may never lose words, and a product that is not in the
 * baseline at all (i.e. newly added) must clear MIN_NEW_PRODUCT_WORDS on its own. Floors auto-raise
 * when they improve, so progress cannot be silently undone.
 *
 * Usage:
 *   node scripts/audit-pdp-content.mjs                 check against the baseline (this is the gate)
 *   node scripts/audit-pdp-content.mjs --report        rank the thinnest pages — the work queue
 *   node scripts/audit-pdp-content.mjs --update        (re)generate the baseline; review the diff
 *   node scripts/audit-pdp-content.mjs --limit 20      quick sample while iterating
 *   node scripts/audit-pdp-content.mjs --json out.json write the full per-product record
 *   node scripts/audit-pdp-content.mjs --base http://localhost:3000
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'pdp-content-baseline.json');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const BASE = (value('--base', 'https://protein.tn')).replace(/\/$/, '');
const LIMIT = Number(value('--limit', '0')) || 0;
const CONCURRENCY = Number(value('--concurrency', '4')) || 4;
const JSON_OUT = value('--json', '');

/** Real Googlebot UA — isCrawler.ts matches on `googlebot`. */
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/**
 * A product below this is thin content, which docs/architecture/seo-engine.md and
 * ProductContentGenerator both identify as the cause of "Crawled — currently not indexed".
 * ProductContentGenerator discards its own output under 120 words and targets 250-400, so 250 is
 * the bar a newly added product has to clear without needing a baseline entry.
 */
const MIN_NEW_PRODUCT_WORDS = 250;

/* ------------------------------------------------------------------ fetching */

async function fetchText(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    if (res.status === 429 || res.status >= 500) throw new Error(`status ${res.status}`);
    return { status: res.status, url: res.url, html: await res.text() };
  } catch (err) {
    if (attempt >= 3) throw err;
    await new Promise((r) => setTimeout(r, 2 ** attempt * 500 + Math.random() * 250));
    return fetchText(url, attempt + 1);
  }
}

const CRAWLER_MARKER = /aria-label="Prix et disponibilit/i;

/**
 * The edge occasionally hands a bot request the human variant: Cloudflare's free plan ignores
 * `Vary`, so one cache entry can serve both audiences (see docs/CLOUDFLARE-CACHE-RULES.md). It is
 * intermittent — a 309-page run hit it exactly once, and the same URL was correct on retry.
 *
 * Retrying is the honest response: aborting a whole run on one stale cache entry is noise, but
 * silently measuring the human variant is the failure this script exists to prevent. Persistent
 * misses still abort, and the retry count is reported because a rising number is a real edge-cache
 * problem the owner needs to see.
 */
let crawlerRetries = 0;
async function fetchAsCrawler(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchText(url);
    if (res.status !== 200 || CRAWLER_MARKER.test(res.html)) return res;
    crawlerRetries++;
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return fetchText(url);
}

async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) {
        out[i] = await fn(items[i], i);
        if (!process.env.CI && items.length > 20 && i % 25 === 0) {
          process.stderr.write(`  …${i}/${items.length}\n`);
        }
      }
    })
  );
  return out;
}

/* ------------------------------------------------------------------ parsing */

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const words = (text) => (text ? text.split(' ').filter((w) => w.length > 1).length : 0);

/** Pull one `<section aria-label="X">…</section>`. The crawler view labels every block. */
function section(html, label) {
  const re = new RegExp(
    `<section[^>]*aria-label="${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([\\s\\S]*?)<\\/section>`,
    'i'
  );
  return html.match(re)?.[1] ?? null;
}

/**
 * GS1 mod-10 check digit. Weights alternate 3,1 from the rightmost body digit.
 * Mirrors filament/app/Support/Gtin.php — if you change one, change both.
 * A valid check digit proves the identifier is well-formed; it does NOT prove the barcode belongs
 * to this product. Only a GS1 or supplier record can do that.
 */
export function isValidGtin(raw) {
  const s = String(raw ?? '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(s.length)) return false;
  const d = [...s].map(Number);
  const check = d.pop();
  let sum = 0;
  d.reverse().forEach((n, i) => { sum += n * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * CrawlerProductView.tsx:101 renders `Référence : {sku}` where sku falls back
 * sku -> code_product -> id. React emits a `<!-- -->` separator before the interpolated value,
 * which is why a naive /Référence\s*:\s*\d+/ never matches.
 */
function reference(html) {
  const m = html.match(/R[ée]f[ée]rence\s*:\s*(?:<!--\s*-->)?\s*([^<\s][^<]*?)\s*</i);
  return m ? m[1].trim() : '';
}

function jsonLdTypes(html) {
  const types = new Set();
  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === 'object') {
          if (typeof node['@type'] === 'string') types.add(node['@type']);
          Object.values(node).forEach(walk);
        }
      };
      walk(JSON.parse(m[1]));
    } catch {
      types.add('__PARSE_ERROR__');
    }
  }
  return types;
}

/**
 * The crawler view is the only template that emits this section. If it is absent we were served
 * ProductDetailClient.tsx instead, every conditional section below would be measured wrong, and the
 * run must abort rather than publish numbers for a page Google does not receive.
 */
function assertCrawlerView(sample) {
  // 0 of 0 pages reaching the crawler view is not a pass — it means nothing was fetched.
  if (!sample.length) {
    console.error('\nABORT — no product page returned 200. Nothing was measured.\n');
    process.exit(2);
  }
  const reached = sample.filter((r) => r.isCrawlerView).length;
  if (crawlerRetries) {
    console.log(
      `\naudit:pdp — the edge served the human variant to a bot request ${crawlerRetries} time(s); ` +
        'retried. A rising count means the Cloudflare cache is collapsing bot and human HTML.'
    );
  }
  if (reached === sample.length) return;
  console.error(
    `\nABORT — the Googlebot UA did not reach the crawler view on ${sample.length - reached}/${sample.length} pages.`
  );
  console.error('Expected <section aria-label="Prix et disponibilité"> from CrawlerProductView.tsx.');
  console.error('Either middleware.ts:339 stopped matching this UA, or an edge cache served the');
  console.error('human variant to a bot request (Vary is ignored on the free Cloudflare plan).');
  console.error('Measuring the client view here would report nutrition/FAQ sections that Google');
  console.error('never sees, so no numbers are written.\n');
  process.exit(2);
}

function measure(url, html, status) {
  const isCrawlerView = /aria-label="Prix et disponibilit/i.test(html);

  const descHtml = section(html, 'Description');
  const nutriHtml = section(html, 'Valeurs nutritionnelles');
  const faqHtml = section(html, 'Questions fréquentes');
  const reviewsHtml = section(html, 'Avis clients');
  const similarHtml = section(html, 'Produits similaires');
  const comparisonHtml = section(html, 'Comparatif');

  const types = jsonLdTypes(html);
  const ldProduct = html.match(/"@type"\s*:\s*"Product"[\s\S]{0,4000}/)?.[0] ?? '';

  const ref = reference(html);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1]));
  const title = strip(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');

  // "2,267 g" in the H1 while the title says "2.267 kg" is a live data error, not a rendering bug.
  const unit = (s) => (/\b\d[\d.,]*\s*kg\b/i.test(s) ? 'kg' : /\b\d[\d.,]*\s*g\b/i.test(s) ? 'g' : null);
  const h1Unit = unit(h1s[0] ?? '');
  const titleUnit = unit(title);

  return {
    url,
    status,
    isCrawlerView,
    // Body = the product's own prose, excluding chrome, related products and review text.
    bodyWords: words(strip(descHtml ?? '')) + words(strip(nutriHtml ?? '')) + words(strip(faqHtml ?? '')),
    descriptionWords: words(strip(descHtml ?? '')),
    hasDescription: Boolean(descHtml),
    hasNutrition: Boolean(nutriHtml),
    nutritionWords: words(strip(nutriHtml ?? '')),
    // A transcribed Supplement Facts panel, distinguishable from prose that merely mentions
    // nutrition. The builder always emits this wrapper, so its presence means real label data.
    hasSupplementPanel: /class="supplement-facts"/.test(nutriHtml ?? ''),
    // Photographs of the printed panel. For EU brands that publish no machine-readable panel
    // anywhere, this is often the only evidence that exists — and it was invisible to Googlebot
    // until the crawler view started rendering it.
    nutritionImages: nutriHtml ? [...nutriHtml.matchAll(/<img\s/gi)].length : 0,
    // Body rows only: a header row would make an empty table look populated.
    comparisonRows: comparisonHtml ? [...comparisonHtml.matchAll(/<tr[^>]*>\s*<th scope="row"/gi)].length : 0,
    faqCount: faqHtml ? [...faqHtml.matchAll(/<dt[^>]*>/gi)].length : 0,
    hasReviews: Boolean(reviewsHtml),
    similarLinks: similarHtml ? [...similarHtml.matchAll(/<a\s[^>]*href=/gi)].length : 0,
    ldFaqPage: types.has('FAQPage'),
    ldProduct: types.has('Product'),
    ldBreadcrumb: types.has('BreadcrumbList'),
    ldNutrition: types.has('NutritionInformation'),
    ldVideo: types.has('VideoObject'),
    ldAggregateRating: /"aggregateRating"\s*:/.test(html),
    ldParseError: types.has('__PARSE_ERROR__'),
    hasGtin: /"gtin(?:8|12|13|14)?"\s*:\s*"/.test(ldProduct),
    reference: ref,
    /**
     * A barcode already sitting in sku/code_product that we simply never recognised. This is the
     * free half of Stage 1: recoverable without anyone walking the warehouse.
     */
    refIsGtin: isValidGtin(ref),
    h1Count: h1s.length,
    unitMismatch: Boolean(h1Unit && titleUnit && h1Unit !== titleUnit),
  };
}

/* ------------------------------------------------------------------ run */

async function collectUrls() {
  const { html: xml } = await fetchText(`${BASE}/sitemaps/products-0.xml`);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!urls.length) {
    console.error(`ABORT — ${BASE}/sitemaps/products-0.xml returned no <loc> entries.`);
    process.exit(2);
  }
  return LIMIT ? urls.slice(0, LIMIT) : urls;
}

const key = (url) => url.replace(/^https?:\/\/[^/]+/, '');

function coverage(rows) {
  const n = rows.length;
  const pct = (f) => Math.round((rows.filter(f).length / n) * 1000) / 10;
  return {
    products: n,
    faqSchemaPct: pct((r) => r.ldFaqPage),
    faqTextPct: pct((r) => r.faqCount > 0),
    nutritionPct: pct((r) => r.hasNutrition),
    gtinPct: pct((r) => r.hasGtin),
    refIsGtinPct: pct((r) => r.refIsGtin),
    nutritionSchemaPct: pct((r) => r.ldNutrition),
    videoSchemaPct: pct((r) => r.ldVideo),
    hasDescriptionPct: pct((r) => r.hasDescription),
    /**
     * hasDescriptionPct reads 100% and always will: it asks whether a Description SECTION rendered,
     * and one is rendered for a one-word description. Three products have exactly that. A metric
     * that cannot fail is not measuring anything, so this is the one that actually tracks whether
     * a customer learns something.
     */
    thinDescriptionPct: pct((r) => r.descriptionWords < 150),
    // Real transcribed panels and label photographs — the two surfaces Stage 3 fills.
    supplementPanelPct: pct((r) => r.hasSupplementPanel),
    nutritionImagePct: pct((r) => r.nutritionImages > 0),
    // The comparison table. Unlike everything above it needs no external data, so once deployed it
    // should approach 100% on any product with at least two priced siblings — which makes it the
    // one metric here that measures the deploy rather than the data-entry backlog.
    comparisonPct: pct((r) => r.comparisonRows >= 3),
    under250WordsPct: pct((r) => r.bodyWords < 250),
  };
}

/** Coverage floors may only rise; these are ceilings and may only fall. */
const CEILINGS = new Set(['under250WordsPct', 'thinDescriptionPct']);

function main(rows) {
  rows.sort((a, b) => a.bodyWords - b.bodyWords);
  const cov = coverage(rows);

  console.log(`\naudit:pdp — ${BASE}, as Googlebot, ${rows.length} products\n`);
  const bw = rows.map((r) => r.bodyWords);
  const at = (p) => bw[Math.min(bw.length - 1, Math.floor(bw.length * p))];
  console.log(`  body words   min ${bw[0]} · p25 ${at(0.25)} · median ${at(0.5)} · p75 ${at(0.75)} · max ${bw[bw.length - 1]}`);
  for (const [k, v] of Object.entries(cov)) {
    if (k === 'products') continue;
    console.log(`  ${k.padEnd(22)} ${String(v).padStart(5)}%`);
  }

  const broken = rows.filter((r) => r.status !== 200);
  const multiH1 = rows.filter((r) => r.h1Count !== 1);
  const mismatched = rows.filter((r) => r.unitMismatch);
  const noDesc = rows.filter((r) => !r.hasDescription);
  const ldBroken = rows.filter((r) => r.ldParseError || !r.ldProduct);

  if (broken.length) console.log(`\n  non-200            ${broken.length}: ${broken.slice(0, 5).map((r) => key(r.url)).join(', ')}`);
  if (noDesc.length) console.log(`  NO description     ${noDesc.length}: ${noDesc.slice(0, 5).map((r) => key(r.url)).join(', ')}`);
  if (multiH1.length) console.log(`  h1 count != 1      ${multiH1.length}: ${multiH1.slice(0, 5).map((r) => `${key(r.url)}(${r.h1Count})`).join(', ')}`);
  if (mismatched.length) console.log(`  title/H1 unit clash ${mismatched.length}: ${mismatched.slice(0, 5).map((r) => key(r.url)).join(', ')}`);
  if (ldBroken.length) console.log(`  Product JSON-LD bad ${ldBroken.length}: ${ldBroken.slice(0, 5).map((r) => key(r.url)).join(', ')}`);

  if (flag('--report')) {
    console.log('\n  thinnest pages — the work queue\n');
    console.log('    words  faq  nutri  gtin  page');
    for (const r of rows.slice(0, 40)) {
      console.log(
        `    ${String(r.bodyWords).padStart(5)}  ${String(r.faqCount).padStart(3)}  ` +
          `${(r.hasNutrition ? 'yes' : ' - ').padStart(5)}  ${(r.hasGtin ? 'yes' : ' - ').padStart(4)}  ${key(r.url)}`
      );
    }
  }

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, coverage: cov, products: rows }, null, 2) + '\n');
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  const snapshot = {
    coverage: cov,
    products: Object.fromEntries(rows.map((r) => [key(r.url), r.bodyWords])),
  };

  if (flag('--update')) {
    fs.writeFileSync(BASELINE, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`\naudit:pdp — baseline written to ${path.relative(ROOT, BASELINE)}. Review the diff.\n`);
    return 0;
  }

  if (!fs.existsSync(BASELINE)) {
    console.log('\naudit:pdp — no baseline yet. Run with --update to record one.\n');
    return 0;
  }

  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const failures = [];

  for (const [k, v] of Object.entries(base.coverage)) {
    if (k === 'products') continue;
    const now = cov[k] ?? 0;
    const worse = CEILINGS.has(k) ? now > v : now < v;
    if (worse) failures.push(`coverage ${k}: ${v}% -> ${now}%`);
  }

  // A partial run (--limit) samples the catalogue, so per-product floors still apply but
  // catalogue-wide coverage does not — a 20-product sample is not a coverage measurement.
  if (LIMIT) failures.length = 0;

  for (const r of rows) {
    const k = key(r.url);
    const was = base.products[k];
    if (was === undefined) {
      if (r.bodyWords < MIN_NEW_PRODUCT_WORDS) {
        failures.push(`NEW product below ${MIN_NEW_PRODUCT_WORDS} words: ${k} (${r.bodyWords})`);
      }
    } else if (r.bodyWords < was) {
      failures.push(`content lost: ${k} ${was} -> ${r.bodyWords} words`);
    }
  }

  if (failures.length) {
    console.error('\nREGRESSIONS\n');
    failures.slice(0, 40).forEach((f) => console.error(`  ${f}`));
    if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
    console.error('\nIf a drop is intentional, say why in the PR and re-run with --update.\n');
    return 1;
  }

  // Ratchet: lock in improvements so they cannot be silently undone later.
  let raised = 0;
  const next = JSON.parse(JSON.stringify(base));
  if (!LIMIT) {
    for (const [k, v] of Object.entries(cov)) {
      const better = CEILINGS.has(k) ? v < (next.coverage[k] ?? 100) : v > (next.coverage[k] ?? 0);
      if (k !== 'products' && better) { next.coverage[k] = v; raised++; }
    }
    next.coverage.products = cov.products;
  }
  for (const r of rows) {
    const k = key(r.url);
    if (next.products[k] === undefined || r.bodyWords > next.products[k]) {
      next.products[k] = r.bodyWords;
      raised++;
    }
  }
  if (raised) {
    fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
    console.log(`\naudit:pdp — clean. ${raised} floor(s) raised.\n`);
  } else {
    console.log('\naudit:pdp — clean. Baseline holding.\n');
  }
  return 0;
}

const urls = await collectUrls();
console.error(`audit:pdp — fetching ${urls.length} product pages as Googlebot…`);
const rows = await mapWithConcurrency(urls, CONCURRENCY, async (url) => {
  try {
    const { html, status } = await fetchAsCrawler(url);
    return measure(url, html, status);
  } catch (err) {
    return { url, status: 0, isCrawlerView: true, bodyWords: 0, descriptionWords: 0,
      hasDescription: false, hasNutrition: false, nutritionWords: 0,
      hasSupplementPanel: false, nutritionImages: 0, comparisonRows: 0, faqCount: 0, hasReviews: false,
      similarLinks: 0, ldFaqPage: false, ldProduct: false, ldBreadcrumb: false, ldNutrition: false,
      ldVideo: false, ldAggregateRating: false, ldParseError: true, hasGtin: false,
      reference: '', refIsGtin: false, h1Count: 0, unitMismatch: false, error: String(err).slice(0, 120) };
  }
});

assertCrawlerView(rows.filter((r) => r.status === 200));
process.exit(main(rows));
