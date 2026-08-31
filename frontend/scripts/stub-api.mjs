/**
 * A pass-through API that injects the data this site does not have.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────────────────────
 * Not one product in this catalogue has a published review, and the reply endpoints are not
 * deployed yet. So the reviews UI — distribution bars, sort control, rows, verified badges, reply
 * threads, the guest form — cannot be rendered against the real backend at all, in any theme, at
 * any width. It would ship unseen.
 *
 * Browser request interception does not solve it: `product_details` is fetched by the NEXT SERVER
 * (`getApiBaseUrl()` returns the absolute backend URL when `window` is undefined), so the reviews
 * array is baked into the HTML before a browser is involved. The only injection point that works
 * for both halves is the API itself.
 *
 * So this proxies everything to the real backend and rewrites exactly two things on the way past:
 * the `reviews` array of a product, and the replies endpoints. It is READ-ONLY — no POST is ever
 * forwarded — so it cannot write to production even by accident.
 *
 *   node scripts/stub-api.mjs [--port 3999]
 *
 * then a dev server pointed at it:
 *
 *   NEXT_PUBLIC_API_URL=http://127.0.0.1:3999 API_BACKEND_URL=http://127.0.0.1:3999 \
 *   NEXT_DIST_DIR=.next-stub npx next dev -p 3010
 */
import http from 'node:http';

const PORT = Number(process.argv[process.argv.indexOf('--port') + 1]) || 3999;
const UPSTREAM = 'https://admin.protein.tn/api';
const NOW = '2026-08-19T10:00:00.000Z';

/** One review of each authorship kind, because the three render differently and all three break differently. */
const REVIEWS = [
  {
    id: 9001,
    product_id: 0,
    stars: 5,
    note: 5,
    comment: 'Excellent produit, goût chocolat très correct et se dissout bien au shaker. Je reprends.',
    publier: 1,
    verified: 1,
    commande_id: 4242,
    user: { id: 77, name: 'Yassine B.' },
    author_name: null,
    replies_count: 2,
    created_at: NOW,
  },
  {
    id: 9002,
    product_id: 0,
    stars: 3,
    note: 3,
    comment: 'Correct mais la livraison a pris 4 jours au lieu de 48h annoncées.',
    publier: 1,
    verified: 0,
    commande_id: null,
    user: null,
    author_name: 'Sonia',
    replies_count: 1,
    created_at: NOW,
  },
  {
    id: 9003,
    product_id: 0,
    stars: 4,
    note: 4,
    comment: 'Bon rapport qualité prix, rien à redire.',
    publier: 1,
    verified: 0,
    commande_id: null,
    user: null,
    author_name: null,
    replies_count: 0,
    created_at: NOW,
  },
];

const REPLIES = {
  9001: [
    { id: 1, review_id: 9001, parent_id: null, user_id: 88, name: 'Mehdi', body: 'Tu le prends avant ou après la séance ?', is_staff: false, created_at: NOW },
    { id: 2, review_id: 9001, parent_id: 1, user_id: 77, name: 'Yassine B.', body: 'Après, dans les 30 minutes qui suivent.', is_staff: false, created_at: NOW },
  ],
  9002: [
    { id: 3, review_id: 9002, parent_id: null, user_id: null, name: 'Protein.tn', body: 'Bonjour Sonia, désolés pour ce retard — nous avons remonté le point au transporteur.', is_staff: true, created_at: NOW },
  ],
  9003: [],
};

const send = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') return send(res, 204, {});

  const replyMatch = path.match(/^\/reviews\/(\d+)\/replies$/);
  if (replyMatch) {
    if (req.method === 'POST') {
      // Accepted and echoed back HELD, which is exactly what the real endpoint does — so the
      // "en vérification" chip is exercised rather than assumed.
      return send(res, 201, {
        message: 'Merci ! Votre réponse est en cours de vérification.',
        published: false,
        reply: {
          id: Date.now(),
          review_id: Number(replyMatch[1]),
          parent_id: null,
          user_id: null,
          name: 'Vous',
          body: 'Réponse de test',
          is_staff: false,
          created_at: NOW,
        },
      });
    }
    return send(res, 200, { replies: REPLIES[replyMatch[1]] ?? [] });
  }

  if (path === '/reviews/guest' && req.method === 'POST') {
    return send(res, 201, { message: 'Merci pour votre avis ! Il sera publié après vérification.', published: false, id: 1 });
  }

  if (path.startsWith('/members/')) {
    const id = Number(path.split('/').pop());
    if (id !== 77 && id !== 88) return send(res, 404, { message: 'Profil introuvable.' });
    return send(res, 200, {
      id,
      name: id === 77 ? 'Yassine B.' : 'Mehdi',
      member_since: '2025-03-14',
      review_count: 3,
      average_given: 4.3,
      verified_count: 2,
      reviews: REVIEWS.map((r, i) => ({
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        verified: i === 0,
        created_at: NOW,
        product: { id: 1, slug: 'nitrotech-whey-protein-1-81-kg-muscletech', designation: 'NITROTECH WHEY PROTEIN 1.81 KG MUSCLETECH', cover: null },
      })),
    });
  }

  // READ-ONLY beyond this point. A POST that reached the real backend from a measurement script
  // would write to production, so it is refused rather than forwarded.
  if (req.method !== 'GET') return send(res, 405, { message: 'stub-api is read-only' });

  try {
    const upstream = await fetch(`${UPSTREAM}${path}${url.search}`, { headers: { accept: 'application/json' } });
    const text = await upstream.text();

    if (/^\/product_details\//.test(path)) {
      try {
        const json = JSON.parse(text);
        const target = json?.product ?? json;
        if (target && typeof target === 'object') {
          target.reviews = REVIEWS.map((r) => ({ ...r, product_id: target.id ?? 0 }));
        }
        return send(res, 200, json);
      } catch {
        // Unparseable upstream — pass it through rather than inventing a product.
      }
    }

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
  console.log(`stub-api listening on http://127.0.0.1:${PORT} (upstream ${UPSTREAM}, read-only)`);
});
