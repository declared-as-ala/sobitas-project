/**
 * DEV ONLY. A pass-through proxy to the real API that injects reviews into product_details.
 *
 * Run it, then start the dev server pointed at it:
 *
 *   node scripts/dev-mock-reviews.mjs
 *   NEXT_PUBLIC_API_URL=http://localhost:3199/api npm run dev
 *
 * Nothing here is imported by the application and nothing it returns reaches production.
 *
 * The PDP is server-rendered, so the product payload is fetched by Node, not the browser —
 * puppeteer request interception cannot reach it. Nothing in the catalogue has a published review
 * (50 products sampled across five categories returned zero), so without this the hero star row,
 * the rating distribution and the "Achat vérifié" gating would ship having never rendered once.
 */
import { createServer } from 'node:http';

const UPSTREAM = 'https://admin.protein.tn/api';

const REVIEWS = [
  { id: 9001, stars: 5, comment: 'Excellent produit, livraison rapide et emballage impeccable.', publier: 1, verified: 1, commande_id: 77, created_at: '2026-08-01T10:00:00Z', user: { id: 1, name: 'Yassine B.' } },
  // verified = 0 AND no order id — this one must NOT get the badge. That is the whole test.
  { id: 9002, stars: 4, comment: 'Bon rapport qualite prix.', publier: 1, verified: 0, commande_id: null, created_at: '2026-07-20T10:00:00Z', user: { id: 2, name: 'Sarra M.' } },
  { id: 9003, stars: 4, comment: 'Conforme a la description.', publier: 1, verified: 0, commande_id: 88, created_at: '2026-07-11T10:00:00Z', user: { id: 3, name: 'Mehdi K.' } },
  { id: 9004, stars: 5, comment: 'Je recommande.', publier: 1, verified: 1, commande_id: 91, created_at: '2026-07-02T10:00:00Z', user: { id: 4, name: 'Amine T.' } },
  { id: 9005, stars: 3, comment: 'Correct sans plus.', publier: 1, verified: 0, commande_id: null, created_at: '2026-06-22T10:00:00Z', user: { id: 5, name: 'Ines R.' } },
];

createServer(async (req, res) => {
  const path = req.url.replace(/^\/api/, '');
  try {
    const upstream = await fetch(UPSTREAM + path, { headers: { accept: 'application/json' } });
    const text = await upstream.text();
    let body = text;

    if (/^\/product_details/.test(path) && upstream.ok) {
      try {
        const json = JSON.parse(text);
        const target = json.product ?? json;
        target.reviews = REVIEWS;
        // 4.4 on purpose: every previous star row used Math.round, which would draw five solid
        // stars for it. The half-star clip must render 88%, not 100%.
        target.note = 4.4;
        body = JSON.stringify(json);
      } catch {
        /* leave the body alone if it is not the shape we expect */
      }
    }

    res.writeHead(upstream.status, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(error) }));
  }
}).listen(3199, () => console.log('mock api on http://localhost:3199/api'));
