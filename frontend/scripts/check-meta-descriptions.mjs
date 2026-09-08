// Offline regression check: real staged API payloads, actual production helpers, no catalogue writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
// Use the installed compiler so extensionless TS imports and @/ aliases work with plain node.
function loadTs(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, mod);
  mod.require = (specifier) => {
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return require(specifier);
    const base = specifier.startsWith('@/')
      ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    const target = [base, `${base}.ts`, path.join(base, 'index.ts')].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert.ok(target, `Cannot resolve ${specifier} from ${filename}`);
    return target.endsWith('.ts') ? loadTs(target) : require(target);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}

const { productDescription, isFormulaicProductDescription } = loadTs(path.join(root, 'src/util/productMetaDescription.ts'));
const { buildMetaDescription } = loadTs(path.join(root, 'src/util/sanitizeProductHtml.ts'));
const { getPriceDisplay, formatTnd } = loadTs(path.join(root, 'src/util/productPrice.ts'));
const { buildProductJsonLd, sanitizeBackendProductJsonLd } = loadTs(path.join(root, 'src/util/structuredData.ts'));

// Frozen pre-Phase-6 implementation for reproducible before/after measurement.
function beforeProductDescription(product, productName) {
  const explicit = product.seo?.description || product.seo_description || product.meta_description || product.meta_description_fr;
  if (explicit?.trim()) {
    const plain = buildMetaDescription(explicit, { title: productName, maxLen: 160 });
    if (plain) {
      /*
       * Imported catalogue rows often carry one identical template with only the category changed:
       * "… en Tunisie. Livraison 24-72h… paiement… authentique." It is valid text but weak SERP
       * copy—the highest-impression example, Omega 3 Fish Oil, earned 3,475 impressions at position
       * 7.4 and only 0.75% CTR. Google explicitly recommends bringing scattered product facts such
       * as price together in a product description, so enrich ONLY that known template. Hand-written
       * benefit copy remains authoritative.
       */
      const isGenericImportTemplate =
        /livraison\s+24\s*[-–]\s*72h/i.test(plain) &&
        /paiement\s+[àa]\s+la\s+livraison/i.test(plain) &&
        /authentique/i.test(plain);

      if (!isGenericImportTemplate) return plain;

      const price = getPriceDisplay(product).finalPrice;
      const priceText = Number.isFinite(price) && price > 0 ? ` : ${Math.round(price)} DT` : '';
      return buildMetaDescription(
        `${productName}${priceText}. Livraison 24–72h partout en Tunisie, paiement à la livraison. Produit authentique.`,
        { maxLen: 160 }
      );
    }
  }
  // Leave room for the trust line rather than truncating it away.
  const plain = buildMetaDescription(product.description_fr, { title: productName, maxLen: 90 });
  if (plain) return `${plain} Prix Tunisie. Livraison 24-72h. Protéine Tunisie.`;
  return `Acheter ${productName} en Tunisie – Meilleur prix, livraison rapide, produits authentiques. Sousse, Tunis, toute la Tunisie. Protéine Tunisie.`;
}


// Committed slim fixtures (identity + copy + price fields only, description_fr truncated to
// 2,500 chars) so this guard actually runs for anyone who checks the repo out. Pass a
// directory argument to re-run it against a fresh live sample.
const fixtureDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'scripts/fixtures/meta-descriptions');
const files = fs.readdirSync(fixtureDir).filter((file) => file.endsWith('.json')).sort();
assert.ok(files.length, `No JSON fixtures in ${fixtureDir}`);
const counts = {
  before: { formulaic: 0, enriched: 0, over160: 0, missingPrice: 0 },
  after: { formulaic: 0, enriched: 0, over160: 0, missingPrice: 0 },
};
let failures = 0;
let offerChecks = 0;
for (const file of files) {
  const payload = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), 'utf8'));
  const product = payload.product ?? payload.data?.product ?? payload.data ?? payload;
  assert.ok(product.designation_fr || product.slug, `Invalid product fixture: ${file}`);
  const name = product.designation_fr ?? product.slug ?? 'Produit';
  const explicit = product.seo?.description || product.seo_description || product.meta_description || product.meta_description_fr;
  const before = beforeProductDescription(product, name);
  const after = productDescription(product, name);
  const formulaicInput = !!explicit && isFormulaicProductDescription(explicit, product, name);
  const finalPrice = getPriceDisplay(product).finalPrice;
  const canonical = `https://protein.tn/test/${product.slug || product.id}`;
  for (const schema of [buildProductJsonLd(product, canonical), sanitizeBackendProductJsonLd(product, product.json_ld_product ?? {}, canonical)]) {
    assert.match(schema?.offers?.priceValidUntil ?? '', /^\d{4}-\d{2}-\d{2}$/, `${file}: missing Offer expiry`);
    assert.ok(schema.offers.priceValidUntil >= new Date().toISOString().slice(0, 10), `${file}: past Offer expiry`);
    offerChecks++;
  }
  const oldPlain = buildMetaDescription(explicit, { title: name, maxLen: 160 });
  for (const [phase, description] of Object.entries({ before, after })) {
    const formulaic = isFormulaicProductDescription(description, product, name);
    const over160 = description.length > 160;
    const missingPrice = finalPrice > 0 && !description.includes(formatTnd(finalPrice));
    counts[phase].formulaic += Number(formulaic);
    counts[phase].enriched += Number(formulaicInput && description !== oldPlain);
    counts[phase].over160 += Number(over160);
    counts[phase].missingPrice += Number(missingPrice);
    if (phase === 'after' && (formulaic || over160 || (formulaicInput && missingPrice))) {
      console.error(`FAIL ${file}: formulaic=${formulaic}, length=${description.length}, missingPrice=${missingPrice}\n${description}`);
      failures++;
    }
    if (over160 || missingPrice) console.log(`${phase} ${file}: length=${description.length}, missingPrice=${missingPrice}`);
  }
  if (!formulaicInput) assert.equal(after, before, `${file}: non-formulaic behavior changed`);
  if (process.env.VERBOSE) console.log(`${file}\nBEFORE: ${before}\nAFTER:  ${after}`);
}
console.log(`Fixtures: ${files.length}`);
for (const phase of ['before', 'after']) console.log(`${phase}: ${JSON.stringify(counts[phase])}`);

// Contrasts matter: stock clauses alongside facts must not overrule an editor, even if those
// facts occur after the SERP length limit. Also exercise templates absent from a future sample.
const example = {
  designation_fr: 'Exemple D3 – Orange – 110 comprimés', prix: 26.5,
  brand: { designation_fr: 'Exemple' }, sous_categorie: { designation_fr: 'Vitamines' },
  description_fr: '<h2>Exemple D3</h2><p>Comprimés à croquer sans gluten, au goût d’orange.</p>',
};
for (const copy of [
  `${example.designation_fr} — en vente en Tunisie. Livraison 24-72h partout en Tunisie. Paiement à la livraison.`,
  'Exemple D3, Orange, 110 comprimés. Rayon Vitamines, marque Exemple, sur Protéine Tunisie.',
  `${example.designation_fr} — Vitamines en Tunisie. Livraison 24–72h. Paiement à la livraison. Produit 100% authentique.`,
  `${example.designation_fr}. Marque Exemple sur Protéine Tunisie.`,
  `${example.designation_fr}. Fiche produit du rayon Vitamines sur Protéine Tunisie.`,
  `${example.designation_fr}. Vitamines. Exemple. Protein.tn.`,
  example.designation_fr,
]) {
  assert.equal(isFormulaicProductDescription(copy, example, example.designation_fr), true, copy);
  const enriched = productDescription({ ...example, seo_description: copy }, example.designation_fr);
  assert.ok(enriched.includes('26.5 DT') && enriched.includes('sans gluten') && enriched.length <= 160);
  assert.ok(!enriched.includes('Exemple D3'));
  for (const benefit of [' Sans gluten.', ` ${'Une formule pensée pour le quotidien. '.repeat(6)}Avec du calcium.`]) {
    const handwritten = copy + benefit;
    assert.equal(isFormulaicProductDescription(handwritten, example, example.designation_fr), false, handwritten);
    assert.equal(productDescription({ ...example, seo_description: handwritten }, example.designation_fr),
      buildMetaDescription(handwritten, { title: example.designation_fr, maxLen: 160 }));
  }
}
for (const body of [
  '<p>La Exemple D3 Orange 110 comprimés est une formule sans gluten.</p>',
  '<p>Énergie &amp; performance. Une formule sans gluten. '.repeat(20),
  `<p>${'anticonstitutionnellement'.repeat(20)}</p>`,
]) {
  for (const prix of [26.5, 0]) {
    const description = productDescription({ ...example, prix, description_fr: body, seo_description: example.designation_fr }, example.designation_fr);
    assert.ok(description.length <= 160);
    assert.ok(!description.includes('Exemple D3') && !description.includes('&amp;'));
    assert.equal(description.includes('26.5 DT'), prix > 0);
    assert.ok(!description.includes('anticonstitutionnellement'), 'Never emit a fragment of a long unbroken token');
  }
}
console.log('Template and editor-preservation regression checks passed.');
const future = new Date();
future.setDate(future.getDate() + 10);
const promoExpiry = future.toISOString();
const rolling = new Date();
rolling.setFullYear(rolling.getFullYear() + 1);
for (const [extra, expected] of [
  [{ promo: 20, promo_expiration_date: promoExpiry }, promoExpiry.slice(0, 10)],
  [{ promo: 20, promo_expiration_date: '2000-01-01' }, rolling.toISOString().slice(0, 10)],
  [{ promo: 20, promo_expiration_date: 'invalid' }, rolling.toISOString().slice(0, 10)],
  [{ price_valid_until: promoExpiry }, promoExpiry.slice(0, 10)],
  [{ price_valid_until: null }, rolling.toISOString().slice(0, 10)],
]) {
  const product = { ...example, id: 1, ...extra };
  for (const schema of [buildProductJsonLd(product, 'https://protein.tn/test'), sanitizeBackendProductJsonLd(product, {}, 'https://protein.tn/test')]) {
    assert.equal(schema.offers.priceValidUntil, expected);
    offerChecks++;
  }
}
console.log(`Offer expiry checks passed: ${offerChecks} (both builders; API expiry, active/expired/invalid promo, rolling year).`);
process.exitCode = failures ? 1 : 0;
