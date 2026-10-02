// Exercise the actual Next route with an in-memory upstream. No request reaches production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const filename = path.resolve('src/app/api/orders/route.ts');
/*
 * The route is compiled and run as CommonJS, which knows nothing about the `@/…` path alias or
 * about TypeScript. Both are taught here rather than by keeping the route import-free: this guard
 * exists to exercise the REAL route, and a route that may not import a helper is a route that has
 * to inline every helper — which is how /api/orders and /api/quick-order drifted apart before.
 */
const srcRoot = path.resolve('src');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const base = path.join(srcRoot, request.slice(2));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return originalResolveFilename.call(this, request, ...rest);
};
const transpile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
Module._extensions['.ts'] = (mod, file) => mod._compile(transpile(file), file);
const compiled = transpile(filename);
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
  /*
   * A NextRequest carries a cookie jar; a plain Request does not, and the route reads `pt_aff`
   * off it to stamp affiliate attribution. The jar is supplied here so the guard exercises the
   * real code path — `cookie` is the value the browser is pretending to hold, `body` is what the
   * browser tried to send.
   */
  const request = (cookie, body = { commande: {}, panier: [] }) => {
    const req = new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'synthetic-key-123456789' }, body: JSON.stringify(body) });
    Object.defineProperty(req, 'cookies', { value: { get: (name) => (name === 'pt_aff' && cookie ? { name, value: cookie } : undefined) } });
    return req;
  };
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers['Idempotency-Key'], 'synthetic-key-123456789'); checks++;
    return Response.json({ message: 'Invalid fields', errors: { 'commande.livraison_phone': ['invalid'] } }, { status: 422 });
  };
  let response = await route.exports.POST(request());
  assert.equal(response.status, 422); checks++;
  assert.deepEqual((await response.json()).errors, { 'commande.livraison_phone': ['invalid'] }); checks++;
  globalThis.fetch = async () => Response.json({ message: 'Le total de votre commande a changé.', pricing: { total_dt: 190 } }, { status: 409 });
  response = await route.exports.POST(request());
  assert.equal(response.status, 409); checks++;
  assert.deepEqual((await response.json()).pricing, { total_dt: 190 }); checks++;
  globalThis.fetch = async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); };
  response = await route.exports.POST(request());
  assert.equal(response.status, 500); checks++;
  assert.match((await response.json()).error, /Réessayez sans modifier votre commande/); checks++;
  globalThis.fetch = async () => Response.json({ id: 1, order_token: 'synthetic-token' }, { status: 201 });
  response = await route.exports.POST(request());
  assert.equal((await response.json()).order_token, 'synthetic-token'); checks++;

  /*
   * ── AFFILIATE ATTRIBUTION COMES FROM THE COOKIE, NEVER FROM THE BODY ──────────────────────
   * This is a money property: `affiliate_subdomain` decides who the backend pays for the order.
   * A browser that can put it in the request body can pay itself, so the proxy discards the body
   * value and rewrites it from the HttpOnly cookie. Asserted in all four combinations, because
   * only one of them ("no cookie, forged body") is the one that costs anything to get wrong.
   */
  let forwarded = null;
  globalThis.fetch = async (_url, options) => { forwarded = JSON.parse(options.body); return Response.json({ id: 1 }, { status: 201 }); };

  await route.exports.POST(request('ali'));
  assert.equal(forwarded.affiliate_subdomain, 'ali'); checks++;

  await route.exports.POST(request(null));
  assert.equal('affiliate_subdomain' in forwarded, false); checks++;

  await route.exports.POST(request(null, { commande: {}, panier: [], affiliate_subdomain: 'attacker' }));
  assert.equal('affiliate_subdomain' in forwarded, false); checks++;

  await route.exports.POST(request('ali', { commande: {}, panier: [], affiliate_subdomain: 'attacker' }));
  assert.equal(forwarded.affiliate_subdomain, 'ali'); checks++;

  // A cookie that is not a valid hostname label is dropped rather than forwarded for the backend
  // to reject: nothing downstream should ever see a string this side already knows is malformed.
  await route.exports.POST(request('NOT A LABEL'));
  assert.equal('affiliate_subdomain' in forwarded, false); checks++;

  /*
   * ── QUICK ORDER: A 409 CARRIES THE SERVER TOTAL, AND THE CONFIRMED TOTAL GOES BACK ──────────
   * The drawer computes its own total. When the server would charge more (a code capped by the
   * order budget, a machine that never reaches free delivery) it refuses with 409 + pricing; the
   * drawer must receive that pricing and send the confirmed total as expected_total, or the
   * customer can never order at all.
   */
  const quickFile = path.resolve('src/app/api/quick-order/route.ts');
  const quick = new Module(quickFile);
  quick.filename = quickFile;
  quick.paths = Module._nodeModulePaths(path.dirname(quickFile));
  quick._compile(transpile(quickFile), quickFile);
  const quickRequest = (extra = {}) => {
    const body = { productId: 7, qty: 1, nom: 'Test', prenom: '', phone: '20123456', gouvernorat: 'Tunis',
      delegation: 'Bab Bhar', localite: 'Tunis', priceSnapshot: 1200, deliveryFeeSnapshot: 0, ...extra };
    const req = new Request('http://localhost/api/quick-order', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' }, body: JSON.stringify(body) });
    Object.defineProperty(req, 'cookies', { value: { get: () => undefined } });
    return req;
  };
  globalThis.fetch = async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return Response.json({ message: 'Le total de votre commande a changé : 1210.00 DT à payer à la livraison.', pricing: { total_dt: 1210, shipping_dt: 10 } }, { status: 409 });
  };
  response = await quick.exports.POST(quickRequest());
  assert.equal(response.status, 409); checks++;
  assert.deepEqual((await response.json()).pricing, { total_dt: 1210, shipping_dt: 10 }); checks++;
  assert.equal('expected_total' in forwarded, false); checks++;
  globalThis.fetch = async (_url, options) => { forwarded = JSON.parse(options.body); return Response.json({ id: 9, numero: '2026/0009' }, { status: 201 }); };
  response = await quick.exports.POST(quickRequest({ expectedTotal: 1210 }));
  assert.equal(response.status, 200); checks++;
  assert.equal(forwarded.expected_total, 1210); checks++;
} finally {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
  console.error = originalError;
}
console.log(`${checks} order proxy checks passed (mock upstream only).`);
