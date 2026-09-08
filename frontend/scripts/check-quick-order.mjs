// Exercise the real quick-order route and shared payload builder with an in-memory upstream.
// No network, Laravel boot, customer data, or real orders are involved.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import ts from 'typescript';

function compile(relative, dependencies = {}) {
  const filename = path.resolve(relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = module.require.bind(module);
  module.require = (id) => dependencies[id] ?? originalRequire(id);
  module._compile(compiled, filename);
  return module.exports;
}

const builder = compile('src/lib/orderPayload.ts');
const { POST } = compile('src/app/api/quick-order/route.ts', { '@/lib/orderPayload': builder });
const originalFetch = globalThis.fetch;
const valid = {
  productId: 440, qty: 1, nom: 'Ali', prenom: 'Ahmed Ben', email: '', phone: '20123456',
  gouvernorat: 'TUNIS', delegation: 'TUNIS', localite: 'CENTRE', priceSnapshot: 279,
  deliveryFeeSnapshot: 10,
};
let checks = 0;
let requests = 0;
let forwarded;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const send = (payload) => POST(new Request('http://localhost/api/quick-order', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `fixture-${requests++}`, 'Idempotency-Key': 'quick-order-fixture' },
  body: JSON.stringify(payload),
}));
try {
  globalThis.fetch = async (_url, options) => {
    check(options.headers['Idempotency-Key'], 'quick-order-fixture');
    forwarded = JSON.parse(options.body);
    return Response.json({ id: 123, numero: 'FIXTURE-123' });
  };
  for (const email of [undefined, '', '   ', 'client@example.com']) {
    const response = await send({ ...valid, email });
    check(response.status, 200);
    check(forwarded.commande.livraison_email, email?.trim() || undefined);
    check(forwarded.commande.email, email?.trim() || undefined);
    check(forwarded.commande.livraison_nom, 'Ali');
    check(forwarded.commande.livraison_prenom, 'Ahmed Ben');
    check(forwarded.commande.livraison_phone, valid.phone);
    check(forwarded.panier, [{ produit_id: 440, quantite: 1, prix_unitaire: 279 }]);
  }
  check((await send({ ...valid, nom: 'Ahmed', prenom: '' })).status, 200);
  check(forwarded.commande.livraison_nom, 'Ahmed');
  check(forwarded.commande.livraison_prenom, undefined);
  for (const email of ['invalid', 'a@b', 'x @example.com']) {
    forwarded = undefined;
    const response = await send({ ...valid, email });
    check(response.status, 400);
    check((await response.json()).error, 'Email invalide.');
    check(forwarded, undefined);
  }
  for (const field of ['nom', 'phone', 'gouvernorat', 'delegation', 'localite']) {
    forwarded = undefined;
    check((await send({ ...valid, [field]: '' })).status, 400);
    check(forwarded, undefined);
  }
  check((await send({ ...valid, phone: '2012345' })).status, 400);
  forwarded = undefined;
  check(await (await send({ website: 'spam' })).json(), { orderId: 0, status: 'ignored' });
  check(forwarded, undefined);
} finally {
  globalThis.fetch = originalFetch;
}
console.log(`${checks} quick-order checks passed (no network).`);
