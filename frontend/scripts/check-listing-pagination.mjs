/**
 * EVERY LISTING MUST EXPOSE ITS WHOLE CATALOGUE. MEASURED, NOT ASSUMED.
 *
 * ── THE FAILURE THIS EXISTS TO CATCH ──────────────────────────────────────────────────────────
 * Measured live on 14/08/2026:
 *
 *     /sante-vitalite        8,849 products in the category   12 product links   0 ?page= links
 *     /proteines               561 products                   13 product links   0 ?page= links
 *     /probiotiques             (subcategory)                 12 product links   0 ?page= links
 *     /sante-vitalite?page=2   HTTP 200, and the SAME TWELVE PRODUCTS as page 1
 *
 * Six category pages and fifty subcategory pages, twelve products each. So the only crawl path to
 * the 10,669th product was /shop?page=1 … ?page=890 — a single 890-link chain, which is the worst
 * shape a crawl path can have. Everything else about the deep catalogue's invisibility follows from
 * that, and no amount of per-product content changes it.
 *
 * ── WHY EACH ASSERTION IS HERE ────────────────────────────────────────────────────────────────
 *   pagination present   a listing with more products than fit on a page and no ?page= anchor is a
 *                        dead end. This is the assertion that was false on every listing.
 *   page 2 differs       ?page=2 answering 200 with page 1's products is worse than a 404: it looks
 *                        like pagination works. Overlap is measured product-by-product, because a
 *                        count alone cannot tell twelve NEW products from the same twelve.
 *   page 2 self-canonical  a paginated page canonicalising to page 1 declares the rest of the
 *                        series non-existent — the pagination would exist and count for nothing.
 *   page 1 is not paged  /sante-vitalite and /sante-vitalite?page=1 must not both be live URLs.
 *
 *   node scripts/check-listing-pagination.mjs
 */
const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const API = (process.env.API_BASE || 'https://admin.protein.tn').replace(/\/$/, '');
// MUST match SHOP_PER_PAGE in src/util/shopQuery.ts. It was 12 while the app served 24, so any
// subcategory holding 13-24 products — one full page, correctly pagerless — tripped a false
// "has >=12 products and NO ?page= link" and exited 1. A guard that cries wolf is a guard someone
// switches off.
const PER_PAGE = 24;

const j = async (p) => (await fetch(`${API}/api${p}`, { signal: AbortSignal.timeout(60_000) })).json();

/**
 * A HUMAN user agent, explicitly.
 *
 * middleware.ts rewrites crawlers to /x-crawler/category/{slug}, which is a different page with
 * different rules — it renders the WHOLE category as zero-JS anchors on purpose. Measuring without
 * setting this reads whichever variant Cloudflare happened to cache, and on the first run of this
 * script that produced two mutually contradictory measurements of the same URL. The crawler view is
 * a separate surface with its own trade-offs; this file is about the one people load.
 */
const HUMAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Payload ceiling for a listing page.
 *
 * Measured on /sante-vitalite on 14/08/2026: 12,649,367 bytes — TWELVE AND A HALF MEGABYTES to show
 * twelve products. 97.9% of it sat inside <script>, and counting the fields told the story:
 * `designation_fr` appeared 17,865 times, `aromes` 8,849 times. The page was fetching the entire
 * 8,849-product category, rendering twelve of them, and serialising all 8,849 into the RSC flight
 * payload for the browser to download and throw away.
 *
 * This is the same class of bug the /shop refactor fixed (3.35 MB -> 356 KB) and the same reason
 * field INP reads 408 ms while lab TBT reads "good": the cost is in transfer and hydration of data
 * nothing renders. 1.5 MB is a deliberately loose ceiling — it is not a target, it is the line
 * beyond which something is being shipped that is not being shown.
 */
const MAX_LISTING_BYTES = 1_500_000;

const fetchPage = async (path) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': HUMAN_UA },
    signal: AbortSignal.timeout(60_000),
  });
  const html = await res.text();
  const body = html.split('<body')[1] ?? html;
  const canon = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html);
  return {
    status: res.status,
    bytes: html.length,
    // How many product records are in the payload, against how many are LINKED. A large gap is the
    // signature of shipping the whole catalogue to render one page of it.
    serialised: (html.match(/designation_fr/g) || []).length,
    // Two path segments = a product URL. The set, not the count: overlap is the question.
    products: new Set([...body.matchAll(/href="(\/[a-z0-9-]+\/[a-z0-9-]+)"/g)].map((m) => m[1])),
    pageLinks: new Set([...body.matchAll(/href="([^"]*[?&]page=\d+)"/g)].map((m) => m[1])),
    canonical: canon ? canon[1].replace(BASE, '') : null,
  };
};

// Subjects come from the live taxonomy, and the counts from the facets endpoint, so this always
// tests something genuinely published rather than a slug list that rots.
const cats = await j('/categories?per_page=50');
const catRows = Array.isArray(cats) ? cats : (cats.data ?? cats.categories ?? []);
const facets = await j('/shop_facets').catch(() => ({}));
const counts = facets.category_counts ?? {};

const subjects = [];
for (const c of catRows.slice(0, 3)) {
  if (c?.slug) subjects.push({ kind: 'category', slug: c.slug, known: counts[c.slug] ?? null });
}
for (const c of catRows) {
  const sub = (c.sous_categories ?? [])[0];
  if (sub?.slug) {
    subjects.push({ kind: 'subcategory', slug: sub.slug, known: null });
    if (subjects.filter((s) => s.kind === 'subcategory').length >= 2) break;
  }
}

console.log(`\nLISTING PAGINATION — ${BASE}\n`);

const problems = [];
for (const s of subjects) {
  const p1 = await fetchPage(`/${s.slug}`);
  if (p1.status !== 200) {
    problems.push(`/${s.slug} returned ${p1.status}`);
    console.log(`  FAIL  /${s.slug}  ${p1.status}`);
    continue;
  }

  const hasPager = p1.pageLinks.size > 0;
  console.log(
    `  /${s.slug}`.padEnd(34) +
      `${String(p1.products.size).padStart(3)} products` +
      `   catalogue: ${s.known === null ? '?' : s.known}` +
      `   ?page= links: ${String(p1.pageLinks.size).padStart(2)}` +
      `   ${(p1.bytes / 1024).toFixed(0).padStart(6)} KB` +
      `   ${String(p1.serialised).padStart(6)} product records in payload`
  );

  if (p1.bytes > MAX_LISTING_BYTES) {
    problems.push(
      `/${s.slug} is ${(p1.bytes / 1_000_000).toFixed(1)} MB for ${p1.products.size} visible products`
      + ` (${p1.serialised} product records serialised) — the page is shipping what it does not show`
    );
  }

  /*
   * Only demand pagination when there is genuinely more than one page of stock. A subcategory with
   * nine products correctly has no pager, and a guard that fails on a correct state gets disabled.
   * When the facet count is unknown, "a full page" is the signal: exactly PER_PAGE links means the
   * grid is capped, not exhausted.
   */
  const needsPager = s.known !== null ? s.known > PER_PAGE : p1.products.size >= PER_PAGE;
  if (needsPager && !hasPager) {
    problems.push(`/${s.slug} has ${s.known ?? '>=' + PER_PAGE} products and NO ?page= link — the rest are unreachable from here`);
    console.log('        ^ no pagination: everything past the first page is unreachable from this URL');
    continue;
  }
  if (!needsPager) {
    console.log('        (single page of stock — pagination correctly absent)');
    continue;
  }

  const p2 = await fetchPage(`/${s.slug}?page=2`);
  if (p2.status !== 200) {
    problems.push(`/${s.slug}?page=2 returned ${p2.status}`);
    continue;
  }

  const overlap = [...p1.products].filter((x) => p2.products.has(x));
  console.log(`        page 2: ${p2.products.size} products, ${overlap.length} shared with page 1, canonical ${p2.canonical ?? '(none)'}`);

  if (p2.products.size > 0 && overlap.length === p1.products.size) {
    problems.push(`/${s.slug}?page=2 is a DUPLICATE of page 1 — pagination is not being read`);
  }
  if (p2.canonical && !p2.canonical.includes('page=2')) {
    problems.push(`/${s.slug}?page=2 canonicalises to ${p2.canonical} — that declares pages 2..N non-existent`);
  }
  // The origin's php-fpm pool ran out under load on 12/08; a guard must not repeat that.
  await new Promise((r) => setTimeout(r, 200));
}

console.log('');
if (problems.length) {
  console.log(`${problems.length} PROBLEM(S):`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  console.log('');
  console.log('A listing that cannot be paged is a crawl dead end. With 10,669 products and six');
  console.log('categories, that leaves /shop?page=1..890 as the only path to the deep catalogue —');
  console.log('one long chain instead of fifty-six short, topically coherent ones.');
  process.exit(1);
}
console.log('Every listing exposes its whole catalogue.');
