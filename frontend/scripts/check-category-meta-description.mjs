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

assert.equal(resolve('Créatine dès {prixMin} DT. {nbEnStock} produits en stock.', { priceMin: 49, inStockCount: 12 }), 'Créatine dès 49 DT. 12 produits en stock.');
assert.equal(resolve('Choisissez votre créatine. Prix dès {prixMin} DT.', { priceMin: null, inStockCount: 12 }), 'Choisissez votre créatine.');
assert.equal(resolve('Choisissez votre créatine. {nbEnStock} produits en stock. Prix dès {prixMin} DT.', { priceMin: null, inStockCount: 0 }), 'Choisissez votre créatine.');
assert.equal(resolve('Choisissez votre créatine.', { priceMin: null, inStockCount: null }), 'Choisissez votre créatine.');
console.log('Category meta description: 4 cases passed');
