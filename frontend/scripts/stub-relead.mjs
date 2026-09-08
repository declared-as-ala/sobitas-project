/**
 * A pass-through API that produces the sur-commande sheet's degenerate state.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────────────────────
 * `ProductRequestDialog` has a state where there is nothing in stock to offer. It is the one that
 * MUST be honest and useful — telling somebody "rien à afficher" after they have just said what
 * they want is the worst reply on the surface — and it is the one that cannot be reached on live
 * data. Measured 08/09/2026 across 600 products and every subcategory that contains a sur-commande
 * item: `/similar_products/{sub}` answered with 5-6 IN-STOCK siblings in every single case. So the
 * empty pane would ship having never been looked at, in either theme, at any width.
 *
 * Browser request interception cannot produce it either. The product page fetches its alternatives
 * on the SERVER (`getApiBaseUrl()` returns the absolute backend URL when `window` is undefined) and
 * hands them to the sheet as props, so the array is decided before a browser exists. The only
 * injection point that reaches both halves is the API.
 *
 * This therefore proxies everything to the real backend and rewrites exactly one thing on the way
 * past: `/similar_products/*` answers with an empty list. Every other byte — the product, its
 * price, its stock flags, its nutrition panel — is production's. It is READ-ONLY: no POST is ever
 * forwarded, so it cannot write to the live shop even by accident.
 *
 *   node scripts/stub-relead.mjs [--port 3998] [--mode empty|passthrough]
 *
 * then a dev server pointed at it (BOTH variables — one for the browser, one for the server):
 *
 *   NEXT_PUBLIC_API_URL=http://127.0.0.1:3998 API_BACKEND_URL=http://127.0.0.1:3998 \
 *   NEXT_DIST_DIR=.next-relead-empty npx next dev -p 3022
 */
import http from 'node:http';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const PORT = Number(arg('port', 3998));
const MODE = arg('mode', 'empty');
const UPSTREAM = 'https://admin.protein.tn/api';

const send = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,OPTIONS',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') return send(res, 204, {});
  // READ-ONLY. A POST that reached the real backend from a measurement run would write to
  // production, so it is refused rather than forwarded.
  if (req.method !== 'GET') return send(res, 405, { message: 'stub-relead is read-only' });

  /*
   * The ONE rewrite. Shape matches the real endpoint (`{ products: [...] }`) so the frontend takes
   * its ordinary success path and renders the empty state, rather than its error path — those are
   * two different screens and conflating them would mean measuring neither.
   */
  if (MODE === 'empty' && /^\/similar_products\//.test(path)) {
    return send(res, 200, { products: [] });
  }

  /*
   * `--mode error` is a DIFFERENT screen, not a harsher version of the same one. An empty list is
   * "we looked and we have nothing"; a failed call is "we could not look". The sheet says both,
   * and only the second can reach the reader from a product CARD — the product page catches the
   * failure server-side and passes an empty array, so `loadError` is unreachable there.
   */
  if (MODE === 'error' && /^\/similar_products\//.test(path)) {
    return send(res, 503, { message: 'stub-relead: forced failure' });
  }

  try {
    const upstream = await fetch(`${UPSTREAM}${path}${url.search}`, { headers: { accept: 'application/json' } });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'access-control-allow-origin': '*',
    });
    res.end(text);
  } catch (e) {
    send(res, 502, { message: 'upstream failed', error: String(e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`stub-relead listening on http://127.0.0.1:${PORT} (upstream ${UPSTREAM}, read-only, mode=${MODE})`);
});
