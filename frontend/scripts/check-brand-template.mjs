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
const { buildGenericBrandTemplate } = loadTs(src('util/brandTemplate.ts'));
const { buildGenericBrandMetaDescription, buildBrandMetaDescription } = loadTs(src('util/brandMeta.ts'));
const { buildBrandLandingSchemas } = loadTs(src('util/brandJsonLd.ts'));

const products = [
  { id: 1, slug: 'first', designation_fr: 'First', sous_categorie: { slug: 'whey-isolate', designation_fr: 'Whey Isolate' } },
  { id: 2, slug: 'second', designation_fr: 'Second', sous_categorie: { slug: 'whey-proteine', designation_fr: 'Whey Protéine' } },
];
const facts = { inStockCount: 2, priceMin: 260, priceMax: 400 };
const template = buildGenericBrandTemplate('BPI SPORTS', products, facts);
assert.equal(template.heading, 'BPI SPORTS Tunisie : Whey Isolate et Whey Protéine');
assert.equal((template.introHtml.match(/<p>/g) ?? []).length, 2);
assert.match(template.introHtml, /href="\/whey-isolate"/);
assert.match(template.introHtml, /2 en stock/);
assert.match(template.introHtml, /260 à 400 DT/);
assert.equal(template.howToChooseTitle, 'Bien choisir un produit BPI SPORTS');
assert.equal(template.faqs.length, 3);
const empty = buildGenericBrandTemplate('BSN', [], { inStockCount: 0, priceMin: null, priceMax: null });
assert.equal(empty.heading, 'BSN Tunisie');
assert.equal((empty.introHtml.match(/<p>/g) ?? []).length, 2);
assert.equal(empty.faqs.length, 3);
assert.match(empty.faqs[0].answer, /Aucun produit BSN/);
const schema = buildBrandLandingSchemas({
  brand: { id: 1, designation_fr: 'BPI SPORTS' }, products, slug: 'bpi-sports',
  baseUrl: 'https://protein.tn', faqs: template.faqs, description: 'test',
});
assert.equal(schema.filter((node) => node['@type'] === 'FAQPage').length, 1);

for (const unknown of [null, 0]) {
  const missing = buildGenericBrandTemplate('BPI SPORTS', products, { inStockCount: unknown, priceMin: null, priceMax: null });
  assert.doesNotMatch(missing.introHtml, /en stock|prix/);
}
const description = buildGenericBrandMetaDescription('BPI SPORTS', ['Whey Isolate', 'Whey Protéine'], 2, facts);
assert.ok(description.length <= 155);
assert.ok(buildGenericBrandMetaDescription('A'.repeat(200), [], 2, facts).length <= 155);
assert.match(description, /2 produits \(Whey Isolate.*dont 2 en stock de 260 à 400 DT/);
assert.doesNotMatch(buildGenericBrandMetaDescription('BPI SPORTS', [], 2, { ...facts, priceMax: 260, inStockCount: 0 }), /en stock|260 à/);
assert.equal(buildBrandMetaDescription('Optimum Nutrition'), loadTs(src('config/brandSeoConfig.ts')).getBrandSeoEntry('optimum-nutrition').metaDescription);
console.log('Brand template: H1, two linked paragraphs, fact dropping, FAQPage and curated copy passed.');
