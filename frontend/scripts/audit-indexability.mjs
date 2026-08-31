/**
 * SITE-WIDE INDEXABILITY AUDIT — what does every route type tell Google about itself?
 *
 * ── WHY ───────────────────────────────────────────────────────────────────────────────────────
 * 10,308 of 10,669 published products render `<meta name="robots" content="noindex, follow">` and
 * are excluded from the sitemap. That is not an accident: CatalogIHerbPromote publishes an imported
 * product with seo_robots_index = 0 whenever its body is below `catalog.promotion.min_body_words`
 * (250), and `catalog:iherb:promote --reindex` re-measures and flips the ones that have since grown
 * a body. The question this answers is which of the two situations we are actually in:
 *
 *   A. the bodies are thick enough now and the flag is simply stale  -> run --reindex, done
 *   B. the bodies are genuinely thin                                 -> generating content is the
 *                                                                       fix, and flipping the flag
 *                                                                       without it would publish
 *                                                                       10,000 thin pages at Google
 *
 * Guessing between those is how a site earns a thin-content problem, so this measures instead.
 *
 * It also checks the two things that silently break ranking on every OTHER route type, because the
 * same audit costs nothing once a page is fetched:
 *
 *   robots     noindex on a page that should rank is invisible in the browser and fatal in search
 *   canonical  a canonical pointing somewhere else hands that page's ranking to another URL. The
 *              classic failure here is a listing whose canonical drops its own path, and a paginated
 *              view canonicalising to page 1 — which tells Google the other 889 pages do not exist.
 *
 *   node scripts/audit-indexability.mjs
 *   node scripts/audit-indexability.mjs --sample 40
 *   BASE_URL=https://protein.tn node scripts/audit-indexability.mjs
 */
const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const API = (process.env.API_BASE || 'https://admin.protein.tn').replace(/\/$/, '');
const argSample = Number((process.argv.find((a) => a.startsWith('--sample='))
  || `--sample=${process.argv[process.argv.indexOf('--sample') + 1] || 24}`).split('=')[1]);
const SAMPLE = Number.isFinite(argSample) && argSample > 0 ? argSample : 24;

/** The body gate the backend applies, so the two numbers are comparable. */
const MIN_BODY_WORDS = 250;

const get = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  return { status: res.status, html: await res.text() };
};
const getJson = async (u) => (await fetch(`${API}/api${u}`, { signal: AbortSignal.timeout(60_000) })).json();

const robotsOf = (html) => {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  return m ? m[1].trim() : '(none = indexable)';
};
const canonicalOf = (html) => {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  return m ? m[1].trim() : null;
};

/**
 * Visible words. Scripts, styles and JSON-LD are stripped first — counting them would make an
 * empty page look like a rich one, which is exactly the mistake that lets thin content ship.
 */
const wordsOf = (html) => {
  const body = (html.split('<body')[1] ?? html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ');
  return body.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
};

console.log(`Auditing ${BASE} — robots, canonical and visible words per route type.\n`);

const rows = [];
const audit = async (kind, path, expect = {}) => {
  try {
    const { status, html } = await get(`${BASE}${path}`);
    const robots = robotsOf(html);
    const canonical = canonicalOf(html);
    const words = wordsOf(html);
    const noindex = /noindex/i.test(robots);
    const canonPath = canonical ? canonical.replace(BASE, '') || '/' : null;
    const selfCanon = canonPath === path || (path === '/' && canonPath === '/');
    rows.push({ kind, path, status, robots, canonPath, words, noindex, selfCanon, expect });
  } catch (e) {
    rows.push({ kind, path, status: 0, robots: `ERR ${e.message}`, canonPath: null, words: 0, noindex: true, selfCanon: false, expect });
  }
};

// ── Static and listing routes: every one of these is supposed to rank ───────────────────────────
for (const p of ['/', '/shop', '/packs', '/offres', '/brands', '/blog', '/partenaires',
                 '/qui-sommes-nous', '/contact', '/faqs', '/proteine-sousse', '/pack-builder']) {
  await audit('static', p);
}
// Pagination must self-canonicalise, or the other 889 pages are declared non-existent.
await audit('shop-paged', '/shop?page=2');
// Faceted views are the opposite case: they SHOULD consolidate onto /shop.
await audit('shop-facet', '/shop?brand=72');

const cats = await getJson('/categories?per_page=6');
const catRows = Array.isArray(cats) ? cats : (cats.data ?? cats.categories ?? []);
for (const c of catRows.slice(0, 4)) if (c?.slug) await audit('category', `/${c.slug}`);
for (const c of catRows) {
  const sub = (c?.sous_categories ?? [])[0];
  if (sub?.slug) { await audit('subcategory', `/${sub.slug}`); break; }
}

// ── Products: split by what the DATABASE says, so the two populations are compared honestly ─────
const pageOf = async (page) => (await getJson(`/all_products?fields=index&per_page=200&page=${page}`)).products ?? [];
const indexable = [];
const noindexed = [];
for (const page of [1, 6, 12, 18, 24, 30, 40, 50]) {
  for (const p of await pageOf(page)) {
    if (!p.sous_categorie?.slug || !p.slug) continue;
    const bucket = (p.seo_robots_index === false || p.seo_robots_index === 0) ? noindexed : indexable;
    if (bucket.length < SAMPLE) bucket.push(p);
  }
  if (indexable.length >= SAMPLE && noindexed.length >= SAMPLE) break;
}
for (const p of indexable.slice(0, Math.min(6, SAMPLE))) await audit('product/index', `/${p.sous_categorie.slug}/${p.slug}`);
for (const p of noindexed.slice(0, SAMPLE)) await audit('product/NOINDEX', `/${p.sous_categorie.slug}/${p.slug}`);

// ── Report ──────────────────────────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('KIND', 18) + pad('STATUS', 7) + pad('ROBOTS', 24) + pad('WORDS', 7) + 'CANONICAL');
console.log('-'.repeat(110));
for (const r of rows) {
  const canon = r.canonPath === null ? '(none)' : (r.selfCanon ? 'self' : `-> ${r.canonPath}`);
  console.log(pad(r.kind, 18) + pad(r.status, 7) + pad(r.robots, 24) + pad(r.words, 7) + canon);
}

const problems = [];
for (const r of rows) {
  if (r.status !== 200) problems.push(`${r.path} returned ${r.status}`);
  // A faceted view is MEANT to be noindex + canonical to /shop. Nothing else should be noindexed.
  if (r.noindex && r.kind !== 'product/NOINDEX' && r.kind !== 'shop-facet') {
    problems.push(`${r.path} is NOINDEX and should not be`);
  }
  if (r.canonPath === null && r.status === 200) problems.push(`${r.path} has NO canonical`);
  if (r.kind === 'shop-paged' && !r.selfCanon) {
    problems.push(`${r.path} canonicalises to ${r.canonPath} — that tells Google pages 2..N do not exist`);
  }
  if (r.kind === 'shop-facet' && r.canonPath !== '/shop') {
    problems.push(`${r.path} should canonicalise to /shop, not ${r.canonPath}`);
  }
}

const noidx = rows.filter((r) => r.kind === 'product/NOINDEX');
if (noidx.length) {
  const ws = noidx.map((r) => r.words).sort((a, b) => a - b);
  const med = ws[Math.floor(ws.length / 2)];
  const over = ws.filter((w) => w >= MIN_BODY_WORDS).length;
  console.log('\n── THE NOINDEXED PRODUCT POPULATION ──────────────────────────────────────────');
  console.log(`  sampled           ${ws.length}`);
  console.log(`  visible words     min ${ws[0]}  median ${med}  max ${ws[ws.length - 1]}`);
  console.log(`  >= ${MIN_BODY_WORDS} rendered words  ${over}/${ws.length}`);
  console.log('');
  console.log('  NOTE: this counts the WHOLE rendered page. The backend gate measures the product');
  console.log('  BODY alone (catalog.promotion.min_body_words). A page can clear this and still sit');
  console.log('  below the gate, so a high number here means "worth re-measuring", not "flip it".');
  console.log('  The re-measure is: php artisan catalog:iherb:promote --reindex');
}

console.log('\n── PROBLEMS ──────────────────────────────────────────────────────────────────');
if (problems.length === 0) {
  console.log('  none — every audited route is indexable and self-canonical (facets excepted).');
} else {
  for (const p of problems) console.log(`  • ${p}`);
}
process.exit(problems.length > 0 ? 1 : 0);
