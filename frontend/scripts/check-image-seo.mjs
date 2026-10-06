#!/usr/bin/env node
/**
 * Image SEO guard — the three site-wide image defects measured 05/10/2026, when Google Images had
 * grown to ~40% of all impressions (727 clicks / 34.2K impressions in 28 days; product pages host
 * 953 of the ranking images):
 *
 *   (a) `max-image-preview:large` was lost on every product, brand, category and blog page: Next.js
 *       REPLACES the root layout's `robots.googleBot` whenever a page sets its own `robots`.
 *       → util/robotsDirectives.ts `seoRobots`, used by productRobots and the category route.
 *   (b) product alts were the backend template « {designation_fr} — {brand} — Tunisie »: brand
 *       twice, all caps, mojibake kept after renames (« OPTI-WOMEN â€“ 120CAPS — … »).
 *       → util/productAlt.ts `productImageAlt` / `buildProductAlt` on both renders.
 *   (c) brand logo alts were one boilerplate sentence on 584 logos.
 *       → `buildBrandAlt` « Logo Optimum Nutrition ».
 *
 * Offline: loads the real TypeScript sources with the installed compiler (same loader as
 * check-brand-template.mjs). The fixtures are rows copied from the live, read-only
 * https://admin.protein.tn/api/product_details/{slug} on 06/10/2026.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

globalThis.fetch = () => { throw new Error('Offline image SEO guard: network forbidden'); };
process.env.NEXT_PUBLIC_STORAGE_URL ??= 'https://admin.protein.tn/storage';
process.env.NEXT_PUBLIC_BASE_URL ??= 'https://protein.tn';

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
const src = (file) => path.join(root, 'src', file);

const { seoRobots } = loadTs(src('util/robotsDirectives.ts'));
const { productRobots } = loadTs(src('util/productIndexability.ts'));
const { isGeneratedAlt, productImageAlt, buildProductAlt, buildBrandAlt } = loadTs(src('util/productAlt.ts'));
const { buildBrandSchema, buildCollectionPageSchema, buildProductJsonLd } = loadTs(src('util/structuredData.ts'));

// ── (a) robots: the preview directives survive a page-level robots, noindex stays noindex ──────
assert.equal(seoRobots(true).googleBot['max-image-preview'], 'large');
assert.equal(seoRobots(true).googleBot['max-snippet'], -1);
assert.equal(seoRobots(true).googleBot['max-video-preview'], -1);
assert.equal(seoRobots(true).follow, true, 'follow defaults to true');
assert.equal(seoRobots(false).googleBot.index, false, 'a noindex page must stay noindex for Googlebot');
assert.equal(seoRobots(false, false).googleBot.follow, false);
assert.equal(productRobots({ publier: 1 }).googleBot['max-image-preview'], 'large');
assert.equal(productRobots({ publier: 1 }).index, true);
assert.equal(productRobots({ publier: 0 }).googleBot.index, false);
assert.equal(productRobots({ publier: 1, seo: { robots: { index: false, follow: true } } }).googleBot.index, false);

// The category route (also the x-crawler category metadata) must build robots through seoRobots.
const categoryRoute = fs.readFileSync(src('app/(shop)/category/[slug]/page.tsx'), 'utf8');
assert.doesNotMatch(categoryRoute, /robots:\s*\{\s*index:/, 'category/[slug] sets a bare robots object — use seoRobots()');
assert.match(categoryRoute, /seoRobots\(/);

// ── (b) product alts ───────────────────────────────────────────────────────────────────────────
assert.equal(isGeneratedAlt('X — Optimum Nutrition — Tunisie'), true);
assert.equal(isGeneratedAlt('X — Tunisie'), true);
assert.equal(isGeneratedAlt('Glutamine Powder 630g Optimum Nutrition – L-glutamine en poudre en Tunisie'), false);
assert.equal(isGeneratedAlt(''), false);
assert.equal(isGeneratedAlt(null), false);

const goldStandard = {
  slug: '100-whey-gold-standard-2-27kg',
  designation_fr: '100% WHEY GOLD STANDARD – 2.27KG',
  alt_cover: '100% WHEY GOLD STANDARD – 2.27KG — Optimum Nutrition — Tunisie',
  seo: { image_alt: '100% WHEY GOLD STANDARD – 2.27KG — Optimum Nutrition — Tunisie' },
  brand: { id: 17, designation_fr: 'Optimum Nutrition' },
};
assert.equal(buildProductAlt(goldStandard), '100% Whey Gold Standard – 2,27 kg – Optimum Nutrition — Tunisie');

const bigWhey = {
  slug: 'big-whey-2kg-big-ramy-labs',
  designation_fr: 'BIG WHEY 2KG - BIG RAMY LABS',
  alt_cover: 'BIG WHEY 2KG - BIG RAMY LABS — BIG RAMY LABS — Tunisie',
  seo: { image_alt: 'BIG WHEY 2KG - BIG RAMY LABS — BIG RAMY LABS — Tunisie' },
  brand: { id: 54, designation_fr: 'BIG RAMY LABS' },
};
const bigWheyMain = productImageAlt(bigWhey, { role: 'main' });
assert.equal((bigWheyMain.match(/big ramy labs/gi) ?? []).length, 1, `brand must appear exactly once: ${bigWheyMain}`);
assert.ok(bigWheyMain.endsWith(' — Tunisie'), bigWheyMain);
assert.equal(bigWheyMain, 'Big Whey 2 kg – Big Ramy Labs — Tunisie');
// A listing projection carries no `brand` relation; the card passes the name it resolved.
const bigWheyCard = buildProductAlt({ slug: bigWhey.slug, designation_fr: bigWhey.designation_fr, alt_cover: bigWhey.alt_cover }, { brand: 'BIG RAMY LABS' });
assert.equal(bigWheyCard, bigWheyMain, 'card and product page must give the same image the same alt');
// The category and /shop grids pass NO brand (rows from /all_products?light=1 carry only brand_id):
// the brand is read back from the template's own segment, so the grid alt still names it.
assert.equal(
  buildProductAlt({ designation_fr: '100% WHEY GOLD STANDARD – 2.27KG', alt_cover: '100% WHEY GOLD STANDARD – 2.27KG — Optimum Nutrition — Tunisie' }),
  '100% Whey Gold Standard – 2,27 kg – Optimum Nutrition — Tunisie',
  'a listing row without a brand relation keeps the brand of its template'
);
assert.equal(
  buildProductAlt({ designation_fr: 'PACK PROFESSIONNEL', alt_cover: 'PACK PROFESSIONNEL — Optimum Nutrition — Tunisie' }, { brand: null }),
  buildProductAlt({ designation_fr: 'PACK PROFESSIONNEL', alt_cover: 'PACK PROFESSIONNEL — Optimum Nutrition — Tunisie' }),
  'crawler (brand: null) and shopper (no brand) grids agree'
);
assert.match(buildProductAlt({ designation_fr: 'PACK PROFESSIONNEL', alt_cover: 'PACK PROFESSIONNEL — Optimum Nutrition — Tunisie' }), /Optimum Nutrition — Tunisie$/);

// One locality token: a name that already says « Tunisie » is not suffixed with it again (live:
// king-real-preworkout-500gr-real-pharm-tunisie, 06/10/2026).
const kingReal = {
  slug: 'king-real-preworkout-500gr-real-pharm-tunisie',
  designation_fr: 'KING REAL PREWORKOUT - 500GR - Real Pharm tunisie',
  alt_cover: 'KING REAL PREWORKOUT - 500GR - Real Pharm tunisie — Real Pharm — Tunisie',
  seo: { image_alt: 'KING REAL PREWORKOUT - 500GR - Real Pharm tunisie — Real Pharm — Tunisie' },
  brand: { id: 21, designation_fr: 'Real Pharm' },
};
assert.equal((buildProductAlt(kingReal).match(/tunisie/gi) ?? []).length, 1, `Tunisie exactly once: ${buildProductAlt(kingReal)}`);
assert.equal(productImageAlt(kingReal, { role: 'main' }), buildProductAlt(kingReal));
assert.ok(buildProductAlt({ ...goldStandard, designation_fr: 'Huile tunisienne 500 ml' }).endsWith(' — Tunisie'), '« tunisienne » is not the locality');

// Live row: an admin wrote both alts; seo.image_alt (the backend's own first choice) wins verbatim.
const glutamine = {
  slug: 'glutamine-powder-630g-optimum-nutrition',
  designation_fr: 'Glutamine Powder 630g - Optimum Nutrition',
  alt_cover: 'Glutamine Powder 630g Optimum Nutrition',
  seo: { image_alt: 'Glutamine Powder 630g Optimum Nutrition – L-glutamine en poudre en Tunisie' },
  brand: { id: 17, designation_fr: 'Optimum Nutrition' },
};
assert.equal(productImageAlt(glutamine, { role: 'main' }), glutamine.seo.image_alt, 'a hand-written seo.image_alt wins for main');
// Listing projections carry alt_cover only: a hand-written one is preserved for main.
const { seo: _glutamineSeo, ...glutamineListing } = glutamine;
assert.equal(productImageAlt(glutamineListing, { role: 'main' }), 'Glutamine Powder 630g Optimum Nutrition', 'a hand-written alt_cover wins for main');
// Non-main roles never reuse a hand-written alt: each photograph is named by its own role.
assert.match(productImageAlt(glutamine, { role: 'gallery', index: 1, total: 2 }), / — photo 2 sur 2$/);

assert.match(productImageAlt(goldStandard, { role: 'gallery', index: 1, total: 5 }), / — photo 2 sur 5$/);
assert.match(productImageAlt(goldStandard, { role: 'label', index: 0 }), / — étiquette 1$/);
assert.match(productImageAlt(goldStandard, { role: 'nutrition' }), / — valeurs nutritionnelles$/);
assert.match(productImageAlt(goldStandard, { role: 'thumb', index: 2 }), / — miniature 3$/);
for (const role of ['gallery', 'label', 'nutrition', 'thumb']) {
  const alt = productImageAlt(bigWhey, { role, index: 0, total: 3 });
  assert.equal((alt.match(/big ramy labs/gi) ?? []).length, 1, `${role}: ${alt}`);
  assert.doesNotMatch(alt, /Tunisie/, `${role} alts carry no locality: ${alt}`);
}

const optiWomen = {
  slug: 'opti-women-120caps',
  designation_fr: 'OPTI-WOMEN – 120CAPS',
  alt_cover: 'OPTI-WOMEN â€“ 120CAPS — Optimum Nutrition — Tunisie',
  seo: { image_alt: 'OPTI-WOMEN â€“ 120CAPS — Optimum Nutrition — Tunisie' },
  brand: { id: 17, designation_fr: 'Optimum Nutrition' },
};
for (const role of ['main', 'gallery', 'label', 'nutrition', 'thumb']) {
  assert.doesNotMatch(productImageAlt(optiWomen, { role, index: 0, total: 2 }), /â€/, `mojibake survived in ${role}`);
}
assert.doesNotMatch(buildProductAlt(goldStandard), /Optimum Nutrition — Optimum Nutrition/);

// ── (c) brand logo alts ────────────────────────────────────────────────────────────────────────
assert.equal(buildBrandAlt('NUTREX RESEARCH'), 'Logo Nutrex Research');
assert.equal(buildBrandAlt('BSN'), 'Logo BSN');
assert.equal(buildBrandAlt('Optimum Nutrition', 'Optimum Nutrition LOGO'), 'Logo Optimum Nutrition');
assert.equal(buildBrandAlt('', ''), 'Logo de marque — Protein.tn');

// ── structured data ────────────────────────────────────────────────────────────────────────────
const brand = buildBrandSchema(
  { designation_fr: 'BIOTECH USA' },
  'https://protein.tn',
  { name: 'BioTech USA', sameAs: ['https://biotechusa.com', 'http://insecure.example', 'not a url'] },
);
assert.equal(brand.name, 'BioTech USA');
assert.equal(brand['@id'], 'https://protein.tn/biotech-usa', 'the display name must never move the @id');
assert.deepEqual(brand.sameAs, ['https://biotechusa.com'], 'sameAs keeps https URLs only');
assert.equal('sameAs' in buildBrandSchema({ designation_fr: 'BSN' }, 'https://protein.tn', { sameAs: [] }), false);
assert.equal(buildBrandSchema({ designation_fr: 'BIOTECH USA' }, 'https://protein.tn').name, 'BIOTECH USA');

const page = buildCollectionPageSchema('x', '/x', 'https://protein.tn', {
  primaryImage: { url: 'https://protein.tn/media/a.webp', caption: 'c' },
});
assert.equal(page.primaryImageOfPage.url, 'https://protein.tn/media/a.webp');
assert.equal(page.primaryImageOfPage.contentUrl, 'https://protein.tn/media/a.webp');
assert.equal(page.primaryImageOfPage.caption, 'c');
assert.equal(page.image, 'https://protein.tn/media/a.webp');
assert.equal('primaryImageOfPage' in buildCollectionPageSchema('x', '/x', 'https://protein.tn'), false);

const productLd = buildProductJsonLd(
  { ...goldStandard, id: 1, prix: 300, qte: 3, publier: 1, cover: 'produits/August2023/pANexavomTnlAOLqswAs.webp' },
  'https://protein.tn/whey-proteine/100-whey-gold-standard-2-27kg',
);
assert.ok(productLd?.associatedMedia?.length >= 1, 'Product JSON-LD declares its cover');
assert.equal(productLd.associatedMedia[0].caption, buildProductAlt(goldStandard), 'caption = the page alt of the same image');
assert.equal('aggregateRating' in productLd, false);

// ── LCP-sensitive images (06/10/2026) ──────────────────────────────────────────────────────────
// The brand logo must not be preloaded ahead of the packshots: React 19 preloads every eager <img>
// except fetchPriority="low".
const brandHeader = fs.readFileSync(src('app/(shop)/brand/BrandHeader.tsx'), 'utf8');
assert.match(brandHeader, /fetchPriority="low"/, 'BrandHeader logo: fetchPriority="low" keeps it out of the head preloads');
// The article cover keeps the declared /media URL in <img src> (overrideSrc) AND the optimizer's
// srcset — `unoptimized` sent the 1280×720 original (57–105 KB) to every phone as the LCP image.
const articleHero = fs.readFileSync(src('app/(shop)/blog/[slug]/ArticleDetailClient.tsx'), 'utf8');
const coverBlock = articleHero.slice(articleHero.indexOf('{/* Cover Image */}'), articleHero.indexOf('{/* Article Content'));
assert.ok(coverBlock.length > 0, 'article cover block found');
assert.match(coverBlock, /overrideSrc=\{getStorageUrl\(article\.cover\)\}/, 'article cover: <img src> = the og:image / sitemap URL');
assert.doesNotMatch(coverBlock, /^\s*unoptimized\s*$/m, 'article cover: no `unoptimized` (it drops the srcset)');
assert.match(fs.readFileSync(src('app/components/SafeImage.tsx'), 'utf8'), /overrideSrc=\{overrideSrc\}/, 'SafeImage forwards overrideSrc to next/image');

console.log('Image SEO: googleBot max-image-preview kept, product alts humanised (brand once, no mojibake, roles), brand logo alts, Brand sameAs and primaryImageOfPage passed.');
