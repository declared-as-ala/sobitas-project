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
  assert.match(raw, /^.+\. Dès \{prixMin\} DT, \{nbEnStock\} produits en stock\.$/, `${slug}: one droppable final sentence`);
  const resolved = resolve(raw, { priceMin: 999, inStockCount: 999 });
  assert.ok(resolved.length <= 155, `${slug}: ${resolved.length} characters`);
  assert.equal(resolve(raw, { priceMin: null, inStockCount: 0 }), raw.split('. Dès ')[0] + '.');
  assert.equal(resolve(raw, { priceMin: null, inStockCount: 5 }), raw.split('. Dès ')[0] + '.');
  assert.equal(resolve(raw, { priceMin: 99, inStockCount: null }), raw.split('. Dès ')[0] + '.');
  console.log(`${slug}: ${resolved.length} characters`);
}
console.log('Category meta description: 4 cases; curated brand descriptions: 10 cases passed');
