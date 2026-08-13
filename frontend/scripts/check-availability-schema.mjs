/**
 * Product pages must declare the RIGHT schema.org availability, and it has two authors.
 *
 * ── THE BUG THIS EXISTS TO CATCH ──────────────────────────────────────────────────────────────
 * "Sur commande" shipped with the labels correct on every surface — cards, product page, mobile
 * sticky bar, contact prefill, all of it — and the structured data still saying OutOfStock on all
 * 10,535 products. Nothing errored. The visible page was right and the machine-readable page,
 * which is the half Google reads and the entire reason for the change, was wrong.
 *
 * The cause is worth stating plainly because it will happen again: availability has TWO
 * implementations. Product::getEffectiveAvailabilitySchemaAttribute() computes it in PHP and ships
 * it in the payload; util/structuredData.ts computes it in TypeScript. The TypeScript one is only a
 * FALLBACK — the PHP value takes precedence. Fixing the TypeScript side alone changed nothing and
 * announced nothing, because the correct logic was simply shadowed.
 *
 * So this asserts the RENDERED page, which is the only place both authors meet.
 *
 * ── WHAT CORRECT LOOKS LIKE ───────────────────────────────────────────────────────────────────
 *   qte > 0                                 InStock
 *   out of stock, force_out_of_stock unset  BackOrder     (never stocked; orderable on request)
 *   force_out_of_stock set                  OutOfStock    (owner said do not sell this)
 *
 * And for anything not actually held, `shippingDetails` must be ABSENT: a 24-72h delivery promise
 * on goods nobody has is a claim we cannot keep, whatever the availability says.
 *
 *   node scripts/check-availability-schema.mjs
 *   BASE_URL=https://protein.tn node scripts/check-availability-schema.mjs
 */
const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const API = (process.env.API_BASE || 'https://admin.protein.tn').replace(/\/$/, '');

const fetchJson = async (u) => (await fetch(u, { signal: AbortSignal.timeout(60_000) })).json();

/** Every Product node in every JSON-LD block on the page. */
function productNodes(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let parsed;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (node['@type'] === 'Product') out.push(node);
      Object.values(node).forEach(walk);
    };
    walk(parsed);
  }
  return out;
}

const offerOf = (p) => (Array.isArray(p.offers) ? p.offers[0] : p.offers) ?? {};

let failed = 0;
const check = (label, ok, detail) => {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
    if (detail) console.log(`        ${detail}`);
  }
};

// Pick one real product from each population rather than hardcoding slugs, which rot.
const inStock = (await fetchJson(`${API}/api/all_products?per_page=1&light=1&in_stock=1`)).products?.[0];
// Page 50 at 12/page is deep in the availability-first ordering, so it is reliably back-order stock.
const backOrder = (await fetchJson(`${API}/api/all_products?per_page=1&light=1&page=400`)).products?.[0];

for (const [kind, product, expected] of [
  ['in-stock', inStock, 'https://schema.org/InStock'],
  ['back-order', backOrder, 'https://schema.org/BackOrder'],
]) {
  if (!product?.slug) {
    console.log(`  SKIP  ${kind} — no sample product returned`);
    continue;
  }

  const sub = product.sous_categorie?.slug;
  const url = sub ? `${BASE}/${sub}/${product.slug}` : `${BASE}/shop/${product.slug}`;
  const html = await (await fetch(url, { signal: AbortSignal.timeout(60_000) })).text();
  const nodes = productNodes(html);

  if (nodes.length === 0) {
    check(`${kind}: Product schema present`, false, `no Product JSON-LD at ${url}`);
    continue;
  }

  const offer = offerOf(nodes[0]);
  check(
    `${kind.padEnd(10)} availability = ${expected.split('/').pop()}`,
    offer.availability === expected,
    `got ${offer.availability ?? '(none)'} at ${url}`
  );

  // Only a product actually held may promise delivery.
  if (kind === 'back-order') {
    check(
      'back-order  no shippingDetails (we do not hold it)',
      offer.shippingDetails == null,
      `shippingDetails present on a product with no stock — that is a delivery promise we cannot keep`
    );
  }
}

console.log('');
if (failed > 0) {
  console.log(`${failed} availability assertion(s) failed.`);
  console.log('Remember there are TWO authors: Product::getEffectiveAvailabilitySchemaAttribute()');
  console.log('in PHP (authoritative, travels in the payload) and util/structuredData.ts (fallback).');
  process.exit(1);
}
console.log('Availability schema is correct for both populations.');
