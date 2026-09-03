// Exercise the actual Next route with an in-memory upstream. No request reaches production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const filename = path.resolve('src/app/api/orders/route.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const route = new Module(filename);
route.filename = filename;
route.paths = Module._nodeModulePaths(path.dirname(filename));
route._compile(compiled, filename);
const originalFetch = globalThis.fetch;
const originalLog = console.log;
const originalError = console.error;
let checks = 0;
try {
  console.log = console.error = () => {};
  const request = () => new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'synthetic-key-123456789' }, body: JSON.stringify({ commande: {}, panier: [] }) });
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers['Idempotency-Key'], 'synthetic-key-123456789'); checks++;
    return Response.json({ message: 'Invalid fields', errors: { 'commande.livraison_phone': ['invalid'] } }, { status: 422 });
  };
  let response = await route.exports.POST(request());
  assert.equal(response.status, 422); checks++;
  assert.deepEqual((await response.json()).errors, { 'commande.livraison_phone': ['invalid'] }); checks++;
  globalThis.fetch = async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); };
  response = await route.exports.POST(request());
  assert.equal(response.status, 500); checks++;
  assert.match((await response.json()).error, /Réessayez sans modifier votre commande/); checks++;
  globalThis.fetch = async () => Response.json({ id: 1, order_token: 'synthetic-token' }, { status: 201 });
  response = await route.exports.POST(request());
  assert.equal((await response.json()).order_token, 'synthetic-token'); checks++;
} finally {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
  console.error = originalError;
}
console.log(`${checks} order proxy checks passed (mock upstream only).`);
