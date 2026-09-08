#!/usr/bin/env node
/**
 * Offline audit of the NON-Product structured data: the page-level nodes, the blog Article, the
 * Brand entity, and — the point of the whole file — whether they reference each other at all.
 *
 * Sibling of check-product-schema.mjs, which owns Product/Offer. Split deliberately: that script
 * runs 36 rules over 40 real product payloads and its table is already dense; this one answers a
 * different question about a different set of templates.
 *
 * Google contracts, references only, NEVER fetched by this script:
 *   https://developers.google.com/search/docs/appearance/structured-data/article
 *   https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 *   https://developers.google.com/search/docs/appearance/structured-data/faqpage
 *   https://developers.google.com/search/docs/appearance/structured-data/carousel
 *   https://developers.google.com/search/docs/appearance/structured-data/local-business
 *   https://developers.google.com/search/docs/appearance/structured-data/sd-policies
 *
 * ── WHAT THIS CAUGHT WHEN IT WAS WRITTEN (08/09/2026) ───────────────────────────────────────
 * Each rule below exists because it FAILED against the code that was live that morning, measured
 * on production rather than guessed:
 *
 *   - author-is-organization  223/223 blog articles said the author was a Person named
 *                             "Protein.tn" — the company, typed as a human being. The guard in
 *                             buildArticleSchema was right; it compared against the wrong string.
 *   - page-node-identified    CollectionPage/WebPage had no @id at all, so nothing could point at
 *                             them and they could point at nothing.
 *   - website-by-reference    every page node carried an ANONYMOUS second WebSite in isPartOf,
 *                             beside the real one layout.tsx emits with @id .../#website.
 *   - references-resolve      breadcrumb/mainEntity references did not exist to resolve.
 *   - brand-entity-defined    every product pointed brand.@id at a brand page that never defined
 *                             the entity.
 *   - brand-views-agree       the crawler brand route said "Produits BIOTECH USA" with no
 *                             description while a browser got the curated title + description.
 *   - one-definition-per-id   /proteine-sousse shipped two byte-identical LocalBusiness blobs.
 *
 * Verify that claim rather than trusting it:
 *     git stash && node scripts/check-graph-schema.mjs ; git stash pop
 *
 * NOT verified here: anything that needs the network or a running app — live rendering, Googlebot
 * access, whether an image URL resolves, indexing, or Search Console state. Live crawler-vs-human
 * parity is scripts/check-crawler-parity.mjs, which now compares the JSON-LD too.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
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
/* Same loader as check-product-schema.mjs, copied rather than imported: importing that module
   runs its whole 80-graph audit and prints its table as a side effect of loading it here. */
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

const src = (p) => path.join(root, 'src', p);
const builders = loadTs(src('util/structuredData.ts'));
const brandJsonLd = loadTs(src('util/brandJsonLd.ts'));
const shopJsonLd = loadTs(src('util/shopJsonLd.ts'));
const { getBrandSeoEntry } = loadTs(src('config/brandSeoConfig.ts'));
const { buildBrandMetaTitle } = loadTs(src('util/brandMeta.ts'));

const base = 'https://protein.tn';
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
/* Source assertions must read CODE. These files are heavily commented — several of the comments
   quote the very construct being asserted against — so a raw substring match reports a builder
   that only appears in a note explaining why it was removed. */
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
// JSON.stringify is what actually ships (every route stringifies these), so audit what ships:
// it drops `undefined` properties, and a rule that ignores that would audit a different object.
const shipped = (node) => JSON.parse(JSON.stringify(node));
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const typeOf = (n) => arr(n?.['@type']);
const nonempty = (v) => typeof v === 'string' && !!v.trim();
const walk = (v, visit) => {
  if (!v || typeof v !== 'object') return;
  if (!Array.isArray(v)) visit(v);
  for (const child of Object.values(v)) walk(child, visit);
};
/* Two ways to state the same image are the same claim. schema.org lets an image-valued property
   be a URL or an inline ImageObject wrapping that URL, and the graph uses both spellings for the
   company logo (a URL on Organization, an ImageObject on the Article publisher). Comparing the
   raw JSON would report a disagreement where there is none, so unwrap before comparing. */
const claim = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)
    && arr(value['@type']).includes('ImageObject')
    && typeof value.url === 'string'
    && Object.keys(value).every((k) => ['@type', 'url', 'contentUrl'].includes(k))) return JSON.stringify(value.url);
  return JSON.stringify(value);
};
/** A node that says something about its @id, versus a bare {"@id": …} pointer. */
const defines = (n) => n['@id'] && Object.keys(n).some((k) => k !== '@id' && k !== '@context');
const nodesOf = (graph) => { const out = []; walk(graph, (n) => out.push(n)); return out; };
const findType = (graph, type) => nodesOf(graph).filter((n) => typeOf(n).includes(type));

/* ── Sitewide nodes: layout.tsx puts these on EVERY page, so every page graph below starts with
      them. A reference to .../#organization or .../#website resolves because of this. */
const sitewide = [
  shipped(builders.buildOrganizationSchema(base)),
  shipped(builders.buildLocalBusinessSchema(base)),
  shipped(builders.buildWebSiteSchema(base)),
];

/* ── Fixtures. Real shapes only: the article author is the exact string the CMS holds on all 223
      posts, and the brand is one with a curated brandSeoConfig entry. */
const ARTICLE = {
  slug: 'whey-protein-en-tunisie',
  designation_fr: 'PROTÉINE en Tunisie : Guide Achat 2026',
  description_fr: '<p>Guide d’achat des protéines en Tunisie.</p>',
  cover: 'articles/whey.webp',
  created_at: '2026-05-12T08:06:49+00:00',
  updated_at: '2026-05-12T19:49:53+00:00',
  // Measured live 08/09/2026: this is the author string on every article in sitemaps/blog.xml.
  seo: { author: 'Protein.tn' },
};
const ARABIC_ARTICLE = {
  ...ARTICLE,
  slug: 'بروتين-تونس',
  designation_fr: 'بروتين واي في تونس: الدليل الكامل',
  description_fr: '<p>دليل شراء البروتين في تونس مع الأسعار والعلامات التجارية المتوفرة.</p>',
};
const HUMAN_BYLINE_ARTICLE = { ...ARTICLE, seo: { author: 'Yassine Ben Ali' } };
const BRAND = { id: 5, designation_fr: 'BioTech USA' };
const BRAND_SLUG = 'biotech-usa';
const PRODUCTS = [
  { id: 1, slug: 'iso-whey-zero-2-27kg', designation_fr: 'ISO WHEY ZERO 2.27 KG', prix: 289,
    cover: 'https://admin.protein.tn/storage/produits/iso.webp', qte: 5, rupture: 0,
    brand: { designation_fr: 'BioTech USA' },
    sous_categories: [{ slug: 'isolat-de-whey' }] },
  { id: 2, slug: '100-pure-whey-1kg', designation_fr: '100% PURE WHEY 1 KG', prix: 159,
    cover: 'https://admin.protein.tn/storage/produits/pure.webp', qte: 2, rupture: 0,
    brand: { designation_fr: 'BioTech USA' },
    sous_categories: [{ slug: 'whey-proteine' }] },
];

/* ── The page graphs, each assembled exactly the way its route assembles it.
 *
 * `safe` because a MISSING builder is a result, not a crash. Running this against an older tree
 * (git stash) is how the failure claims in the header are meant to be verified, and a script that
 * dies on the first absent export proves nothing about the other 41 rules. A throw becomes an
 * empty graph, which every rule below then reports as its own failure with its own message. */
const safe = (label, fn) => {
  try { return fn(); } catch (e) { buildErrors.push(`${label}: ${e.message}`); return []; }
};
const buildErrors = [];
const article = safe('article', () => shipped(builders.buildArticleSchema(ARTICLE, base))) ?? {};
const brandGraph = safe('brand landing', () => brandJsonLd.buildBrandLandingSchemas({ brand: BRAND, products: PRODUCTS, slug: BRAND_SLUG, baseUrl: base }).map(shipped));
const categoryPath = '/whey-proteine';
const categoryGraph = safe('category', () => [
  shipped(builders.buildBreadcrumbListSchema([{ name: 'Accueil', url: '/' }, { name: 'Whey', url: categoryPath }], base, { pageUrl: categoryPath })),
  shipped(builders.buildCollectionPageSchema('Whey protein en Tunisie', categoryPath, base, { description: 'Whey en Tunisie.', withBreadcrumb: true, withItemList: true })),
  shipped(builders.buildItemListSchema(PRODUCTS.map((p) => ({ name: p.designation_fr, url: `/${p.sous_categories[0].slug}/${p.slug}` })), base, { name: 'Whey', pageUrl: categoryPath })),
  ...PRODUCTS.map((p) => shipped(builders.buildProductSchema(p, base))),
]);
const productUrl = `${base}/isolat-de-whey/iso-whey-zero-2-27kg`;
const productGraph = safe('product', () => [
  shipped(builders.buildProductSchema(PRODUCTS[0], base)),
  shipped(builders.buildBreadcrumbListSchema([{ name: 'Accueil', url: '/' }, { name: 'Produit', url: '/isolat-de-whey/iso-whey-zero-2-27kg' }], base, { pageUrl: productUrl })),
  shipped(builders.buildWebPageSchema(PRODUCTS[0].designation_fr, productUrl, base, { description: 'Isolat de whey.', withBreadcrumb: true })),
]);
const shopGraph = safe('shop', () => shopJsonLd.buildShopSchemas({ products: PRODUCTS, categories: [], currentPage: 2, canonicalPath: '/shop?page=2', baseUrl: base }).map(shipped));

const homeGraph = safe('home', () => [
  shipped(builders.buildWebPageSchema('Protéine Tunisie', '/', base, { description: 'Compléments en Tunisie.', withBreadcrumb: true, withItemList: true, about: { '@id': `${base}/#organization` } })),
  shipped(builders.buildBreadcrumbListSchema([{ name: 'Accueil', url: '/' }], base, { pageUrl: '/' })),
  shipped(builders.buildItemListSchema(PRODUCTS.map((p) => ({ name: p.designation_fr, url: `/${p.sous_categories[0].slug}/${p.slug}` })), base, { name: 'Produits en vedette', pageUrl: '/' })),
]);

const pages = {
  '/': [...sitewide, ...homeGraph],
  '/blog/{slug}': [...sitewide, article, ...safe('blog breadcrumb', () => [shipped(builders.buildBreadcrumbListSchema([{ name: 'Accueil', url: '/' }, { name: 'Blog', url: '/blog' }], base, { pageUrl: `${base}/blog/${ARTICLE.slug}` }))])],
  '/{brand}': [...sitewide, ...brandGraph],
  '/{category}': [...sitewide, ...categoryGraph],
  '/{cat}/{product}': [...sitewide, ...productGraph],
  '/shop': [...sitewide, ...shopGraph],
};

/* ────────────────────────────────────────────────────────────────────────────────────────── */
const results = [];
const check = (id, subject, fn) => {
  let ok = false, detail = '';
  try { ok = fn() !== false; } catch (e) { detail = e.message; }
  results.push({ rule: id, subject, ok, detail });
};

// ── Graph connectivity. These run over every page graph above.
for (const [page, graph] of Object.entries(pages)) {
  check('page-node-identified', page, () => {
    // TOP-LEVEL nodes only — each entry is one <script type="application/ld+json"> block. A
    // nested {"@type":"WebPage","@id":canonical} inside an Article's mainEntityOfPage is Google's
    // own documented shape for that property and is not a page node in this sense.
    const nodes = graph.filter((n) => typeOf(n).some((t) => ['WebPage', 'CollectionPage', 'ItemPage', 'AboutPage', 'ContactPage'].includes(t)));
    // A page with no page-level node is fine (the blog article's mainEntityOfPage plays that
    // role); one that HAS a page-level node must give it an identifier others can reference.
    return nodes.every((n) => nonempty(n['@id']) && n['@id'].endsWith('#webpage'));
  });

  check('website-by-reference', page, () => {
    // isPartOf must POINT at the sitewide WebSite, never inline a second anonymous copy of it.
    const parts = nodesOf(graph).flatMap((n) => arr(n.isPartOf));
    return parts.length > 0 && parts.every((p) => p['@id'] === `${base}/#website` && !typeOf(p).includes('WebSite'));
  });

  check('references-resolve', page, () => {
    const defined = new Set(nodesOf(graph).filter(defines).map((n) => n['@id']));
    const dangling = nodesOf(graph)
      .filter((n) => n['@id'] && !defines(n))
      .map((n) => n['@id'])
      .filter((id) => !defined.has(id));
    assert.deepEqual(dangling, [], `unresolved @id references: ${dangling.join(', ')}`);
    return true;
  });

  check('no-conflicting-id-claims', page, () => {
    /* One identifier, one entity. Nodes sharing an @id MERGE, so several may describe it — the
       Article's author, its publisher and the sitewide Organization are all legitimately the same
       company — but they may not DISAGREE. This is what caught the Article publisher declaring
       the 512×512 app icon as the company logo while the Organization node declared /logo.png. */
    const seen = new Map();
    const conflicts = [];
    for (const n of nodesOf(graph).filter(defines)) {
      const previous = seen.get(n['@id']) ?? {};
      for (const [key, value] of Object.entries(n)) {
        if (previous[key] === undefined || key === '@context') continue;
        // Multi-typing (Organization + OnlineStore) is not a conflict; an overlap is enough.
        if (key === '@type' && arr(previous[key]).some((v) => arr(value).includes(v))) continue;
        if (claim(previous[key]) !== claim(value)) conflicts.push(`${n['@id']} .${key}`);
      }
      seen.set(n['@id'], { ...previous, ...n });
    }
    assert.deepEqual(conflicts, [], `nodes sharing an @id disagree: ${conflicts.join(', ')}`);
    return true;
  });

  check('no-rating-anywhere', page, () => {
    // The absolute rule, restated outside the Product audit so it also covers the page nodes,
    // the Brand and the Article: there are no attested product reviews, so no rating may exist.
    let clean = true;
    walk(graph, (n) => {
      if (['aggregateRating', 'review', 'reviews', 'ratingValue'].some((k) => k in n)) clean = false;
      if (typeOf(n).some((t) => ['Review', 'AggregateRating', 'Rating'].includes(t))) clean = false;
    });
    return clean;
  });

  check('declared-links-are-emitted', page, () => {
    // A page node claiming `breadcrumb`/`mainEntity` must actually publish that list — otherwise
    // it advertises structure the crawler cannot find.
    const pageNodes = nodesOf(graph).filter((n) => typeOf(n).some((t) => t.endsWith('Page')));
    const bc = new Set(findType(graph, 'BreadcrumbList').map((n) => n['@id']));
    const il = new Set(findType(graph, 'ItemList').filter(defines).map((n) => n['@id']));
    return pageNodes.every((n) =>
      (!n.breadcrumb || bc.has(n.breadcrumb['@id'])) &&
      (!n.mainEntity || il.has(n.mainEntity['@id']) || arr(n.mainEntity).every((m) => typeOf(m).includes('Question')))
    );
  });
}

// ── BreadcrumbList: Google requires itemListElement with position + name + item.
check('breadcrumb-required-fields', 'all pages', () => {
  for (const graph of Object.values(pages)) {
    for (const bc of findType(graph, 'BreadcrumbList')) {
      const items = arr(bc.itemListElement);
      if (!items.length) return false;
      if (!items.every((it, i) => it['@type'] === 'ListItem' && it.position === i + 1 && nonempty(it.name) && nonempty(it.item) && it.item.startsWith(base))) return false;
    }
  }
  return true;
});

// ── Article. Google's required set is headline + image + datePublished; author/publisher/
//    dateModified are recommended and we hold real values for all of them.
check('article-required-fields', 'BlogPosting', () =>
  nonempty(article.headline) && nonempty(article.image) && nonempty(article.datePublished) &&
  nonempty(article.dateModified) && article.mainEntityOfPage?.['@id']?.startsWith(base));

check('author-is-organization', 'BlogPosting', () => {
  // THE bug this file was written for. "Protein.tn" is the company, not a person.
  assert.equal(article.author['@type'], 'Organization', `author typed ${article.author['@type']} for the brand's own name`);
  assert.equal(article.author['@id'], `${base}/#organization`);
  return true;
});

check('author-person-preserved', 'BlogPosting', () => {
  // The fix must not swallow a genuine human byline into the Organization.
  const a = shipped(builders.buildArticleSchema(HUMAN_BYLINE_ARTICLE, base)).author;
  return a['@type'] === 'Person' && a.name === 'Yassine Ben Ali';
});

check('publisher-and-site-referenced', 'BlogPosting', () =>
  article.publisher['@id'] === `${base}/#organization` &&
  nonempty(article.publisher.name) && nonempty(article.publisher.logo?.url) &&
  article.isPartOf['@id'] === `${base}/#website`);

check('article-language-detected', 'BlogPosting', () =>
  article.inLanguage === 'fr-TN' && shipped(builders.buildArticleSchema(ARABIC_ARTICLE, base)).inLanguage === 'ar');

// ── Brand.
check('brand-entity-defined', '/{brand}', () => {
  const brand = findType(brandGraph, 'Brand').find(defines);
  assert.ok(brand, 'brand landing page defines no Brand entity');
  assert.equal(brand['@id'], `${base}/${BRAND_SLUG}`);
  assert.equal(brand.url, `${base}/${BRAND_SLUG}`);
  assert.ok(nonempty(brand.name));
  return true;
});

check('products-reach-the-brand', '/{brand}', () => {
  // The whole point of the Brand node: the identifier every product already emits must be the
  // one the brand page defines. Both product builders, because they had drifted apart here.
  const brandId = findType(brandGraph, 'Brand').find(defines)['@id'];
  const fallback = shipped(builders.buildProductSchema(PRODUCTS[0], base));
  const backend = shipped(builders.sanitizeBackendProductJsonLd(PRODUCTS[0], { '@type': 'Product', brand: { name: 'BioTech USA' } }, `${base}/isolat-de-whey/iso-whey-zero-2-27kg`));
  assert.equal(fallback.brand['@id'], brandId, 'fallback product builder does not reach the Brand node');
  assert.equal(backend.brand['@id'], brandId, 'backend product builder does not reach the Brand node');
  return true;
});

check('brand-views-agree', '/{brand}', () => {
  /* The crawler route and the human route must build this page's schema from the SAME function.
     They did not, and the CollectionPage name and description diverged on all 55 brand pages.
     A source assertion, because that is where the drift lives — two files, one page. */
  const human = code('src/app/(shop)/[slug]/page.tsx');
  const crawler = code('src/app/x-crawler/category/[slug]/page.tsx');
  assert.ok(human.includes('buildBrandLandingSchemas'), 'human brand route builds its own schema');
  assert.ok(crawler.includes('buildBrandLandingSchemas'), 'crawler brand route builds its own schema');
  assert.ok(!crawler.includes('`Produits ${title}`'), 'crawler brand route still hardcodes its own CollectionPage name');
  // …and the shared function must carry the curated copy, not a generic label.
  const collection = findType(brandGraph, 'CollectionPage')[0];
  assert.equal(collection.name, buildBrandMetaTitle(BRAND.designation_fr));
  assert.equal(collection.description, getBrandSeoEntry(BRAND_SLUG).metaDescription);
  return true;
});

// ── The crawler PDP must publish the same node types as the human PDP.
check('crawler-pdp-node-parity', '/{cat}/{product}', () => {
  const human = code('src/app/(shop)/[slug]/[productSlug]/page.tsx');
  const crawler = code('src/app/x-crawler/product/[...slug]/page.tsx');
  const wanted = ['buildProductJsonLd', 'buildBreadcrumbListSchema', 'buildWebPageSchema', 'buildFAQPageSchemaFromProductFaq', 'buildVideoObjectSchema'];
  const missing = wanted.filter((b) => human.includes(b) && !crawler.includes(b));
  assert.deepEqual(missing, [], `crawler PDP omits: ${missing.join(', ')}`);
  return true;
});

// ── The crawler category route must publish the Product nodes the human one does.
check('crawler-category-node-parity', '/{category}', () => {
  const human = code('src/app/(shop)/category/[slug]/page.tsx');
  const crawler = code('src/app/x-crawler/category/[slug]/page.tsx');
  const wanted = ['buildProductSchema', 'buildItemListSchema', 'buildCollectionPageSchema', 'buildBreadcrumbListSchema', 'buildFAQPageSchemaFromQA'];
  const missing = wanted.filter((b) => human.includes(b) && !crawler.includes(b));
  assert.deepEqual(missing, [], `crawler category omits: ${missing.join(', ')}`);
  return true;
});

// ── Nobody may re-emit a sitewide node that layout.tsx already puts on every page.
check('no-duplicate-sitewide-nodes', 'all routes', () => {
  const offenders = [];
  const walkDir = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walkDir(p); continue; }
      if (!/page\.tsx$/.test(entry.name)) continue;
      if (p.endsWith(path.join('src', 'app', 'layout.tsx'))) continue;
      const body = code(path.relative(root, p));
      if (/build(Organization|LocalBusiness|WebSite)Schema\s*\(/.test(body)) offenders.push(path.relative(root, p));
    }
  };
  walkDir(path.join(root, 'src/app'));
  assert.deepEqual(offenders, [], `sitewide node re-emitted (layout.tsx already ships it): ${offenders.join(', ')}`);
  return true;
});

/* ────────────────────────────────────────────────────────────────────────────────────────── */
for (const e of buildErrors) check('graph-builds', e.split(':')[0], () => { throw new Error(e); });
const failed = results.filter((r) => !r.ok);
console.table(results.map((r) => ({ rule: r.rule, subject: r.subject, result: r.ok ? 'pass' : 'FAIL' })));
if (failed.length) {
  console.error('\nFailures:');
  for (const r of failed) console.error(`  ${r.rule} [${r.subject}] ${r.detail}`);
  console.error(`\n${failed.length} of ${results.length} checks failed.`);
  process.exit(1);
}
console.log(`\ngraph schema — ${results.length} checks clean across ${Object.keys(pages).length} page templates.`);
console.log('NOT VERIFIED offline: live rendering, Googlebot access, image reachability, indexing, Search Console state.');
console.log('Live crawler-vs-human parity: scripts/check-crawler-parity.mjs --base http://127.0.0.1:3100');
