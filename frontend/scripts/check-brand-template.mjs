/**
 * Brand pages — the builder every brand URL renders from (util/brandTemplate.ts and friends), and
 * the copy rules for config/brandSeoConfig.ts. Runs in `npm run prebuild`.
 *
 * Two halves:
 *   1. CODE assertions (throw on the first failure): display names, family labels, the lead, the
 *      resolved FAQs, the JSON-LD, the share image, the {nbProduits} token, rule D3.
 *   2. COPY rules over every curated entry: all violations are collected and printed together,
 *      then the script fails — so one run lists everything the copy pass has to fix.
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const src = (file) => path.join(root, 'src', file);
const { humanizeBrandName } = loadTs(src('util/brandName.ts'));
const { brandDisplayName, brandSeoExtras, brandLogoAlt } = loadTs(src('util/brandDisplayName.ts'));
const { orderBrandListing } = loadTs(src('util/brandListingOrder.ts'));
const { getBrandFamilies, getBrandCategoryNames, brandFamilyLink } = loadTs(src('util/brandCategoryNames.ts'));
const { buildGenericBrandTemplate, buildBrandPageCopy, buildBrandLead, brandHeading, SUR_COMMANDE_QA, SUR_COMMANDE_QA_BULKY } = loadTs(src('util/brandTemplate.ts'));
const {
  buildGenericBrandMetaDescription, buildBrandMetaDescription, buildBrandMetaTitle, pickBrandShareImage,
  buildBrandSocialMetadata, withCashOnDeliveryTail,
} = loadTs(src('util/brandMeta.ts'));
const { buildBrandLandingSchemas } = loadTs(src('util/brandJsonLd.ts'));
const { resolveCategoryMetaDescription, resolveCategoryFaqs } = loadTs(src('util/resolveCategorySeo.ts'));
const { generateBrandDescriptionFallback } = loadTs(src('util/brandDescriptionFallback.ts'));
const { buildCollectionPageSchema } = loadTs(src('util/structuredData.ts'));
const { rawBrandSlug, brandNameToSlug } = loadTs(src('util/brandSlug.ts'));
const { getBrandSeoEntry } = loadTs(src('config/brandSeoConfig.ts'));
const { catalogTaxonomy } = loadTs(src('config/catalogTaxonomy.ts'));
const { extractFormat } = loadTs(src('util/productComparison.ts'));

const text = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/* ── the in-stock table's Format cell (extractFormat) ─────────────────────────────────────────
 * « 60 GÉLULES » read as « 60 g » on /biotech-usa: `g` took the first letter of the unit because
 * an ASCII \b treats « É » as a non-word character (06/10/2026). */
for (const [name, expected] of Object.entries({
  'ASHWAGANDHA - 60 GÉLULES | BIOTECH USA': '60 gélules',
  'Water Away WeightWorld 180 Gélules': '180 gélules',
  'Magnésium 120 gélules': '120 gélules',
  'BEST CREATINE 500GR - SCENIT': '500 g',
  '100% WHEY GOLD STANDARD – 2.27KG': '2,27 kg',
  'Omega 3 240 softgel': '240 capsules molles',
  'ZINC 90 CAPS': '90 capsules',
  'Pro Vitamin 90 Tabletas': '',
  'C4 Original Pre-Workout': '',
})) {
  assert.equal(extractFormat(name), expected, `extractFormat(${JSON.stringify(name)})`);
}

/* ── (a) humanizeBrandName ─────────────────────────────────────────────────────────────────── */
for (const [raw, expected] of Object.entries({
  'BIG RAMY LABS': 'Big Ramy Labs',
  'BPI SPORTS': 'BPI Sports',
  'G FUEL': 'G Fuel',
  'GOLD’S GYM': 'Gold’s Gym',
  'JNX SPORTS': 'JNX Sports',
  'BIOTECH USA': 'Biotech USA',
  'OLIMP SPORT NUTRITION': 'Olimp Sport Nutrition',
  'RULE 1': 'Rule 1',
  'MR.X  V-Shape Supps': 'MR.X V-Shape Supps',
  BSN: 'BSN',
  DYMATIZE: 'DYMATIZE',
  BioTRUST: 'BioTRUST',
  weightworld: 'weightworld',
  'T-RQ': 'T-RQ',
  'PERFECT Sports': 'PERFECT Sports',
})) {
  assert.equal(humanizeBrandName(raw), expected, `humanizeBrandName(${JSON.stringify(raw)})`);
}
assert.equal(humanizeBrandName(null), '');

/* ── display names ─────────────────────────────────────────────────────────────────────────── */
assert.equal(brandDisplayName('BIOTECH USA'), 'BioTech USA', 'curated title prefix wins');
assert.equal(brandDisplayName('weightworld'), 'WeightWorld');
assert.equal(brandDisplayName('DOCTOR’S BEST', 'doctor-s-best'), 'Doctor’s Best');
assert.equal(brandDisplayName('SCITEC NUTRITION'), 'Scitec Nutrition', 'generic falls back to humanizeBrandName');
assert.equal(brandDisplayName('YAVA LABS'), 'Yava Labs');
assert.deepEqual(brandSeoExtras(null), { displayName: null, relatedBrands: [], officialUrl: null, logoAlt: null });
assert.deepEqual(
  brandSeoExtras({ displayName: ' NOW  Foods ', relatedBrands: ['dymatize', 'dymatize', 3, ''], officialUrl: 'http://example.com' }),
  { displayName: 'NOW Foods', relatedBrands: ['dymatize'], officialUrl: null, logoAlt: null },
);
assert.equal(brandSeoExtras({ officialUrl: 'https://www.dymatize.com/' }).officialUrl, 'https://www.dymatize.com/');
// Brand 54's admin logo is the RED REX artwork, not a Big Ramy Labs wordmark: the alt says so.
assert.equal(brandLogoAlt('BIG RAMY LABS'), 'Logo Red Rex, gamme Big Ramy Labs');
assert.equal(brandLogoAlt('DYMATIZE'), 'Logo Dymatize');
assert.equal(
  buildBrandPageCopy({ slug: 'big-ramy-labs', brand: { id: 54, designation_fr: 'BIG RAMY LABS', logo: 'brands/September2024/S5gcbEoftyQcSqDC5htA.webp' }, products: [], facts: { inStockCount: 0, priceMin: null, priceMax: null } }).logo.alt,
  'Logo Red Rex, gamme Big Ramy Labs',
);
// The alt names the wordmark the FILE shows (06/10/2026): brand 38 reads « SPORTS WEAR / Kong »,
// brand 30 reads « GALVANIZE NUTRITION ». Galvanize has no curated entry and must not get one for
// this: its title and display name stay generic.
assert.equal(brandLogoAlt('KONG SPORT NUTRITION'), 'Logo Kong Sports Wear');
assert.equal(brandLogoAlt('GALVANIZE CHROME'), 'Logo Galvanize Nutrition');
assert.equal(getBrandSeoEntry('galvanize-chrome'), null, 'galvanize-chrome stays generic');
assert.equal(brandDisplayName('GALVANIZE CHROME'), 'Galvanize Chrome', 'the logo alt does not rename the brand');
// The share-image logo fallback and the homepage rail use the SAME alt as /brands and the brand page.
assert.equal(pickBrandShareImage({ id: 54, designation_fr: 'BIG RAMY LABS', logo: 'brands/x.webp' }, []).alt, 'Logo Red Rex, gamme Big Ramy Labs');
{
  const { selectHomeRailBrands } = loadTs(src('util/homeBrandRail.ts'));
  const rail = selectHomeRailBrands([
    { id: 1, designation_fr: 'DYMATIZE', logo: 'brands/d.webp' },
    { id: 54, designation_fr: 'BIG RAMY LABS', logo: 'brands/b.webp' },
    { id: 38, designation_fr: 'KONG SPORT NUTRITION', logo: 'brands/k.webp' },
    { id: 9, designation_fr: 'MUSCLETECH', logo: 'brands/m.webp' },
  ]);
  for (const tile of rail) assert.equal(tile.logo_alt, brandLogoAlt(tile.designation_fr), `homepage tile alt = brandLogoAlt for ${tile.designation_fr}`);
  assert.equal(rail.find((tile) => tile.id === 1)?.logo_alt, 'Logo Dymatize');
  assert.equal(rail.find((tile) => tile.id === 9)?.logo_alt, 'Logo MuscleTech');
  const tileSource = fs.readFileSync(src('app/components/BrandsSection.tsx'), 'utf8');
  assert.match(tileSource, /alt=\{brand\.logo_alt \|\| buildBrandAlt\(/, 'BrandTile prints the server-resolved logo_alt first');
}

/* ── fixtures ──────────────────────────────────────────────────────────────────────────────── */
let nextId = 1;
const product = (over = {}) => ({
  id: nextId++, slug: `p-${nextId}`, designation_fr: `Produit ${nextId}`, prix: 100,
  qte: 0, rupture: true, force_out_of_stock: false,
  sous_categorie: { slug: 'whey-proteine', designation_fr: 'Whey Protéine' }, ...over,
});
const inStock = (over = {}) => product({ qte: 5, rupture: false, ...over });
const backOrder = (over = {}) => product(over);
const forcedOut = (over = {}) => product({ force_out_of_stock: true, ...over });

/* ── orderBrandListing: the shopper grid's order, brand attached ───────────────────────────── */
{
  const rows = [
    backOrder({ id: 901, best_seller: 1 }),
    inStock({ id: 902 }),
    inStock({ id: 903, new_product: 1 }),
    backOrder({ id: 904 }),
    { id: 905, slug: 'x', prix: 1 },
    inStock({ id: 906, best_seller: 1 }),
  ];
  const ordered = orderBrandListing(rows, { id: 7, designation_fr: 'SCITEC NUTRITION', logo: null });
  assert.deepEqual(ordered.map((p) => p.id), [906, 903, 902, 901, 904], 'popularity, then in-stock first (stable)');
  assert.ok(ordered.every((p) => p.brand?.designation_fr === 'SCITEC NUTRITION'), 'brand attached to every row');
  assert.equal(rows[0].brand, undefined, 'input rows are not mutated');
}

/* ── (e) families use taxonomy labels and canonical paths ─────────────────────────────────── */
{
  const rows = [
    inStock({ prix: 40, sous_categorie: { slug: 'mineraux', designation_fr: 'Mineraux' } }),
    inStock({ prix: 30, promo: 25, sous_categorie: { slug: 'mineraux', designation_fr: 'Mineraux' }, sous_categories: [{ slug: 'mineraux', designation_fr: 'Mineraux' }, { slug: 'eaa', designation_fr: 'Eaa' }] }),
    backOrder({ sous_categorie: { slug: 'Intra-Workout', designation_fr: 'Intra workout' } }),
  ];
  const families = getBrandFamilies(rows);
  assert.deepEqual(families[0], { slug: 'mineraux', name: 'Minéraux', url: '/mineraux', count: 2, inStock: 2, priceMin: 25 });
  assert.equal(families.find((f) => f.slug === 'eaa')?.name, 'EAA');
  assert.equal(families.find((f) => f.slug === 'intra-workout')?.url, '/intra-workout', 'redirecting slug counted under its canonical path');
  assert.equal(families.find((f) => f.slug === 'intra-workout')?.priceMin, null);
  assert.deepEqual(getBrandCategoryNames(rows).slice(0, 1), ['Minéraux']);

  // A duplicate shelf (taxonomy `duplicateOf`) is never a family: no link to a noindex twin, no
  // back-office « (ancien) » label (/raw-nutrition, /douglas-laboratories, 06/10/2026).
  const withDuplicate = getBrandFamilies([
    ...rows,
    backOrder({ sous_categorie: { slug: 'glucides-energie', designation_fr: 'Glucides & Énergie' } }),
  ]);
  assert.ok(!withDuplicate.some((f) => f.slug === 'glucides-energie'), 'glucides-energie is skipped');
  for (const node of (function flat(nodes, out = []) { for (const n of nodes) { out.push(n); if (n.children) flat(n.children, out); } return out; })(catalogTaxonomy)) {
    if (!node.duplicateOf) continue;
    const fams = getBrandFamilies([backOrder({ sous_categorie: { slug: node.slug, designation_fr: node.label } })]);
    assert.deepEqual(fams, [], `duplicate shelf /${node.slug} never becomes a brand family`);
  }
  assert.ok(withDuplicate.every((f) => !/\(ancien\)/i.test(f.name)), 'no family name carries « (ancien) »');

  const template = buildGenericBrandTemplate('SCITEC NUTRITION', rows, { inStockCount: 2, priceMin: 25, priceMax: 40 });
  assert.equal(template.heading, 'Scitec Nutrition Tunisie : Minéraux, EAA et Intra-workout');
  assert.match(template.introHtml, /<a href="\/mineraux">Minéraux<\/a>/);
  assert.doesNotMatch(template.introHtml, /Mineraux/);
  assert.equal((template.introHtml.match(/<p>/g) ?? []).length, 1, 'the lead is one paragraph');
  assert.doesNotMatch(template.howToChooseBody, /</, 'legacy shape keeps howToChooseBody as plain text');
  assert.equal(template.howToChooseTitle, 'Comment choisir un produit Scitec Nutrition ?');
  assert.ok(template.faqs.every((faq) => !/Comment choisir entre/.test(faq.question)), 'thin « Comment choisir entre » Q&A removed');
}
assert.equal(brandHeading('BSN', []), 'BSN Tunisie');

/* ── meta title / description ──────────────────────────────────────────────────────────────── */
assert.equal(buildBrandMetaTitle('SCITEC NUTRITION', ['Minéraux']), 'Scitec Nutrition Tunisie : Minéraux | Protein.tn');
assert.equal(buildBrandMetaTitle('YAVA LABS', ['EAA', 'Glucides', 'Glutamine']), 'Yava Labs Tunisie : EAA, Glucides, Glutamine | Protein.tn');
assert.equal(buildBrandMetaTitle('YAVA LABS'), 'Yava Labs Tunisie | Compléments alimentaires — Protein.tn');
assert.ok(buildBrandMetaTitle('YAVA LABS', ['A'.repeat(40), 'B']).length <= 60);
assert.equal(buildBrandMetaTitle('DYMATIZE', ['Whey']), getBrandSeoEntry('dymatize').metaTitle, 'curated titles unchanged');
assert.equal(buildBrandMetaTitle('NOW FOODS'), getBrandSeoEntry('now-foods').metaTitle);

/* ── a theme node names its products; no generic title goes over 60 characters ───────────────
   06/10/2026, live API: naming families with the nav's theme labels (« Articulations &
   bien-être ») pushed 34 generic titles that say « Collagène » / « Vitamines » / « Immunité »
   on production onto the no-category fallback, 54 of them over 60 characters (max 84). */
{
  const familyOf = (slug, apiLabel) => getBrandFamilies([backOrder({ sous_categorie: { slug, designation_fr: apiLabel } })])[0]?.name;
  assert.equal(familyOf('collagene', 'Collagène'), 'Collagène');
  assert.equal(familyOf('vitamines', 'Vitamines'), 'Vitamines');
  assert.equal(familyOf('immunite', 'Immunité'), 'Immunité');
  assert.equal(familyOf('boosters-hormonaux', 'Boosters Hormonaux'), 'Boosters hormonaux');
  assert.equal(familyOf('mineraux', 'Mineraux'), 'Minéraux', 'a node without familyLabel keeps its label');

  assert.equal(buildBrandMetaTitle('ABSOLUTE NUTRITION', [familyOf('collagene', 'Collagène')]), 'Absolute Nutrition Tunisie : Collagène | Protein.tn');
  assert.equal(buildBrandMetaTitle('LifeTime Vitamins', [familyOf('vitamines', 'Vitamines')]), 'LifeTime Vitamins Tunisie : Vitamines | Protein.tn');
  assert.equal(buildBrandMetaTitle('Advanced Orthomolecular Research AOR', ['Vitamines']), 'Advanced Orthomolecular Research AOR Tunisie : Vitamines', 'the family outranks the suffix');
  assert.equal(buildBrandMetaTitle('Advanced Orthomolecular Research AOR'), 'Advanced Orthomolecular Research AOR Tunisie | Protein.tn', 'the long fallback only when it fits');

  const flat = (nodes, out = []) => { for (const n of nodes) { out.push(n); if (n.children) flat(n.children, out); } return out; };
  const familyLists = [[], ...flat(catalogTaxonomy).map((node) => getBrandCategoryNames([backOrder({ sous_categorie: { slug: node.slug, designation_fr: node.label } })])).filter((names) => names.length)];
  familyLists.push(['Collagène', 'Vitamines', 'Magnésium'], ['A'.repeat(40), 'B']);
  const names = ['MP', 'YAVA LABS', 'SCITEC NUTRITION', 'ABSOLUTE NUTRITION', 'ANCIENT NUTRITION', 'LifeTime Vitamins', 'Natural Path Silver Wings', 'ION Intelligence of Nature', 'Advanced Orthomolecular Research AOR'];
  for (const name of names) {
    assert.equal(getBrandSeoEntry(brandNameToSlug(name)), null, `${name} is a GENERIC fixture`);
    for (const families of familyLists) {
      const title = buildBrandMetaTitle(name, families);
      assert.ok(title.length <= 60, `generic brand title over 60 characters (${title.length}): « ${title} »`);
      const display = brandDisplayName(name);
      if (families.length && `${display} Tunisie : ${families[0]}`.length <= 60) {
        assert.ok(title.startsWith(`${display} Tunisie : ${families[0]}`), `« ${title} » drops the family « ${families[0]} » although it fits`);
      }
    }
  }

  // A theme head (a node below a rayon that has children and a « X & Y » nav label) must name its
  // products: /airborne read « Immunité & digestion » for 10 immune products, /vital-proteins
  // « Articulations & bien-être » for collagen (06/10/2026).
  const rayons = new Set(catalogTaxonomy.map((node) => node.slug));
  for (const node of flat(catalogTaxonomy)) {
    if (!node.children?.length || rayons.has(node.slug) || !/ & /.test(node.label)) continue;
    assert.ok(node.familyLabel, `theme node /${node.slug} (« ${node.label} ») needs a familyLabel`);
    assert.notEqual(familyOf(node.slug, node.label), node.label, `/${node.slug} family is named by its theme`);
  }
  // One brand selling on every shelf: no two of its families share a « & » part, i.e. no
  // « Vitamines & minéraux » next to « Minéraux », « Plantes & boosters » next to « Plantes & herbes ».
  const everyShelf = getBrandCategoryNames(flat(catalogTaxonomy).map((node) => backOrder({ sous_categorie: { slug: node.slug, designation_fr: node.label } })));
  const fold = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const seenParts = new Map();
  for (const name of everyShelf) {
    for (const part of name.split(' & ').map(fold)) {
      assert.ok(!seenParts.has(part), `families « ${seenParts.get(part)} » and « ${name} » differ only by a theme suffix (« ${part} »)`);
      seenParts.set(part, name);
    }
  }
}

/* ── one product row's family (BrandInStockTable) ───────────────────────────────────────────── */
{
  // A duplicate shelf resolves to its twin: never « (ancien) », never a link to the noindex URL —
  // the row of an in-stock glucides-energie product names « Glucides & énergie » → /glucides.
  assert.deepEqual(brandFamilyLink({ slug: 'glucides-energie', designation_fr: 'Glucides & Énergie' }), { url: '/glucides', name: 'Glucides & énergie' });
  assert.deepEqual(brandFamilyLink({ slug: 'collagene', designation_fr: 'Collagène' }), { url: '/collagene', name: 'Collagène' });
  assert.deepEqual(brandFamilyLink({ slug: 'Intra-Workout', designation_fr: 'Intra workout' }), { url: '/intra-workout', name: 'Intra-workout' });
  assert.equal(brandFamilyLink(null), null);
  assert.equal(brandFamilyLink({ slug: '  ' }), null);
  for (const node of (function flat(nodes, out = []) { for (const n of nodes) { out.push(n); if (n.children) flat(n.children, out); } return out; })(catalogTaxonomy)) {
    const link = brandFamilyLink({ slug: node.slug, designation_fr: node.label });
    assert.ok(link && !/\(ancien\)/i.test(link.name), `/${node.slug} row label carries « (ancien) »`);
    if (node.duplicateOf) assert.equal(link.url, `/${node.duplicateOf}`, `/${node.slug} row links to its twin`);
  }
  const table = fs.readFileSync(src('app/(shop)/brand/BrandInStockTable.tsx'), 'utf8');
  assert.match(table, /brandFamilyLink\(p\.sous_categorie\)/, 'the in-stock table resolves families with brandFamilyLink');
  assert.doesNotMatch(table, /taxonomyFamilyLabel|taxonomyLabel|canonicalCategoryPath/, 'the in-stock table builds no family link of its own');
}
{
  const facts = { inStockCount: 2, priceMin: 260, priceMax: 400 };
  const description = buildGenericBrandMetaDescription('SCITEC NUTRITION', ['Whey isolate', 'Whey protéine'], 2, facts);
  assert.ok(description.length <= 155);
  assert.match(description, /^Scitec Nutrition en Tunisie : 2 produits \(Whey isolate.*dont 2 en stock de 260 à 400 DT/);
  assert.ok(buildGenericBrandMetaDescription('A'.repeat(200), [], 2, facts).length <= 155);
  assert.doesNotMatch(buildGenericBrandMetaDescription('SCITEC NUTRITION', [], 2, { ...facts, priceMax: 260, inStockCount: 0 }), /en stock|260 à/);
  assert.match(buildGenericBrandMetaDescription('BIOTECH USA', [], 17, null), /^BioTech USA en Tunisie : 17 produits\./);
}
assert.equal(buildBrandMetaDescription('Optimum Nutrition'), getBrandSeoEntry('optimum-nutrition').metaDescription);

/* ── rule D3 ───────────────────────────────────────────────────────────────────────────────── */
{
  const dymatize = 'Dymatize en Tunisie : ISO100 hydrolysée de 610 g à 2,3 kg, Elite 100% Whey 907 g et Super Mass Gainer 2,7 kg.';
  assert.equal(withCashOnDeliveryTail(dymatize), `${dymatize} Paiement à la livraison.`);
  assert.equal(withCashOnDeliveryTail('Court texte'), 'Court texte. Paiement à la livraison.');
  assert.equal(withCashOnDeliveryTail('Livraison 24–72h, paiement à la livraison.'), 'Livraison 24–72h, paiement à la livraison.');
  const long = `${'x'.repeat(131)}.`;
  assert.equal(withCashOnDeliveryTail(long), long);
}

/* ── (h) {nbProduits} ──────────────────────────────────────────────────────────────────────── */
{
  const template = 'Nous listons {nbProduits} produits. Livraison rapide.';
  assert.equal(resolveCategoryMetaDescription(template, { priceMin: null, inStockCount: null, productCount: 12 }), 'Nous listons 12 produits. Livraison rapide.');
  assert.equal(resolveCategoryMetaDescription(template, { priceMin: null, inStockCount: null, productCount: 0 }), 'Livraison rapide.');
  assert.equal(resolveCategoryMetaDescription(template, { priceMin: null, inStockCount: null }), 'Livraison rapide.');
  const faqs = [{ question: 'Q1', answer: '{nbProduits} références.' }, { question: 'Q2', answer: 'Toujours vrai.' }];
  assert.deepEqual(resolveCategoryFaqs(faqs, { priceMin: null, inStockCount: null }), [faqs[1]], 'an emptied answer drops its Q&A');
  assert.equal(resolveCategoryFaqs(faqs, { priceMin: null, inStockCount: null, productCount: 3 })[0].answer, '3 références.');
}

/* ── (d) the lead ──────────────────────────────────────────────────────────────────────────── */
{
  const families = [
    { slug: 'whey-proteine', name: 'Whey protéine', url: '/whey-proteine', count: 20, inStock: 5, priceMin: 149 },
    { slug: 'caseine', name: 'Caséine', url: '/caseine', count: 4, inStock: 1, priceMin: 200 },
    { slug: 'vitamines', name: 'Vitamines', url: '/vitamines', count: 3, inStock: 0, priceMin: null },
    { slug: 'zinc', name: 'Zinc', url: '/zinc', count: 1, inStock: 0, priceMin: null },
  ];
  const listing = (stocked, back, forced = 0) => [
    ...Array.from({ length: stocked }, () => inStock()),
    ...Array.from({ length: back }, () => backOrder()),
    ...Array.from({ length: forced }, () => forcedOut()),
  ];
  const lead = (products, facts, fams = families, displayName = 'Optimum Nutrition') => buildBrandLead({ displayName, products, facts, families: fams });

  const target = lead(listing(9, 42), { inStockCount: 9, priceMin: 149, priceMax: 749 });
  assert.equal(target, '<p>51 produits Optimum Nutrition au catalogue, dont 9 en stock (de 149 à 749 DT) livrés en 24–72h. Familles principales : <a href="/whey-proteine">Whey protéine</a>, <a href="/caseine">Caséine</a> et <a href="/vitamines">Vitamines</a>.</p>');
  assert.equal(text(target), '51 produits Optimum Nutrition au catalogue, dont 9 en stock (de 149 à 749 DT) livrés en 24–72h. Familles principales : Whey protéine, Caséine et Vitamines.');
  assert.equal(text(lead(listing(1, 1), { inStockCount: 1, priceMin: 149, priceMax: 149 }, [])), '2 produits Optimum Nutrition au catalogue, dont 1 en stock (149 DT) livré en 24–72h.');
  assert.equal(text(lead(listing(2, 3), { inStockCount: 2, priceMin: null, priceMax: null }, [])), '5 produits Optimum Nutrition au catalogue, dont 2 en stock livrés en 24–72h.');
  assert.equal(text(lead(listing(3, 0), { inStockCount: 3, priceMin: 10, priceMax: 20 }, families.slice(0, 1))), '3 produits Optimum Nutrition au catalogue, tous en stock (de 10 à 20 DT) et livrés en 24–72h. Famille : Whey protéine.');
  assert.equal(text(lead(listing(1, 0), { inStockCount: 1, priceMin: 10, priceMax: 10 }, [])), '1 produit Optimum Nutrition au catalogue, en stock (10 DT) et livré en 24–72h.');
  assert.equal(text(lead(listing(0, 21), { inStockCount: 0, priceMin: null, priceMax: null }, [], 'Dymatize')), '21 produits Dymatize au catalogue, tous sur commande : prix et délai confirmés avant la commande.');
  assert.equal(text(lead(listing(0, 1), { inStockCount: 0, priceMin: null, priceMax: null }, [], 'Dymatize')), '1 produit Dymatize au catalogue, sur commande : prix et délai confirmés avant la commande.');
  assert.equal(text(lead(listing(0, 0, 4), { inStockCount: 0, priceMin: null, priceMax: null }, [])), '4 produits Optimum Nutrition au catalogue, aucun en stock pour le moment.');
  assert.equal(text(lead(listing(2, 2), { inStockCount: null, priceMin: null, priceMax: null }, [])), '4 produits Optimum Nutrition au catalogue.');
  assert.equal(lead([], { inStockCount: null, priceMin: null, priceMax: null }, [], 'A&B'), '<p>Aucun produit A&amp;B n’est publié pour le moment. <a href="/brands">Voir toutes les marques</a>.</p>');
  for (const html of [target, lead(listing(2, 3), { inStockCount: 2, priceMin: null, priceMax: null })]) {
    assert.doesNotMatch(html, / {2}| \.|\( /, 'no double spaces or orphan punctuation');
  }

  // « principales » is a ranking: only a family of ≥ 2 products earns it. /weightworld (06/10/2026):
  // Vitamines 2, then seven singletons — the alphabetical tie-break crowned one misfiled berberine
  // « Acides aminés ».
  const fam = (name, count) => ({ slug: name.toLowerCase(), name, url: `/${name.toLowerCase()}`, count, inStock: 0, priceMin: null });
  const weightworld = [fam('Vitamines', 2), fam('Acides aminés', 1), fam('Antioxydants', 1), fam('Ashwagandha', 1), fam('Zinc', 1), fam('Magnésium', 1)];
  const facts9 = { inStockCount: 9, priceMin: 119, priceMax: 179 };
  assert.equal(text(lead(listing(9, 0), facts9, weightworld, 'WeightWorld')), '9 produits WeightWorld au catalogue, tous en stock (de 119 à 179 DT) et livrés en 24–72h. Famille principale : Vitamines.');
  assert.equal(text(lead(listing(5, 0), { ...facts9, inStockCount: 5 }, [fam('Mass gainers', 2), fam('Protéines multi-sources', 1), fam('Vitamines', 1), fam('Whey isolate', 1)], 'Olimp')), '5 produits Olimp au catalogue, tous en stock (de 119 à 179 DT) et livrés en 24–72h. Famille principale : Mass gainers.');
  assert.equal(text(lead(listing(3, 0), { ...facts9, inStockCount: 3 }, [fam('BCAA', 1), fam('Créatine', 1), fam('Zinc', 1)], 'X')), '3 produits X au catalogue, tous en stock (de 119 à 179 DT) et livrés en 24–72h. Familles : BCAA, Créatine et Zinc.', '≤ 3 singletons: the complete list, no ranking');
  assert.equal(text(lead(listing(4, 0), { ...facts9, inStockCount: 4 }, [fam('BCAA', 1), fam('Créatine', 1), fam('Zinc', 1), fam('Whey', 1)], 'X')), '4 produits X au catalogue, tous en stock (de 119 à 179 DT) et livrés en 24–72h.', '> 3 singletons: the family index names them');
  assert.equal(text(lead(listing(1, 0), { inStockCount: 1, priceMin: 50, priceMax: 50 }, [fam('Zinc', 1)], 'X')), '1 produit X au catalogue, en stock (50 DT) et livré en 24–72h. Famille : Zinc.');
  // A bulkyDelivery brand states no parcel window (/jx-fitness).
  assert.equal(text(buildBrandLead({ displayName: 'JX Fitness', products: listing(26, 30), facts: { inStockCount: 26, priceMin: 350, priceMax: 35000 }, families: [], deliveryTerms: false })), '56 produits JX Fitness au catalogue, dont 26 en stock (de 350 à 35000 DT).');
  assert.equal(text(buildBrandLead({ displayName: 'JX', products: listing(2, 0), facts: { inStockCount: 2, priceMin: 350, priceMax: 400 }, families: [], deliveryTerms: false })), '2 produits JX au catalogue, tous en stock (de 350 à 400 DT).');
}

/* ── share image ───────────────────────────────────────────────────────────────────────────── */
{
  const brand = { id: 3, designation_fr: 'SCITEC NUTRITION', logo: 'brands/scitec.webp' };
  const iherb = inStock({ cover: 'https://cloudinary.images-iherb.com/image/upload/x.jpg', designation_fr: 'IHERB PHOTO' });
  const own = inStock({ cover: 'produits/own.webp', designation_fr: 'OWN PHOTO' });
  const back = backOrder({ cover: 'produits/back.webp', designation_fr: 'BACK PHOTO' });
  const ownPick = pickBrandShareImage(brand, [back, iherb, own]);
  assert.match(ownPick.url, /^https:\/\/protein\.tn\/media\/produits\/own\.webp/);
  assert.match(ownPick.alt, /Tunisie$/);
  assert.match(pickBrandShareImage(brand, [back, iherb]).url, /\/media\/iherb\//, 'any in-stock cover beats the logo');
  // 0 in stock, one cover: the product photo, not the logo (/dymatize, /scitec-nutrition, /bpi-sports).
  assert.match(pickBrandShareImage(brand, [back]).url, /\/media\/produits\/back\.webp/, 'a back-order cover beats the logo');
  assert.equal(pickBrandShareImage(brand, [back]).isLogo, undefined);
  assert.match(pickBrandShareImage({ ...brand, logo: null }, [back]).url, /\/media\/produits\/back\.webp/);
  const logoPick = pickBrandShareImage(brand, [backOrder()]);
  assert.deepEqual({ ...logoPick, url: undefined }, { url: undefined, alt: 'Logo Scitec Nutrition', isLogo: true }, 'logo only without any cover');
  assert.match(logoPick.url, /\/media\/brands\/scitec\.webp/);
  assert.equal(pickBrandShareImage({ ...brand, logo: null }, [backOrder()]), null);
  const logoCard = buildBrandSocialMetadata('SCITEC NUTRITION', 'https://protein.tn/scitec-nutrition', ['Minéraux'], 'desc', logoPick);
  assert.deepEqual(logoCard.openGraph.images.map((i) => [i.url, i.width, i.height]), [['/slides/home-hero-web.webp', 1200, 630]], 'a logo never becomes og:image');
  assert.deepEqual(logoCard.twitter.images, ['/slides/home-hero-web.webp']);

  const withImage = buildBrandSocialMetadata('SCITEC NUTRITION', 'https://protein.tn/scitec-nutrition', ['Minéraux'], 'desc', ownPick);
  assert.deepEqual(withImage.openGraph.images, [{ url: ownPick.url, alt: ownPick.alt }]);
  assert.deepEqual(withImage.twitter.images, [ownPick.url]);
  assert.equal(withImage.twitter.card, 'summary_large_image');
  assert.equal(withImage.openGraph.title, buildBrandMetaTitle('SCITEC NUTRITION', ['Minéraux']));
  assert.equal(withImage.openGraph.description, 'desc');
  const fallback = buildBrandSocialMetadata('SCITEC NUTRITION', 'https://protein.tn/scitec-nutrition');
  assert.deepEqual(fallback.openGraph.images, [{ url: '/slides/home-hero-web.webp', width: 1200, height: 630, alt: 'Scitec Nutrition — Protein.tn' }]);
  assert.doesNotMatch(buildBrandSocialMetadata('DYMATIZE', 'https://protein.tn/dymatize').openGraph.description, /\{/, 'fallback never prints a token');
}

/* ── (f) buildBrandPageCopy — curated ──────────────────────────────────────────────────────── */
{
  const brand = { id: 10, designation_fr: 'DYMATIZE', logo: 'brands/dymatize.webp' };
  const rows = [
    backOrder({ cover: 'produits/a.webp', sous_categorie: { slug: 'whey-isolate', designation_fr: 'Whey Isolate' } }),
    inStock({ prix: 300, cover: 'produits/b.webp' }),
    backOrder(), backOrder({ sous_categorie: { slug: 'mass-gainers', designation_fr: 'Mass Gainers' } }),
  ];
  for (const facts of [
    { inStockCount: 1, priceMin: 300, priceMax: 300 },
    { inStockCount: 0, priceMin: null, priceMax: null },
    { inStockCount: null, priceMin: null, priceMax: null },
  ]) {
    const copy = buildBrandPageCopy({ slug: 'dymatize', brand, products: rows, facts });
    for (const field of [copy.leadHtml, copy.introHtml ?? '', copy.howToChooseBody, ...copy.faqs.flatMap((f) => [f.question, f.answer])]) {
      assert.doesNotMatch(field, /\{/, 'no unresolved token on a curated page');
    }
    assert.equal(copy.faqs.at(-1), SUR_COMMANDE_QA, 'back-order references add the « Sur commande » Q&A');
  }
  const copy = buildBrandPageCopy({ slug: 'dymatize', brand, products: rows, facts: { inStockCount: 1, priceMin: 300, priceMax: 300 } });
  const entry = getBrandSeoEntry('dymatize');
  assert.equal(copy.displayName, 'Dymatize');
  assert.equal(copy.heading, entry.h1);
  assert.equal(copy.howToChooseTitle, entry.howToChooseTitle);
  assert.deepEqual(copy.relatedCategories, entry.relatedCategories);
  assert.deepEqual(copy.counts, { total: 4, inStock: 1, backOrder: 3 });
  assert.equal(copy.showInStockTable, true);
  assert.deepEqual(copy.inStockProducts.map((p) => p.prix), [300]);
  assert.equal(copy.showFamilyIndex, true);
  assert.equal(copy.gridHeading, 'Tous les produits Dymatize : 4 au catalogue');
  assert.equal(copy.introTitle, 'À propos de Dymatize');
  assert.equal(
    buildBrandPageCopy({ slug: 'optimum-nutrition', brand: { id: 11, designation_fr: 'Optimum Nutrition', logo: null }, products: rows, facts: { inStockCount: 1, priceMin: 300, priceMax: 300 } }).introTitle,
    'À propos d’Optimum Nutrition',
    '« de » elides before a vowel'
  );
  assert.equal(
    buildBrandPageCopy({ slug: 'one-a-day', brand: { id: 12, designation_fr: 'ONE A DAY', logo: null }, products: rows, facts: { inStockCount: 1, priceMin: 300, priceMax: 300 } }).introTitle,
    'À propos de One-A-Day',
    'no elision before « One », said /w/'
  );
  assert.equal(copy.familyIndexTitle, 'La gamme Dymatize par famille');
  assert.equal(copy.inStockTitle, 'Dymatize en stock : formats et prix');
  assert.deepEqual(copy.logo, { src: copy.logo.src, alt: 'Logo Dymatize', width: 112, height: 112 });
  assert.match(copy.logo.src, /\/media\/brands\/dymatize\.webp/);
  assert.match(copy.shareImage.url, /\/media\/produits\/b\.webp/);
  // At min = max the price Q&A drops with its token sentence; « Sur commande » is appended.
  assert.equal(copy.faqs.length, resolveCategoryFaqs(entry.faqs, { priceMin: 300, priceMax: 300, inStockCount: 1, productCount: 4 }).length + 1);
  assert.ok(!copy.faqs.some((f) => /^Quel est le prix/.test(f.question)), 'no price question without a price range');

  /* ── (g) JSON-LD from the same copy ── */
  const schemas = buildBrandLandingSchemas({ brand, products: rows, slug: 'dymatize', baseUrl: 'https://protein.tn', description: 'desc', copy });
  const byType = (type) => schemas.find((node) => node['@type'] === type);
  // FAQPage = the visible list minus the one Q&A every brand page shares word for word.
  const markedUp = copy.faqs.filter((f) => f !== SUR_COMMANDE_QA);
  assert.equal(markedUp.length, copy.faqs.length - 1, 'the visible list still carries « Sur commande »');
  assert.deepEqual(byType('FAQPage').mainEntity.map((q) => q.name), markedUp.map((f) => f.question));
  assert.deepEqual(byType('FAQPage').mainEntity.map((q) => q.acceptedAnswer.text), markedUp.map((f) => f.answer));
  assert.ok(!byType('FAQPage').mainEntity.some((q) => q.name === SUR_COMMANDE_QA.question), 'the shared Q&A is never marked up');
  const crumbs = byType('BreadcrumbList').itemListElement;
  assert.deepEqual([crumbs[1].name, crumbs[1].item], ['Marques', 'https://protein.tn/brands']);
  assert.equal(crumbs[2].name, 'Dymatize');
  assert.equal(byType('CollectionPage').name, entry.metaTitle);
  assert.equal(byType('CollectionPage').description, 'desc');
}

/* ── curated price answers: true, and never one shared sentence (06/10/2026) ────────────────── */
{
  const range = { inStockCount: 2, priceMin: 300, priceMax: 400 };
  const mixed = [inStock({ prix: 300 }), inStock({ prix: 400 }), backOrder(), backOrder(), backOrder()];
  const dym = buildBrandPageCopy({ slug: 'dymatize', brand: { id: 10, designation_fr: 'DYMATIZE' }, products: mixed, facts: range });
  assert.equal(dym.faqs.find((f) => /^Quel est le prix/.test(f.question))?.answer, 'Les 2 références Dymatize en stock vont de 300 à 400 DT. Les références sur commande affichent leur prix sur leur fiche.');
  // /weightworld: 9 of 9 in stock, no arôme — no « sur commande », no « arôme » claim.
  const ww = buildBrandPageCopy({ slug: 'weightworld', brand: { id: 60, designation_fr: 'weightworld' }, products: [inStock({ prix: 119 }), inStock({ prix: 179 })], facts: range });
  const wwPrice = ww.faqs.find((f) => /^Quel est le prix/.test(f.question))?.answer ?? '';
  assert.match(wwPrice, /^Les 2 références en stock vont de 300 à 400 DT\.$/);
  // Zero or one-price stock: no curated price answer is the same text on two brands.
  const seen = new Map();
  for (const key of (function keys() {
    const source = fs.readFileSync(src('config/brandSeoConfig.ts'), 'utf8');
    const body = source.slice(source.indexOf('const BRAND_SEO_CONFIG'), source.indexOf('export function getBrandSeoEntry'));
    return [...body.matchAll(/^ {2}['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((match) => match[1]);
  })()) {
    for (const facts of [{ inStockCount: 0, priceMin: null, priceMax: null }, { inStockCount: 1, priceMin: 79, priceMax: 79 }]) {
      const copy = buildBrandPageCopy({ slug: key, brand: { id: 1, designation_fr: key }, products: [inStock({ prix: 79 }), backOrder(), backOrder(), backOrder()], facts });
      for (const qa of copy.faqs) {
        assert.doesNotMatch(qa.answer, /Le prix de chaque format et de chaque arôme est affiché dans la grille/, `${key}: the shared price sentence is back`);
        // Price answers only: other curated answers repeated word for word across entries (e.g. the
        // ordering answer of /victor-martinez and /real-pharm) predate this pass — copy work.
        if (!/^Quel(?:s)? (?:est|sont) (?:le|les) prix/.test(qa.question)) continue;
        assert.ok(!seen.has(qa.answer) || seen.get(qa.answer) === key, `${key} and ${seen.get(qa.answer)} mark up the same answer: « ${qa.answer} »`);
        seen.set(qa.answer, key);
      }
    }
  }
}

/* ── bulkyDelivery (/jx-fitness): one set of delivery terms per page ────────────────────────── */
{
  const jx = buildBrandPageCopy({
    slug: 'jx-fitness',
    brand: { id: 52, designation_fr: 'JX FITNESS' },
    products: [inStock({ prix: 350 }), inStock({ prix: 35000 }), backOrder(), backOrder(), backOrder()],
    facts: { inStockCount: 2, priceMin: 350, priceMax: 35000 },
  });
  assert.equal(getBrandSeoEntry('jx-fitness').bulkyDelivery, true);
  assert.doesNotMatch(text(jx.leadHtml), /24–72h|livrés? en/, 'no parcel window in the JX lead');
  assert.ok(jx.faqs.includes(SUR_COMMANDE_QA_BULKY) && !jx.faqs.includes(SUR_COMMANDE_QA), 'JX gets the « Sur commande » answer without parcel terms');
  assert.doesNotMatch(SUR_COMMANDE_QA_BULKY.answer, /24–72h|\d+ DT/);
  const schemas = buildBrandLandingSchemas({ brand: { id: 52, designation_fr: 'JX FITNESS' }, products: [], slug: 'jx-fitness', baseUrl: 'https://protein.tn', description: 'd', copy: jx });
  const faqLd = schemas.find((node) => node['@type'] === 'FAQPage');
  assert.ok(!faqLd || !faqLd.mainEntity.some((q) => q.acceptedAnswer.text === SUR_COMMANDE_QA_BULKY.answer), 'the bulky « Sur commande » answer is not marked up either');
}

/* ── the in-stock table lists EVERY in-stock row (/real-pharm 14, /jx-fitness 26) ───────────── */
{
  const rows = [...Array.from({ length: 14 }, (_, i) => inStock({ prix: 50 + i })), backOrder(), backOrder(), backOrder()];
  const copy = buildBrandPageCopy({ slug: 'real-pharm', brand: { id: 21, designation_fr: 'REAL PHARM' }, products: rows, facts: { inStockCount: 14, priceMin: 50, priceMax: 63 } });
  assert.equal(copy.inStockProducts.length, 14, 'no cap: the heading reads as the complete list');
  assert.equal(copy.inStockProducts.length, copy.counts.inStock, 'table rows = the in-stock count the lead states');
  assert.match(text(copy.leadHtml), /dont 14 en stock/);
}

/* ── buildBrandPageCopy — generic ──────────────────────────────────────────────────────────── */
{
  const brand = { id: 11, designation_fr: 'SCITEC NUTRITION' };
  const rows = [
    backOrder({ designation_fr: ' PACK GAIN MUSCULAIRE RAPIDE', slug: 'pack-gain', sous_categorie: { slug: 'mineraux', designation_fr: 'Mineraux' } }),
    inStock({ prix: 45, designation_fr: 'ZINC 90 CAPS', cover: 'produits/zinc.webp', sous_categorie: { slug: 'mineraux', designation_fr: 'Mineraux' } }),
    inStock({ prix: 120, sous_categorie: { slug: 'eaa', designation_fr: 'Eaa' } }),
    backOrder(), backOrder(),
  ];
  const facts = { inStockCount: 2, priceMin: 45, priceMax: 120 };
  const copy = buildBrandPageCopy({ slug: 'scitec-nutrition', brand, products: rows, facts });
  assert.equal(copy.displayName, 'Scitec Nutrition');
  assert.equal(copy.heading, 'Scitec Nutrition Tunisie : Minéraux, Whey protéine et EAA');
  assert.equal(copy.introHtml, null);
  assert.equal(copy.howToChooseTitle, 'Comment choisir un produit Scitec Nutrition ?');
  assert.match(copy.howToChooseBody, /^<p>Les 5 produits Scitec Nutrition se répartissent entre Minéraux \(2\), .+ fait foi pour la composition\.<\/p><p>Les références en stock apparaissent en premier dans la liste ; les autres sont sur commande\.<\/p>$/);
  assert.deepEqual(copy.faqs.map((f) => f.question), [
    'Quels produits Scitec Nutrition trouve-t-on sur Protein.tn ?',
    'Quels sont les prix des produits Scitec Nutrition en stock ?',
    SUR_COMMANDE_QA.question,
    'Comment commander et recevoir un produit Scitec Nutrition ?',
  ]);
  assert.match(copy.faqs[0].answer, /^5 produits Scitec Nutrition figurent au catalogue/);
  assert.equal(copy.faqs[1].answer, 'Les 2 références Scitec Nutrition en stock vont de 45 à 120 DT. Les références sur commande affichent leur prix sur leur fiche.');
  assert.ok(copy.faqs.every((f) => !/disponibles/.test(f.answer)), 'never « disponibles »');
  assert.deepEqual(copy.relatedCategories, [{ slug: 'brands', name: 'Comparer Scitec Nutrition aux autres marques', url: '/brands' }]);
  assert.deepEqual(copy.relatedBrands, []);
  assert.equal(copy.officialUrl, null);
  assert.equal(copy.logo, null);
  assert.equal(copy.showInStockTable, true);

  const single = buildBrandPageCopy({ slug: 'scitec-nutrition', brand, products: [inStock({ prix: 45 })], facts: { inStockCount: 1, priceMin: 45, priceMax: 45 } });
  assert.equal(single.faqs[1].answer, 'La référence Scitec Nutrition en stock coûte 45 DT.');
  assert.equal(single.gridHeading, 'Scitec Nutrition : 1 produit au catalogue');
  assert.match(single.howToChooseBody, /^<p>Le produit Scitec Nutrition au catalogue appartient à la famille /);
  const same = buildBrandPageCopy({ slug: 'scitec-nutrition', brand, products: [inStock({ prix: 45 }), inStock({ prix: 45 })], facts: { inStockCount: 2, priceMin: 45, priceMax: 45 } });
  assert.equal(same.faqs[1].answer, 'Les 2 références Scitec Nutrition en stock sont à 45 DT.');
  const none = buildBrandPageCopy({ slug: 'scitec-nutrition', brand, products: [], facts: { inStockCount: 0, priceMin: null, priceMax: null } });
  assert.equal(none.gridHeading, 'Scitec Nutrition : aucun produit publié pour le moment');
  assert.equal(none.showFamilyIndex, false);

  const schemas = buildBrandLandingSchemas({ brand, products: rows, slug: 'scitec-nutrition', baseUrl: 'https://protein.tn', copy });
  const byType = (type) => schemas.find((node) => node['@type'] === type);
  assert.equal(byType('CollectionPage').name, buildBrandMetaTitle('SCITEC NUTRITION', getBrandCategoryNames(rows)), 'CollectionPage name equals the <title>');
  assert.equal(byType('CollectionPage').name, 'Scitec Nutrition Tunisie : Minéraux | Protein.tn', 'trailing families dropped to fit 60');
  assert.equal(byType('ItemList').name, 'Produits Scitec Nutrition');
  const names = byType('ItemList').itemListElement.map((item) => item.name);
  assert.ok(names.every((name) => name === name.trim() && !/ {2}/.test(name)), 'ItemList names are trimmed');
  assert.deepEqual(byType('ItemList').itemListElement.map((item) => item.url.split('/').pop()), orderBrandListing(rows, brand).map((p) => p.slug), 'ItemList follows the grid order');
  assert.deepEqual(byType('FAQPage').mainEntity.map((q) => q.name), copy.faqs.filter((f) => f !== SUR_COMMANDE_QA).map((f) => f.question));
  assert.ok(copy.faqs.includes(SUR_COMMANDE_QA), 'visible FAQ keeps « Sur commande »');
  assert.doesNotMatch(JSON.stringify(schemas), /qualité premium|produits authentiques/);
  assert.equal(byType('BreadcrumbList').itemListElement[2].name, 'Scitec Nutrition');

  // primaryImageOfPage is emitted by structuredData once it supports `primaryImage`; when it does,
  // it must be this page's share image.
  const probe = buildCollectionPageSchema('x', '/x', 'https://protein.tn', { primaryImage: { url: 'https://protein.tn/x.webp' } });
  assert.match(copy.shareImage.url, /\/media\/produits\/zinc\.webp/);
  if (probe.primaryImageOfPage) {
    assert.ok(JSON.stringify(byType('CollectionPage').primaryImageOfPage).includes(copy.shareImage.url), 'primaryImageOfPage is the share image');
  }
}

/* ── /shop brand-filter fallback ───────────────────────────────────────────────────────────── */
{
  const fallback = generateBrandDescriptionFallback({ name: 'SCITEC NUTRITION', productCount: 1, topCategories: ['Minéraux'], priceMin: 25 });
  assert.equal(fallback, 'Retrouvez 1 produit Scitec Nutrition au catalogue à partir de 25 DT. La marque Scitec Nutrition est présente dans nos gammes Minéraux. Livraison 24–72h partout en Tunisie, paiement à la livraison.');
  assert.doesNotMatch(generateBrandDescriptionFallback({ name: 'X', productCount: 3 }), /importés officiellement|authentiques|disponibles/);
}

console.log('Brand template: display names, taxonomy families, lead, resolved FAQs, JSON-LD, share image, {nbProduits} and D3 passed.');

/* ══ COPY RULES — every curated entry of config/brandSeoConfig.ts ═════════════════════════════
 * The keys are parsed from the source (BRAND_SEO_CONFIG is not exported). `--config <file>` runs
 * the same rules against a draft or an older copy of the file, e.g.
 *   git show HEAD:frontend/src/config/brandSeoConfig.ts > /tmp/c.ts && node scripts/check-brand-template.mjs --config /tmp/c.ts
 */
const curatedKeys = (file) => {
  const source = fs.readFileSync(file, 'utf8');
  const body = source.slice(source.indexOf('const BRAND_SEO_CONFIG'), source.indexOf('export function getBrandSeoEntry'));
  return [...body.matchAll(/^ {2}['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((match) => match[1]);
};
const configArg = process.argv.indexOf('--config');
const configFile = configArg > 0 ? path.resolve(process.argv[configArg + 1]) : src('config/brandSeoConfig.ts');
const checkedEntry = configArg > 0 ? loadTs(configFile).getBrandSeoEntry : getBrandSeoEntry;
const keys = curatedKeys(configFile);
assert.ok(keys.length >= 50, `expected the curated brand keys, parsed ${keys.length}`);
const keySet = new Set(keys);

const ALLOWED_TOKENS = new Set(['{prixMin}', '{prixMax}', '{nbEnStock}', '{nbProduits}']);
const TOKEN = /\{[^{}]*\}/g;
const BANNED_HEADLINE = /\b(meilleur(?:e|s|es)?|pas cher|n°\s?1|numéro\s?1|officiel(?:le|s|les)?|authentique)\b/i;
const BANNED_ANYWHERE = /import(?:é|e)s?\s+officiellement|distributeur\s+officiel|revendeur\s+officiel|100\s?%\s+authentique|garanti(?:e)?\s+authentique/i;
const BANNED_HEALTH = /\b(guérit|guérir|soigne|brûle(?:r)? (?:les )?graisses|fait maigrir|booste(?:r)? la testostérone|renforce(?:r)? (?:le système immunitaire|l[’']immunité)|perte de poids garantie)\b/i;

const strings = (value) => (typeof value === 'string' ? [value]
  : Array.isArray(value) ? value.flatMap(strings)
    : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []);

const violations = [];
const flag = (key, message) => violations.push(`${key}: ${message}`);
const anchorTargets = new Map();
const pairCounts = new Map();

for (const key of keys) {
  const entry = checkedEntry(key);
  if (!entry) { flag(key, 'parsed key does not resolve through getBrandSeoEntry'); continue; }

  const prefix = entry.metaTitle.match(/^(.+?)\s+Tunisie\b/)?.[1];
  if (!prefix) flag(key, `metaTitle does not start with « {Marque} Tunisie »: ${entry.metaTitle}`);
  else if (!key.startsWith(rawBrandSlug(prefix))) flag(key, `metaTitle prefix « ${prefix} » does not match the slug`);
  if (entry.metaTitle.length > 60) flag(key, `metaTitle ${entry.metaTitle.length} > 60 characters`);
  const filled = entry.metaDescription.replace(TOKEN, '999');
  if (filled.length > 155) flag(key, `metaDescription ${filled.length} > 155 characters (tokens as 999)`);

  for (const value of strings(entry)) {
    for (const token of value.match(TOKEN) ?? []) {
      if (!ALLOWED_TOKENS.has(token)) flag(key, `unknown token ${token}`);
    }
  }
  const tokenFree = [
    ['metaTitle', entry.metaTitle], ['h1', entry.h1], ['howToChooseTitle', entry.howToChooseTitle],
    ...entry.faqs.map((faq, i) => [`faqs[${i}].question`, faq.question]),
    ...entry.relatedCategories.map((link, i) => [`relatedCategories[${i}].name`, link.name]),
  ];
  for (const [field, value] of tokenFree) {
    if (TOKEN.test(value)) flag(key, `token in ${field}: ${value}`);
    TOKEN.lastIndex = 0;
  }

  for (const [field, value] of [['metaTitle', entry.metaTitle], ['metaDescription', entry.metaDescription], ['h1', entry.h1]]) {
    const hit = value.match(BANNED_HEADLINE);
    if (hit) flag(key, `banned « ${hit[0]} » in ${field}`);
  }
  const all = strings(entry).join('\n');
  const banned = all.match(BANNED_ANYWHERE);
  if (banned) flag(key, `banned claim « ${banned[0]} »`);
  const health = all.match(BANNED_HEALTH);
  if (health) flag(key, `health claim « ${health[0]} »`);

  if (entry.faqs.length < 4 || entry.faqs.length > 7) flag(key, `${entry.faqs.length} FAQs (4–7 expected)`);
  if (entry.relatedCategories.at(-1)?.url !== '/brands') flag(key, 'relatedCategories must end with the /brands chip');

  if (entry.relatedBrands !== undefined) {
    const related = entry.relatedBrands;
    if (!Array.isArray(related) || related.length < 2 || related.length > 4) flag(key, 'relatedBrands must hold 2–4 slugs');
    else {
      if (new Set(related).size !== related.length) flag(key, 'relatedBrands has duplicates');
      for (const slug of related) {
        if (slug === key) flag(key, 'relatedBrands lists the brand itself');
        else if (!keySet.has(slug)) flag(key, `relatedBrands « ${slug} » has no curated entry`);
      }
    }
  }
  if (entry.officialUrl !== undefined) {
    let host = '';
    try { host = new URL(String(entry.officialUrl)).hostname; } catch { /* reported below */ }
    if (!/^https:\/\//.test(String(entry.officialUrl)) || !host) flag(key, `officialUrl must be an https URL: ${entry.officialUrl}`);
    else if (host === 'protein.tn' || host.endsWith('.protein.tn')) flag(key, 'officialUrl must not point at protein.tn');
  }

  for (const link of entry.relatedCategories) {
    if (!anchorTargets.has(link.name)) anchorTargets.set(link.name, new Set());
    anchorTargets.get(link.name).add(link.url);
    const pair = `${link.url}\u0000${link.name}`;
    pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
  }
}

/* ── (c) one anchor → one destination; one destination never gets the same anchor twice ── */
for (const [anchor, urls] of anchorTargets) {
  if (urls.size > 1) violations.push(`anchors: « ${anchor} » points to ${[...urls].join(' and ')}`);
}
for (const [pair, count] of pairCounts) {
  if (count > 1) {
    const [url, anchor] = pair.split('\u0000');
    violations.push(`anchors: ${url} receives « ${anchor} » ${count} times`);
  }
}

/* Every curated entry renders through the builder without leaking a token, whatever the stock. */
for (const key of curatedKeys(src('config/brandSeoConfig.ts'))) {
  for (const facts of [{ inStockCount: null, priceMin: null, priceMax: null }, { inStockCount: 0, priceMin: null, priceMax: null }, { inStockCount: 2, priceMin: 10, priceMax: 20 }]) {
    const copy = buildBrandPageCopy({ slug: key, brand: { id: 1, designation_fr: key }, products: [inStock(), backOrder()], facts });
    const leak = [copy.leadHtml, copy.introHtml ?? '', copy.howToChooseBody, ...copy.faqs.flatMap((f) => [f.question, f.answer])].find((v) => v.includes('{'));
    assert.equal(leak, undefined, `${key}: unresolved token rendered`);
  }
  // ONE in stock: the noun after a count token agrees (« 1 produits en stock » was live on
  // /c4-cellucor, 06/10/2026), in the description and in every copy field.
  const one = { inStockCount: 1, priceMin: 149, priceMax: 149 };
  const oneCopy = buildBrandPageCopy({ slug: key, brand: { id: 1, designation_fr: key }, products: [inStock({ prix: 149 }), backOrder()], facts: one });
  const oneDesc = resolveCategoryMetaDescription(getBrandSeoEntry(key).metaDescription, { ...one, productCount: 2 });
  for (const value of [oneDesc, oneCopy.leadHtml, oneCopy.introHtml ?? '', oneCopy.howToChooseBody, ...oneCopy.faqs.map((f) => f.answer)]) {
    assert.doesNotMatch(value, /(?<![\d,.])1 (?:produits|références|fiches)(?![\p{L}])/u, `${key}: plural noun after a count of 1`);
  }
}
assert.equal(
  resolveCategoryMetaDescription('Dès {prixMin} DT, {nbEnStock} produits en stock.', { inStockCount: 1, priceMin: 149, priceMax: 149 }),
  'Dès 149 DT, 1 produit en stock.'
);
assert.equal(
  resolveCategoryMetaDescription('Dès {prixMin} DT, {nbEnStock} produits en stock.', { inStockCount: 3, priceMin: 119, priceMax: 200 }),
  'Dès 119 DT, 3 produits en stock.'
);

if (violations.length) {
  console.error(`\nBrand copy rules: ${violations.length} violation(s) in ${path.relative(root, configFile)}`);
  for (const line of violations) console.error(`  - ${line}`);
  process.exit(1);
}
console.log(`Brand copy rules: ${keys.length} curated entries pass.`);
