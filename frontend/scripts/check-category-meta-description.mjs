import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = fs.readFileSync(path.join(root, 'src/util/resolveCategorySeo.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
new Function('exports', 'require', compiled)(exports, () => ({}));
const { resolveCategoryMetaDescription: resolve } = exports;
const { resolveCategoryIntroHtml, resolveCategoryFaqs } = exports;

assert.equal(resolve('Créatine dès {prixMin} DT. {nbEnStock} produits en stock.', { priceMin: 49, inStockCount: 12 }), 'Créatine dès 49 DT. 12 produits en stock.');
assert.equal(resolve('Choisissez votre créatine. Prix dès {prixMin} DT.', { priceMin: null, inStockCount: 12 }), 'Choisissez votre créatine.');
assert.equal(resolve('Choisissez votre créatine. {nbEnStock} produits en stock. Prix dès {prixMin} DT.', { priceMin: null, inStockCount: 0 }), 'Choisissez votre créatine.');
assert.equal(resolve('Choisissez votre créatine.', { priceMin: null, inStockCount: null }), 'Choisissez votre créatine.');
const categoryFacts = { priceMin: 59, priceMax: 250, inStockCount: 12 };
assert.equal(resolve('Prix de {prixMin} à {prixMax} DT. {nbEnStock} produits en stock.', categoryFacts), 'Prix de 59 à 250 DT. 12 produits en stock.');
assert.equal(resolve('Choisissez votre whey. Prix de {prixMin} à {prixMax} DT.', { ...categoryFacts, priceMax: null }), 'Choisissez votre whey.');
assert.equal(resolve('Choisissez votre whey. Prix de {prixMin} à {prixMax} DT.', { ...categoryFacts, priceMax: 59 }), 'Choisissez votre whey.');
const intro = '<h2>Whey isolate</h2><p>Prix de <strong>{prixMin}</strong> à {prixMax} DT.</p><p>Livraison en Tunisie.</p>';
assert.equal(resolveCategoryIntroHtml(intro, categoryFacts), '<h2>Whey isolate</h2><p>Prix de <strong>59</strong> à 250 DT.</p><p>Livraison en Tunisie.</p>');
assert.equal(resolveCategoryIntroHtml(intro, { ...categoryFacts, priceMax: null }), '<h2>Whey isolate</h2><p>Livraison en Tunisie.</p>');
assert.equal(resolveCategoryIntroHtml('<p>Notre gamme.</p><div>Prix de {prixMin} à {prixMax} DT.</div>', { ...categoryFacts, priceMax: null }), '<p>Notre gamme.</p><div></div>');
const faqs = resolveCategoryFaqs([{ question: 'Quel prix ?', answer: 'De {prixMin} à {prixMax} DT. Livraison disponible.' }], categoryFacts);
assert.equal(faqs[0].answer, 'De 59 à 250 DT. Livraison disponible.');
assert.equal(resolveCategoryFaqs([{ question: 'Quel prix ?', answer: 'De {prixMin} à {prixMax} DT. Livraison disponible.' }], { ...categoryFacts, priceMax: null })[0].answer, 'Livraison disponible.');
const arabicAnswer = 'كم السعر؟ يتراوح السعر بين {prixMin} و{prixMax} دينار مع {nbEnStock} منتجات متوفرة! قارن السعر حسب الغرام.';
assert.equal(resolveCategoryFaqs([{ question: 'كم السعر؟', answer: arabicAnswer }], categoryFacts)[0].answer,
  'كم السعر؟ يتراوح السعر بين 59 و250 دينار مع 12 منتجات متوفرة! قارن السعر حسب الغرام.');
assert.equal(resolveCategoryFaqs([{ question: 'كم السعر؟', answer: arabicAnswer }], { ...categoryFacts, priceMax: null })[0].answer,
  'كم السعر؟ قارن السعر حسب الغرام.');
assert.equal(resolve('يتراوح السعر بين {prixMin} و{prixMax} دينار مع {nbEnStock} منتجات متوفرة الآن. قارن السعر حسب الغرام قبل الشراء.',
  { ...categoryFacts, priceMax: null }), 'قارن السعر حسب الغرام قبل الشراء.');
for (const value of [resolveCategoryIntroHtml(intro, { ...categoryFacts, priceMax: null }), ...resolveCategoryFaqs(faqs, categoryFacts).map((faq) => faq.answer)]) {
  assert.doesNotMatch(value, /\{(?:prixMin|prixMax|nbEnStock)\}/);
}

const brandSource = fs.readFileSync(path.join(root, 'src/config/brandSeoConfig.ts'), 'utf8');
const brandAst = ts.createSourceFile('brandSeoConfig.ts', brandSource, ts.ScriptTarget.Latest, true);
const targetBrands = [
  'optimum-nutrition', 'biotech-usa', 'kevin-levrone', 'real-pharm', 'ostrovit',
  'muscletech', 'dymatize', 'scenit-nutrition', 'eric-favre', 'c4-cellucor',
];
const descriptions = new Map();
function visit(node) {
  if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
    const slug = node.name.text;
    if (targetBrands.includes(slug)) {
      const meta = node.initializer.properties.find((property) => property.name?.text === 'metaDescription');
      assert.ok(meta && ts.isPropertyAssignment(meta) && ts.isStringLiteral(meta.initializer), `${slug}: missing literal description`);
      descriptions.set(slug, meta.initializer.text);
    }
  }
  ts.forEachChild(node, visit);
}
visit(brandAst);
assert.equal(descriptions.size, targetBrands.length);
for (const [slug, raw] of descriptions) {
  assert.match(raw, /^.+\. Dès \{prixMin\} DT, \{nbEnStock\} (?:produits )?en stock\.$/, `${slug}: one droppable final sentence`);
  const resolved = resolve(raw, { priceMin: 999, inStockCount: 999 });
  assert.ok(resolved.length <= 155, `${slug}: ${resolved.length} characters`);
  assert.equal(resolve(raw, { priceMin: null, inStockCount: 0 }), raw.split('. Dès ')[0] + '.');
  assert.equal(resolve(raw, { priceMin: null, inStockCount: 5 }), raw.split('. Dès ')[0] + '.');
  assert.equal(resolve(raw, { priceMin: 99, inStockCount: null }), raw.split('. Dès ')[0] + '.');
  console.log(`${slug}: ${resolved.length} characters`);
}
console.log('Category meta description and copy facts: French and Arabic cases; curated brand descriptions: 10 cases passed');
