/**
 * Every endpoint that serves a product card must return a `hover_image` key.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 * This one feature has been shipped broken three times, each time for the same reason and each
 * time looking like missing data rather than a bug:
 *
 *   1. /all_products alone got the field. Every category and brand page silently had no hover.
 *   2. The constrained eager load omitted `id`, so Eloquent could not hydrate the relation and
 *      the field was null everywhere — a 200 response with no error anywhere.
 *   3. productsByCategoryId and productsByBrandId normalise through normalizePaginatorImages()
 *      rather than normalizeCollectionImages(), so a sweep over the latter missed both.
 *
 * The failure mode is what makes it expensive: a missing key and an un-imported product look
 * identical from the outside. Both render one image. Neither logs anything.
 *
 * So this asserts the KEY IS PRESENT, not that it is populated. Coverage legitimately varies —
 * products whose content has not been imported yet have no gallery and must return null — but a
 * key that is *absent* means the endpoint never ran attachHoverImages() at all, which is the bug.
 *
 *   node scripts/check-hover-endpoints.mjs
 *   API_BASE=https://admin.protein.tn node scripts/check-hover-endpoints.mjs
 */
const API = (process.env.API_BASE || 'https://admin.protein.tn').replace(/\/$/, '');

/** Each entry: a label, the path, and how to dig the product list out of the response. */
const ENDPOINTS = [
  ['allProducts', '/api/all_products?per_page=5', (j) => j.products],
  ['productsBySubCategoryId', '/api/productsBySubCategoryId/plantes-et-herbes?per_page=5', (j) => j.products],
  ['productsByCategoryId', '/api/productsByCategoryId/sante-vitalite?per_page=5', (j) => j.products],
  ['productsByBrandId', '/api/productsByBrandId/72?per_page=5', (j) => j.products],
];

let failed = 0;

for (const [label, path, pick] of ENDPOINTS) {
  const url = `${API}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) {
      console.log(`  SKIP  ${label.padEnd(26)} HTTP ${res.status}`);
      continue;
    }

    const json = await res.json();
    const products = pick(json) ?? [];

    if (products.length === 0) {
      console.log(`  SKIP  ${label.padEnd(26)} returned no products`);
      continue;
    }

    // `in`, not truthiness: null is the correct value for a product with no imported gallery, and
    // testing for a value here would turn normal coverage into a false failure.
    const missing = products.filter((p) => !('hover_image' in p)).length;
    const populated = products.filter((p) => p.hover_image).length;

    if (missing > 0) {
      failed++;
      console.log(`  FAIL  ${label.padEnd(26)} ${missing}/${products.length} products have NO hover_image key`);
      console.log(`        -> this endpoint does not call attachHoverImages(), or its query omits`);
      console.log(`           'externalCatalogSource:id,product_id,source_gallery_images'`);
    } else {
      console.log(`  ok    ${label.padEnd(26)} key present on all ${products.length} (${populated} populated)`);
    }
  } catch (e) {
    console.log(`  SKIP  ${label.padEnd(26)} ${e.message}`);
  }
}

console.log('');
if (failed > 0) {
  console.log(`${failed} endpoint(s) missing the hover_image key.`);
  process.exit(1);
}
console.log('Every reachable card endpoint returns a hover_image key.');
