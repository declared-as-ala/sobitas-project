/**
 * MANUAL audit (not in prebuild): does each curated brand entry still match the live catalogue?
 *
 *   node scripts/audit-brand-copy-live.mjs [slug …]
 *
 * For every key of src/config/brandSeoConfig.ts (or only the slugs given) it reads, with
 * read-only GETs against the public API:
 *   /api/all_brands?page=N&per_page=100              → the brand row, matched by brandNameToSlug
 *   /api/productsByBrandId/{id}?page=N&per_page=100   → the whole listing (products_meta.last_page)
 * and prints:
 *   - the live total and the in-stock count (qte > 0 and not rupture);
 *   - every literal total the copy writes before « références » / « produits » / « fiches » (digits or French
 *     number words) that differs from the live total — candidates for {nbProduits};
 *   - every in-stock product whose first two significant name words appear nowhere in introHtml,
 *     howToChooseBody or the FAQs — products a shopper can buy today that the copy never names;
 *   - (all brands, not only curated ones) every logo heavier than 20 KB. Logos are served as stored — the brand header's plain <img> and the /brands plates
 *     skip the optimizer so the <img> URL equals Brand.logo — so an oversized upload ships whole
 *     into an 80–160 px box (06/10/2026: Muscle Care 134 KB at 937×500, William Bonac 78 KB at
 *     1037×1278). The fix is an owner re-export at ≤400 px in the admin, not code.
 * Always exits 0: it reports, it does not gate.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}

const API = 'https://admin.protein.tn/api';
const configFile = path.join(root, 'src', 'config', 'brandSeoConfig.ts');
const { getBrandSeoEntry } = loadTs(configFile);
const { brandNameToSlug } = loadTs(path.join(root, 'src', 'util', 'brandSlug.ts'));

const source = fs.readFileSync(configFile, 'utf8');
const body = source.slice(source.indexOf('const BRAND_SEO_CONFIG'), source.indexOf('export function getBrandSeoEntry'));
const allKeys = [...body.matchAll(/^ {2}['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((match) => match[1]);
const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const keys = wanted.length ? allKeys.filter((key) => wanted.includes(key)) : allKeys;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' } });
      if (response.ok) return await response.json();
      if (response.status < 500 && response.status !== 429) throw new Error(`${response.status} ${url}`);
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await sleep(800 * attempt);
  }
  throw new Error(`unreachable ${url}`);
}

async function allBrands() {
  const rows = [];
  for (let page = 1; page <= 50; page += 1) {
    const json = await getJson(`${API}/all_brands?page=${page}&per_page=100`);
    const list = Array.isArray(json?.data) ? json.data : [];
    rows.push(...list);
    if (!list.length || page >= Number(json?.meta?.last_page ?? 1)) break;
    await sleep(150);
  }
  return rows;
}

async function brandProducts(id) {
  const rows = [];
  for (let page = 1; page <= 50; page += 1) {
    const json = await getJson(`${API}/productsByBrandId/${id}?page=${page}&per_page=100`);
    const list = Array.isArray(json?.products) ? json.products : Array.isArray(json?.products?.data) ? json.products.data : [];
    rows.push(...list);
    if (!list.length || page >= Number(json?.products_meta?.last_page ?? 1)) break;
    await sleep(150);
  }
  return rows;
}

const fold = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const plain = (html) => fold(String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '));
const isRupture = (value) => value === true || value === 1 || value === '1';
const inStock = (product) => Number(product?.qte ?? 0) > 0 && !isRupture(product?.rupture);

/* French number words up to 99 — enough for « vingt-sept références ». */
const UNITS = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const TENS = { vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
function frenchNumber(words) {
  const parts = fold(words).split(/[\s-]+/).filter((part) => part && part !== 'et');
  let total = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === 'quatre' && /^vingts?$/.test(parts[i + 1] ?? '')) { total += 80; i += 1; continue; }
    if (part in TENS) total += TENS[part];
    else if (part in UNITS) total += UNITS[part];
    else return null;
  }
  return total || null;
}
const NUMBER_WORD = '(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante)';
const LITERAL_TOTAL = new RegExp(`(?<![\\p{L}\\d,.])(\\d+|${NUMBER_WORD}(?:[\\s-](?:et[\\s-])?${NUMBER_WORD})*)\\s+(références|produits|fiches)\\b`, 'giu');

const STOP = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'avec', 'pour', 'sans', 'the', 'and', 'with', 'for', 'of',
  'kg', 'g', 'mg', 'mcg', 'ml', 'l', 'lb', 'lbs', 'caps', 'capsules', 'gelules', 'tabs', 'tablets', 'comprimes', 'softgels',
  'servings', 'portions', 'doses', 'pack', 'new', 'nouveau',
]);
function significantWords(name, brandWords) {
  return fold(name).split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !/^\d+$/.test(word) && !/^\d+(?:[a-z]{1,4})$/.test(word) && !STOP.has(word) && !brandWords.has(word))
    .slice(0, 2);
}

const brands = await allBrands();
const bySlug = new Map(brands.map((brand) => [brandNameToSlug(brand.designation_fr), brand]));
console.log(`Live audit of ${keys.length} curated brand entries against ${brands.length} brands (${new Date().toISOString().slice(0, 10)})\n`);

for (const key of keys) {
  const entry = getBrandSeoEntry(key);
  const brand = bySlug.get(key);
  if (!brand) {
    console.log(`${key}: NO brand row resolves to this slug in /all_brands`);
    continue;
  }
  let products;
  try {
    products = await brandProducts(brand.id);
  } catch (error) {
    console.log(`${key} (id ${brand.id}): listing unavailable — ${error.message}`);
    continue;
  }
  const total = products.length;
  const stocked = products.filter(inStock);
  console.log(`${key} (id ${brand.id}): ${total} au catalogue, ${stocked.length} en stock`);

  const copyFields = [entry.metaDescription, entry.introHtml, entry.howToChooseBody, ...entry.faqs.flatMap((faq) => [faq.question, faq.answer])];
  const seen = new Set();
  for (const field of copyFields) {
    const textOnly = String(field ?? '').replace(/<[^>]*>/g, ' ');
    for (const match of textOnly.matchAll(LITERAL_TOTAL)) {
      const value = /^\d+$/.test(match[1]) ? Number(match[1]) : frenchNumber(match[1]);
      if (value == null || value === total || seen.has(match[0])) continue;
      seen.add(match[0]);
      console.log(`  copy says « ${match[0]} » — live total is ${total}`);
    }
  }

  const copyText = plain([entry.introHtml, entry.howToChooseBody, ...entry.faqs.flatMap((faq) => [faq.question, faq.answer])].join(' '));
  // « Nitro-Tech » in the copy names « NITROTECH » in the catalogue: also match with separators removed.
  const copyCompact = copyText.replace(/[^a-z0-9]+/g, '');
  const brandWords = new Set(fold(`${brand.designation_fr} ${key}`).split(/[^a-z0-9]+/).filter(Boolean));
  for (const product of stocked) {
    const words = significantWords(product.designation_fr, brandWords);
    if (!words.length) continue;
    const missing = words.filter((word) => !copyText.includes(word) && !copyCompact.includes(word));
    if (missing.length > 0) {
      console.log(`  in stock, not named: ${String(product.designation_fr).replace(/\s+/g, ' ').trim()} [missing: ${missing.join(' ')}]`);
    }
  }
  await sleep(150);
}

/* ── logo weight (every brand with a logo) ── */
// Bytes, not pixels: a 1200×472 wordmark of 9 KB costs nothing; a 937×500 one of 131 KB does.
const LOGO_MAX_BYTES = 20 * 1024;
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { /* dimensions skipped without sharp */ }
const logoUrl = (logo) => {
  const value = String(logo ?? '').trim();
  if (!value) return '';
  if (/^https?:\/\//.test(value)) return value;
  return `https://protein.tn/media/${value.replace(/^\/+/, '').replace(/^storage\//, '')}?m=1`;
};
const heavy = [];
for (const brand of brands.filter((row) => row?.logo)) {
  const url = logoUrl(brand.logo);
  try {
    const response = await fetch(url);
    if (!response.ok) { heavy.push(`  ${brand.designation_fr} (id ${brand.id}): logo answers ${response.status} — ${url}`); continue; }
    const bytes = Buffer.from(await response.arrayBuffer());
    const meta = sharp ? await sharp(bytes).metadata().catch(() => null) : null;
    if (bytes.length > LOGO_MAX_BYTES) {
      const size = meta ? ` at ${meta.width}×${meta.height}` : '';
      heavy.push(`  ${brand.designation_fr} (id ${brand.id}): ${(bytes.length / 1024).toFixed(1)} KB${size} — re-export at ≤400 px — ${url}`);
    }
  } catch (error) {
    heavy.push(`  ${brand.designation_fr} (id ${brand.id}): logo unreadable — ${error.message}`);
  }
  await sleep(100);
}
console.log(`
Logos over ${LOGO_MAX_BYTES / 1024} KB: ${heavy.length}`);
for (const line of heavy) console.log(line);

process.exitCode = 0;
