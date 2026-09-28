import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const cache = new Map();
function loadTs(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file);
  mod.filename = file;
  cache.set(file, mod);
  mod.require = (specifier) => specifier.startsWith('.')
    ? loadTs(path.resolve(path.dirname(file), `${specifier}.ts`))
    : require(specifier);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, file);
  return mod.exports;
}
const { findInStockSibling } = loadTs(path.join(here, '../src/util/inStockSibling.ts'));
const product = (id, name, brandId, qte, brandName = 'Optimum Nutrition') => ({
  id, designation_fr: name, brand_id: brandId, brand: { designation_fr: brandName },
  qte, rupture: qte === 0, prix: id * 10,
});

const serious = product(1, 'Serious Mass 2,7 kg', 1, 0);
const seriousLarge = product(2, 'Serious Mass 5,45 kg', 1, 5);
const whey = product(3, 'Gold Standard 100% Whey 2,27 kg', 1, 5);
assert.equal(findInStockSibling(serious, [seriousLarge, whey])?.id, seriousLarge.id);

const wheyLarge = product(4, '100% Whey Gold Standard 4,5 kg', 1, 0);
const wheyMiddle = product(5, '100% Whey Gold Standard 2,27 kg', 1, 5);
assert.equal(findInStockSibling(wheyLarge, [wheyMiddle, seriousLarge])?.id, wheyMiddle.id);

const creatine = product(6, 'Creatine Monohydrate 1 kg', 1, 0, 'Brand A');
const otherBrand = product(7, 'Creatine Monohydrate 500 g', 2, 5, 'Brand B');
assert.equal(findInStockSibling(creatine, [otherBrand]), null);
assert.equal(findInStockSibling(seriousLarge, [serious]), null);
assert.equal(findInStockSibling(serious, [product(8, 'Serious Mass 500 g', 1, 0)]), null);
const expensive = { ...product(9, 'Serious Mass 3 kg', 1, 5), prix: 500 };
assert.equal(findInStockSibling(serious, [expensive, seriousLarge])?.id, seriousLarge.id);
// Real catalogue names (28/09/2026): the unit is glued to a decimal weight.
const gs45 = product(10, '100% WHEY GOLD STANDARD – 4.5KG', 1, 0);
const gs227 = product(11, '100% WHEY GOLD STANDARD – 2.27KG', 1, 63);
assert.equal(findInStockSibling(gs45, [gs227, seriousLarge])?.id, gs227.id);
console.log('7 in-stock sibling checks passed.');
