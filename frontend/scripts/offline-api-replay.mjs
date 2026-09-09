#!/usr/bin/env node
/**
 * A LOCAL, OFFLINE STAND-IN FOR admin.protein.tn — REPLAY FIRST, THEN SYNTHESISE.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 * 09/09/2026: the VPS went down and admin.protein.tn answers 522 with a ~20s timeout. Every
 * storefront page awaits that call, so `next dev` renders nothing at all — the whole site is
 * unusable locally, and a production build cannot even complete (it died prerendering /faqs).
 *
 * `.next/cache/fetch-cache` still holds every API response Next fetched while the backend was
 * up. Each entry is JSON carrying `data.url`, `data.status`, `data.headers` and a base64
 * `data.body`. That corpus turns out to be far richer than "a few sample pages": the sitemap and
 * category crawls walked `/productsByCategoryId/{slug}?per_page=100&page=N` to the END of every
 * one of the six rayons, so the union of those bodies is 11,367 distinct published products —
 * the whole catalogue, at the listing projection.
 *
 * ── THE TWO LAYERS ──────────────────────────────────────────────────────────────────────────
 * 1. REPLAY. An exact path+query match returns the byte-identical cached response. Highest
 *    fidelity, and it is what serves the category pages.
 * 2. SYNTHESIS. Everything else is answered from an in-memory index built out of those same
 *    bodies — filtered, sorted and paginated the way ApisController actually does it. This is
 *    what makes /shop, /accueil and the homepage rails work, none of which were ever cached.
 *
 * ── THE RULE THIS FILE IS WRITTEN AROUND ────────────────────────────────────────────────────
 * NEVER INVENT PRODUCT DATA. Every name, price, stock flag, image and slug served here was read
 * out of a real cached response. Nothing is generated, defaulted or guessed. An endpoint with no
 * underlying data returns a valid EMPTY payload (or a real 404), never a plausible-looking row.
 * This is a storefront: a made-up price is worse than a missing one.
 *
 * Two derivations are deliberate, and are derivations rather than inventions — both are noted at
 * their use sites:
 *   • `publier: 1` on the index projection — every cached row came from a `where(publier, 1)`
 *     query, so its publication state is known, not assumed.
 *   • ordering falls back to `id` descending where `created_at` is absent from the listing
 *     projection (it is present on only 4 of 11,367 rows). That changes the ORDER of real rows;
 *     it does not add a field to any of them.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────
 *   node scripts/offline-api-replay.mjs --port 4000
 *   NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api API_BACKEND_URL=http://127.0.0.1:4000/api \
 *     npx next dev -H 0.0.0.0 -p 3000
 *
 * Flags: --port <n>  --cache <comma,separated,dirs>  --quiet
 *
 * This is a LOCAL DEVELOPMENT TOOL. It never writes, never reaches the network, and must never
 * be pointed at by anything deployed. See docs/local-offline-dev.md.
 */

import { readdirSync, readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, basename, normalize, sep } from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const PORT = Number(arg('port', 4000));
const QUIET = argv.includes('--quiet');
/** Local mirror of the Laravel public disk, for the /storage shim. See STORAGE below. */
const STORAGE_ROOT = arg('storage', '../filament/storage2/app/public');
const DIRS = (arg('cache', '.next/cache/fetch-cache,.next-verify/cache/fetch-cache,.next-lan/cache/fetch-cache,.next-whey/cache/fetch-cache') || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

/* ── ApisController constants, copied so the shapes match rather than approximate them ───── */
const MAX_PER_PAGE = 100;      // ApisController::MAX_PER_PAGE
const DEFAULT_PER_PAGE = 20;   // ApisController::DEFAULT_PER_PAGE
const PRODUCT_INDEX = ['id', 'slug', 'designation_fr', 'cover', 'brand_id', 'sous_categorie_id',
  'publier', 'seo_robots_index', 'updated_at', 'created_at'];

const FRONTEND_BASE = 'https://protein.tn';
const API_BASE = 'https://admin.protein.tn/api';

const truthy = (v) => v === 1 || v === true || v === '1';

/* ══════════════════════════════════════════════════════════════════════════════════════════
   1. LOAD THE CORPUS
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/** path+query -> {status, body:Buffer, contentType} — the byte-identical replay layer. */
const routes = new Map();
/** Parsed bodies, in load order, for the index build. */
const parsed = [];
let files = 0;

/**
 * A miss served by an EARLIER run of this server can itself get written into fetch-cache, and it
 * would then shadow the real thing forever. Recognise the sentinel and drop it on load — this is
 * the one case where a cached "response" is not evidence of anything.
 */
const isEmptySentinel = (j) =>
  j && typeof j === 'object' && !Array.isArray(j) &&
  Array.isArray(j.items) && Array.isArray(j.pages) && Array.isArray(j.articles) &&
  j.per_page === 0 && j.total === 0;

for (const dir of DIRS) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    let entry;
    try { entry = JSON.parse(readFileSync(join(dir, name), 'utf8')); } catch { continue; }
    const d = entry?.data;
    if (!d?.url || typeof d.body !== 'string') continue;
    let u;
    try { u = new URL(d.url); } catch { continue; }
    if (!u.pathname.startsWith('/api/')) continue; // PubMed etc. also live in this cache

    const buf = Buffer.from(d.body, 'base64');
    let json = null;
    try { json = JSON.parse(buf.toString('utf8')); } catch { /* non-JSON: replay only */ }
    if (isEmptySentinel(json)) continue;

    files += 1;
    if (json !== null) parsed.push({ url: d.url, path: u.pathname, search: u.search, json });

    const key = u.pathname + u.search;
    const prev = routes.get(key);
    // First writer wins per key, but a 200 always beats a non-200, and a longer body beats a
    // shorter one at the same status (a truncated/partial capture must not shadow a full one).
    if (prev) {
      const better = (d.status === 200 && prev.status !== 200) ||
        (d.status === prev.status && buf.length > prev.body.length);
      if (!better) continue;
    }
    const headers = d.headers || {};
    routes.set(key, {
      status: d.status ?? 200,
      body: buf,
      contentType: headers['content-type'] || headers['Content-Type'] || 'application/json; charset=utf-8',
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   2. BUILD THE INDEX
   Every value below is lifted verbatim out of a cached body. Nothing is synthesised here.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

const productsById = new Map();     // id   -> listing row
const productDetailBySlug = new Map(); // slug -> FULL /product_details row (rare: only what was cached)
const brandsById = new Map();       // id   -> {id, designation_fr, slug?, logo?, alt_cover?}
const categoriesBySlug = new Map(); // slug -> the richest category record seen
const subcatsById = new Map();      // id   -> {id, slug, designation_fr, categorie_id}
const articlesById = new Map();
const slidesById = new Map();
const cmsPageBySlug = new Map();
const aromasByName = new Map();
const tagsById = new Map();
const seoByCategorySlug = new Map();    // slug -> the `seo` envelope a cached category page carried
const seoBySubcatSlug = new Map();
const navigationItems = { navbar: [], sidebar: [] };
/** Real per-category totals reported by the backend, so a synthesised page cannot lie about size. */
const reportedCategoryTotal = new Map();

/** Merge two records of the same entity, preferring present/non-null fields. Never fabricates. */
const mergeRow = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    const cur = out[k];
    if (cur === undefined || cur === null) { out[k] = v; continue; }
    if (Array.isArray(cur) && Array.isArray(v) && v.length > cur.length) out[k] = v;
    if (cur && typeof cur === 'object' && !Array.isArray(cur) && v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { ...cur, ...v };
    }
  }
  return out;
};

const absorbProducts = (rows) => {
  if (!Array.isArray(rows)) return;
  for (const p of rows) {
    if (!p || typeof p !== 'object' || p.id == null) continue;
    productsById.set(p.id, mergeRow(productsById.get(p.id), p));
    if (p.sous_categorie && p.sous_categorie.id != null && !subcatsById.has(p.sous_categorie.id)) {
      subcatsById.set(p.sous_categorie.id, p.sous_categorie);
    }
    if (Array.isArray(p.aromes)) {
      for (const a of p.aromes) {
        const name = a?.designation_fr;
        if (name) aromasByName.set(name, mergeRow(aromasByName.get(name), a));
      }
    }
    if (Array.isArray(p.tags)) for (const t of p.tags) if (t?.id != null) tagsById.set(t.id, mergeRow(tagsById.get(t.id), t));
    if (p.brand && p.brand.id != null) brandsById.set(p.brand.id, mergeRow(brandsById.get(p.brand.id), p.brand));
  }
};

const absorbBrands = (rows) => {
  if (!Array.isArray(rows)) return;
  for (const b of rows) if (b && b.id != null) brandsById.set(b.id, mergeRow(brandsById.get(b.id), b));
};

const absorbSubcats = (rows) => {
  if (!Array.isArray(rows)) return;
  for (const s of rows) if (s && s.id != null) subcatsById.set(s.id, mergeRow(subcatsById.get(s.id), s));
};

const absorbCategory = (c) => {
  if (!c || c.id == null || !c.slug) return;
  categoriesBySlug.set(c.slug, mergeRow(categoriesBySlug.get(c.slug), c));
  absorbSubcats(c.sous_categories);
};

for (const { path, json } of parsed) {
  if (!json || typeof json !== 'object') continue;

  absorbProducts(json.products);
  absorbProducts(json.new_product);
  absorbProducts(json.best_sellers);
  absorbProducts(json.packs);
  absorbProducts(json.ventes_flash);
  absorbBrands(json.brands);
  absorbSubcats(json.sous_categories);

  if (json.category) {
    absorbCategory(json.category);
    if (json.seo && json.category.slug) seoByCategorySlug.set(json.category.slug, json.seo);
    const total = json.products_meta?.total;
    if (Number.isFinite(total) && json.category.slug) reportedCategoryTotal.set(json.category.slug, total);
  }
  if (json.sous_category) {
    absorbSubcats([json.sous_category]);
    if (json.seo && json.sous_category.slug) seoBySubcatSlug.set(json.sous_category.slug, json.seo);
  }

  if (path === '/api/categories' && Array.isArray(json.data)) for (const c of json.data) absorbCategory(c);
  if (path === '/api/accueil' && Array.isArray(json.categories)) for (const c of json.categories) absorbCategory(c);
  if (path === '/api/slides' && Array.isArray(json.data)) for (const s of json.data) if (s?.id != null) slidesById.set(s.id, s);
  if (path === '/api/navigation-items') {
    if (Array.isArray(json.navbar) && json.navbar.length) navigationItems.navbar = json.navbar;
    if (Array.isArray(json.sidebar) && json.sidebar.length) navigationItems.sidebar = json.sidebar;
  }
  if (Array.isArray(json.last_articles)) for (const a of json.last_articles) if (a?.id != null) articlesById.set(a.id, mergeRow(articlesById.get(a.id), a));
  if (path === '/api/all_articles' || path === '/api/latest_articles') {
    const rows = Array.isArray(json) ? json : json.data;
    if (Array.isArray(rows)) for (const a of rows) if (a?.id != null) articlesById.set(a.id, mergeRow(articlesById.get(a.id), a));
  }
  if (path.startsWith('/api/product_details/') && json.id != null && json.slug) {
    productDetailBySlug.set(json.slug, json);
  }
  if (path.startsWith('/api/page/') && json.id != null && json.slug) cmsPageBySlug.set(json.slug, json);
  if (path === '/api/pages' && Array.isArray(json.data)) for (const p of json.data) if (p?.slug) cmsPageBySlug.set(p.slug, mergeRow(cmsPageBySlug.get(p.slug), p));
}

/* Derived lookups. */
const products = [...productsById.values()];
const productBySlug = new Map(products.map((p) => [p.slug, p]));
const subcatBySlug = new Map([...subcatsById.values()].filter((s) => s?.slug).map((s) => [s.slug, s]));
const categoryById = new Map([...categoriesBySlug.values()].map((c) => [c.id, c]));
const brandNameById = new Map([...brandsById.values()].map((b) => [b.id, String(b.designation_fr ?? '')]));
/** subcategory id -> top category id, so `categories=` (aisle) filtering can resolve down. */
const catIdBySubcatId = new Map([...subcatsById.values()].map((s) => [s.id, s.categorie_id]));

/* ══════════════════════════════════════════════════════════════════════════════════════════
   3. QUERY ENGINE — ApisController::allProducts semantics, reproduced
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/** ApisController::orderAvailableFirst — the same expression the badge and the filter share. */
const isAvailable = (p) => !truthy(p.force_out_of_stock) && !truthy(p.rupture);

/**
 * `latest('created_at')` cannot be reproduced: PRODUCT_LISTING does not select created_at, so it
 * is absent from all but 4 of the 11,367 cached rows. `id` descending is the closest faithful
 * proxy on an auto-increment key. This reorders REAL rows; it never adds a field to one.
 */
const newestFirst = (a, b) => {
  const at = a.created_at ? Date.parse(a.created_at) : NaN;
  const bt = b.created_at ? Date.parse(b.created_at) : NaN;
  if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;
  return (b.id ?? 0) - (a.id ?? 0);
};

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const sortProducts = (rows, sort) => {
  const s = String(sort ?? '').toLowerCase().trim().replace(/-/g, '_');
  const cmp =
    s === 'price_asc' ? (a, b) => num(a.prix) - num(b.prix) || newestFirst(a, b)
    : s === 'price_desc' ? (a, b) => num(b.prix) - num(a.prix) || newestFirst(a, b)
    : s === 'best_sellers' ? (a, b) => (truthy(b.best_seller) ? 1 : 0) - (truthy(a.best_seller) ? 1 : 0) || newestFirst(a, b)
    : s === 'popularity' ? (a, b) => {
        const score = (p) => (truthy(p.best_seller) ? 2 : 0) + (truthy(p.new_product) ? 1 : 0);
        return score(b) - score(a) || newestFirst(a, b);
      }
    : newestFirst;
  // orderAvailableFirst is applied BEFORE the sort in SQL, which makes it the OUTER key.
  return rows.slice().sort((a, b) => (isAvailable(b) ? 1 : 0) - (isAvailable(a) ? 1 : 0) || cmp(a, b));
};

const csv = (v) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const filterProducts = (q) => {
  let rows = products;

  const search = (q.get('search') || '').trim().toLowerCase();
  if (search) {
    const brandIds = new Set([...brandNameById.entries()]
      .filter(([, name]) => name.toLowerCase().includes(search)).map(([id]) => id));
    rows = rows.filter((p) =>
      String(p.designation_fr ?? '').toLowerCase().includes(search) ||
      String(p.slug ?? '').toLowerCase().includes(search) ||
      brandIds.has(p.brand_id));
  }

  if (q.get('brand_id')) {
    const id = Number(q.get('brand_id'));
    rows = rows.filter((p) => Number(p.brand_id) === id);
  }
  const brands = csv(q.get('brands')).map(Number).filter(Number.isFinite);
  if (brands.length) { const set = new Set(brands); rows = rows.filter((p) => set.has(Number(p.brand_id))); }

  const subSlugs = csv(q.get('subcategories'));
  if (subSlugs.length) {
    const ids = new Set(subSlugs.map((s) => subcatBySlug.get(s)?.id).filter((v) => v != null));
    rows = rows.filter((p) => ids.has(p.sous_categorie_id));
  }

  const catSlugs = csv(q.get('categories'));
  if (catSlugs.length) {
    const catIds = new Set(catSlugs.map((s) => categoriesBySlug.get(s)?.id).filter((v) => v != null));
    rows = rows.filter((p) => catIds.has(catIdBySubcatId.get(p.sous_categorie_id)));
  }

  const flavors = csv(q.get('flavors'));
  if (flavors.length) {
    const set = new Set(flavors);
    rows = rows.filter((p) => Array.isArray(p.aromes) && p.aromes.some((a) => set.has(a?.designation_fr)));
  }

  if (truthy(q.get('in_stock'))) rows = rows.filter(isAvailable);
  if (q.get('min_price')) { const v = Number(q.get('min_price')); rows = rows.filter((p) => num(p.prix) >= v); }
  if (q.get('max_price')) { const v = Number(q.get('max_price')); rows = rows.filter((p) => num(p.prix) <= v); }

  return rows;
};

const resolvePerPage = (q, def = DEFAULT_PER_PAGE) => {
  let n = parseInt(q.get('per_page') ?? q.get('limit') ?? '', 10);
  if (!Number.isFinite(n) || n < 1) n = def;
  return Math.min(n, MAX_PER_PAGE);
};

/** Laravel's LengthAwarePaginator, as far as any caller here can tell. */
const paginate = (rows, page, perPage) => {
  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), lastPage);
  return {
    items: rows.slice((current - 1) * perPage, current * perPage),
    meta: { page: current, per_page: perPage, total, last_page: lastPage },
    current, lastPage, total, perPage,
  };
};

const links = (path, p) => ({
  first: `${API_BASE}${path}?page=1`,
  last: `${API_BASE}${path}?page=${p.lastPage}`,
  prev: p.current > 1 ? `${API_BASE}${path}?page=${p.current - 1}` : null,
  next: p.current < p.lastPage ? `${API_BASE}${path}?page=${p.current + 1}` : null,
});

const paginatedResponse = (path, rows, q, def = DEFAULT_PER_PAGE, dataKey = 'data') => {
  const perPage = resolvePerPage(q, def);
  const p = paginate(rows, parseInt(q.get('page') ?? '1', 10) || 1, perPage);
  return { [dataKey]: p.items, meta: p.meta, links: links(path, p) };
};

/* ── Projections ─────────────────────────────────────────────────────────────────────────── */

/**
 * `fields=index` — the sitemap's nine-field projection.
 *
 * `publier: 1` is a DERIVATION, not an invention: every cached row was returned by a query that
 * already filtered `where('publier', 1)`, so a row being in this index IS the evidence that it is
 * published. Fields genuinely absent from the listing projection (seo_robots_index, updated_at,
 * created_at on all but 4 rows) are OMITTED rather than defaulted — an absent lastmod is honest,
 * a made-up one is not.
 */
const indexProjection = (p) => {
  const out = {};
  for (const k of PRODUCT_INDEX) if (p[k] !== undefined && p[k] !== null) out[k] = p[k];
  out.publier = 1;
  return out;
};

const brandList = () => [...brandsById.values()];
const categoryList = () => [...categoriesBySlug.values()];

/* ── Home rails: real flags only, same limits as buildHomeData() ─────────────────────────── */
const railNew = () => sortProducts(products.filter((p) => truthy(p.new_product)), 'newest').slice(0, 8);
const railPacks = () => sortProducts(products.filter((p) => truthy(p.pack)), 'newest').slice(0, 4);
const railBest = () => sortProducts(products.filter((p) => truthy(p.best_seller)), 'newest').slice(0, 4);
/** whereNotNull('promo')->whereDate('promo_expiration_date','>',now) — the exact backend predicate. */
const railFlash = () => products.filter((p) => {
  if (p.promo == null || p.promo === '') return false;
  if (!p.promo_expiration_date) return false;
  const t = Date.parse(p.promo_expiration_date);
  return Number.isFinite(t) && t > Date.now();
}).slice(0, 50);
const railArticles = () => [...articlesById.values()].slice(0, 4);

const categoriesWithSubs = () => categoryList().map((c) => ({
  ...c,
  sous_categories: Array.isArray(c.sous_categories) && c.sous_categories.length
    ? c.sous_categories
    : [...subcatsById.values()].filter((s) => s.categorie_id === c.id),
}));

const buildHomeData = () => ({
  new_product: railNew(),
  packs: railPacks(),
  last_articles: railArticles(),
  ventes_flash: railFlash(),
  best_sellers: railBest(),
});

/* ── Category / subcategory envelopes ────────────────────────────────────────────────────── */

const breadcrumbFor = (parts) => [{ name: 'Accueil', url: `${FRONTEND_BASE}/` }, ...parts];

const productsOfCategory = (cat) => {
  const subIds = new Set([...subcatsById.values()].filter((s) => s.categorie_id === cat.id).map((s) => s.id));
  return sortProducts(products.filter((p) => subIds.has(p.sous_categorie_id)), 'newest');
};

const productsOfSubcat = (sub) =>
  sortProducts(products.filter((p) => p.sous_categorie_id === sub.id), 'newest');

const brandsOf = (rows) => {
  const ids = new Set(rows.map((p) => p.brand_id).filter((v) => v != null));
  return [...ids].map((id) => brandsById.get(id)).filter(Boolean);
};

const categoryEnvelope = (cat, q) => {
  const all = productsOfCategory(cat);
  const perPage = resolvePerPage(q, DEFAULT_PER_PAGE);
  const p = paginate(all, parseInt(q.get('page') ?? '1', 10) || 1, perPage);
  const subs = [...subcatsById.values()].filter((s) => s.categorie_id === cat.id);
  const sp = paginate(subs, 1, Math.max(1, subs.length || 1));
  const path = `/productsByCategoryId/${cat.slug}`;
  return {
    category: cat,
    // The SEO envelope is served ONLY when the real one was cached. A category page without it
    // falls back to withCategorySeoEntityFallbacks() on the frontend, which reads the category
    // record itself — real data either way.
    seo: seoByCategorySlug.get(cat.slug) ?? null,
    breadcrumb: breadcrumbFor([{ name: cat.designation_fr, url: `${FRONTEND_BASE}/${cat.slug}` }]),
    sous_categories: subs,
    products: p.items,
    brands: brandsOf(all),
    sous_categories_meta: sp.meta,
    sous_categories_links: links(path, sp),
    products_meta: p.meta,
    products_links: links(path, p),
  };
};

const subcategoryEnvelope = (sub, q) => {
  const all = productsOfSubcat(sub);
  const perPage = resolvePerPage(q, DEFAULT_PER_PAGE);
  const p = paginate(all, parseInt(q.get('page') ?? '1', 10) || 1, perPage);
  const cat = categoryById.get(sub.categorie_id);
  const metaOnly = truthy(q.get('meta_only'));
  return {
    sous_category: sub,
    seo: seoBySubcatSlug.get(sub.slug) ?? null,
    breadcrumb: breadcrumbFor([
      ...(cat ? [{ name: cat.designation_fr, url: `${FRONTEND_BASE}/${cat.slug}` }] : []),
      { name: sub.designation_fr, url: `${FRONTEND_BASE}/${sub.slug}` },
    ]),
    products: metaOnly ? [] : p.items,
    brands: metaOnly ? [] : brandsOf(all),
    sous_categories: [...subcatsById.values()].filter((s) => s.categorie_id === sub.categorie_id),
    products_meta: p.meta,
  };
};

/**
 * /product_details/{slug}.
 *
 * A cached FULL detail row is returned as-is. Otherwise the LISTING row is returned — every field
 * on it is real; description_fr, the gallery, reviews and nutrition are simply ABSENT, because the
 * backend was never asked for them while it was up. The PDP renders thin rather than wrong. Only
 * the two relations the frontend needs to build a canonical URL are attached, and both come from
 * the same index.
 */
const productDetail = (slug) => {
  const full = productDetailBySlug.get(slug);
  if (full) return full;
  const row = productBySlug.get(slug);
  if (!row) return null;
  const sub = subcatsById.get(row.sous_categorie_id) ?? row.sous_categorie ?? null;
  const cat = sub ? categoryById.get(sub.categorie_id) : null;
  return {
    ...row,
    brand: brandsById.get(row.brand_id) ?? null,
    sousCategorie: sub ? { ...sub, categorie: cat ? { id: cat.id, designation_fr: cat.designation_fr, slug: cat.slug } : null } : null,
    sous_categorie: sub,
  };
};

/* ── shop_facets, computed over the whole recovered catalogue ─────────────────────────────── */
const shopFacets = () => {
  const priced = products.map((p) => num(p.prix)).filter((v) => v > 0).sort((a, b) => a - b);
  const min = priced.length ? Math.floor(priced[0]) : 0;
  const max = priced.length ? Math.ceil(priced[priced.length - 1]) : 1000;
  const p99 = priced.length ? Math.ceil(priced[Math.max(0, Math.floor(priced.length * 0.99) - 1)]) : max;

  const category_counts = {};
  for (const p of products) {
    const cat = categoryById.get(catIdBySubcatId.get(p.sous_categorie_id));
    if (cat?.slug) category_counts[cat.slug] = (category_counts[cat.slug] ?? 0) + 1;
  }
  const brand_counts = {};
  for (const p of products) if (p.brand_id != null) brand_counts[p.brand_id] = (brand_counts[p.brand_id] ?? 0) + 1;

  return {
    price: { min, max, p99 },
    flavors: [...aromasByName.keys()].sort(),
    // Only brands that actually have a product here — a checkbox that can only return zero is a
    // dead end the shopper has to discover by clicking it.
    brands: [...brandsById.values()].filter((b) => brand_counts[b.id])
      .map((b) => ({ id: b.id, designation_fr: b.designation_fr ?? '', slug: b.slug ?? '' }))
      .sort((a, b) => a.designation_fr.localeCompare(b.designation_fr)),
    category_counts,
    brand_counts,
    subcategories: [...subcatsById.values()].map((s) => ({
      id: s.id, name: s.designation_fr, slug: s.slug, categoryId: s.categorie_id ?? null,
    })).sort((a, b) => String(a.name).localeCompare(String(b.name))),
    total_published: products.length,
  };
};

/* ══════════════════════════════════════════════════════════════════════════════════════════
   4. ROUTER
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/** A miss that reaches the empty payload renders an empty section rather than throwing. */
const EMPTY = {
  data: [], products: [], categories: [], brands: [], items: [], articles: [], pages: [],
  total: 0, current_page: 1, last_page: 1, per_page: 0, meta: { total: 0 }, links: {},
};

const misses = new Set();
const seg = (path, prefix) => decodeURIComponent(path.slice(prefix.length));

function synthesise(path, q) {
  switch (path) {
    case '/api/accueil': {
      const cats = categoriesWithSubs();
      const p = paginate(cats, 1, Math.max(1, cats.length || 1));
      return { ...buildHomeData(), categories: p.items, categories_meta: p.meta, categories_links: links('/categories', p) };
    }
    case '/api/home': return buildHomeData();
    case '/api/latest_products': {
      const h = buildHomeData();
      return { new_product: h.new_product, packs: h.packs, best_sellers: h.best_sellers };
    }
    case '/api/new_product': return railNew();
    case '/api/best_sellers': return railBest();
    case '/api/latest_packs': return railPacks();
    case '/api/packs': return paginatedResponse('/packs', products.filter((p) => truthy(p.pack)), q);
    case '/api/ventes_flash': return paginatedResponse('/ventes_flash', railFlash(), q);
    case '/api/categories': return paginatedResponse('/categories', categoriesWithSubs(), q);
    case '/api/slides': return paginatedResponse('/slides', [...slidesById.values()], q);
    case '/api/navigation-items': return navigationItems;
    case '/api/all_brands': return paginatedResponse('/all_brands', brandList(), q);
    case '/api/aromes': return paginatedResponse('/aromes', [...aromasByName.values()], q);
    case '/api/tags': return paginatedResponse('/tags', [...tagsById.values()], q);
    case '/api/pages': return paginatedResponse('/pages', [...cmsPageBySlug.values()], q);
    case '/api/shop_facets': return shopFacets();
    case '/api/all_articles':
    case '/api/latest_articles': return paginatedResponse('/all_articles', [...articlesById.values()], q);

    case '/api/all_products':
    case '/api/all_products_fast': {
      const indexOnly = q.get('fields') === 'index';
      const light = indexOnly || truthy(q.get('light'));
      const rows = sortProducts(filterProducts(q), q.get('sort'));
      const perPage = indexOnly
        ? Math.min(Math.max(1, parseInt(q.get('per_page') ?? '500', 10) || 500), 500)
        : resolvePerPage(q, 24);
      const p = paginate(rows, parseInt(q.get('page') ?? '1', 10) || 1, perPage);
      return {
        products: indexOnly ? p.items.map(indexProjection) : p.items,
        brands: light ? [] : brandList(),
        categories: light ? [] : categoryList(),
        pagination: {
          page: p.current, current_page: p.current, per_page: p.perPage,
          total: p.total, last_page: p.lastPage,
        },
      };
    }
  }

  if (path.startsWith('/api/productsByCategoryId/')) {
    const cat = categoriesBySlug.get(seg(path, '/api/productsByCategoryId/'));
    return cat ? categoryEnvelope(cat, q) : { __status: 404, error: 'Catégorie introuvable' };
  }
  if (path.startsWith('/api/productsBySubCategoryId/')) {
    const sub = subcatBySlug.get(seg(path, '/api/productsBySubCategoryId/'));
    return sub ? subcategoryEnvelope(sub, q) : { __status: 404, error: 'Sous-catégorie introuvable' };
  }
  if (path.startsWith('/api/product_details/')) {
    const d = productDetail(seg(path, '/api/product_details/'));
    return d ?? { __status: 404, error: 'Produit introuvable' };
  }
  if (path.startsWith('/api/similar_products/')) {
    const id = Number(seg(path, '/api/similar_products/'));
    const sub = subcatsById.get(id);
    if (!sub) return { products: [] };
    const ok = (p) => isAvailable(p) && num(p.qte) > 0 && !truthy(p.pack) &&
      !String(p.designation_fr ?? '').startsWith('PACK ');
    let rows = products.filter((p) => p.sous_categorie_id === sub.id && ok(p)).sort((a, b) => a.id - b.id).slice(0, 6);
    if (rows.length < 6) {
      const seen = new Set(rows.map((p) => p.id));
      const extra = products.filter((p) => !seen.has(p.id) && ok(p) &&
        catIdBySubcatId.get(p.sous_categorie_id) === sub.categorie_id)
        .sort((a, b) => a.id - b.id).slice(0, 6 - rows.length);
      rows = rows.concat(extra);
    }
    return { products: rows };
  }
  if (path.startsWith('/api/productsByBrandId/')) {
    const id = Number(seg(path, '/api/productsByBrandId/'));
    if (!brandsById.has(id)) return { __status: 404, error: 'Brand not found' };
    const rows = sortProducts(products.filter((p) => Number(p.brand_id) === id), 'newest');
    const perPage = resolvePerPage(q);
    const p = paginate(rows, parseInt(q.get('page') ?? '1', 10) || 1, perPage);
    return { brand: brandsById.get(id), products: p.items, products_meta: p.meta, brands: [brandsById.get(id)] };
  }
  if (path.startsWith('/api/searchProduct/')) {
    const text = seg(path, '/api/searchProduct/').toLowerCase();
    const brandIds = new Set([...brandNameById.entries()].filter(([, n]) => n.toLowerCase().includes(text)).map(([i]) => i));
    const rows = products.filter((p) =>
      String(p.designation_fr ?? '').toLowerCase().includes(text) ||
      String(p.slug ?? '').toLowerCase().includes(text) || brandIds.has(p.brand_id)).slice(0, 50);
    return { products: rows, brands: brandsOf(rows) };
  }
  if (path.startsWith('/api/searchProductBySubCategoryText/')) {
    const [slug, ...rest] = seg(path, '/api/searchProductBySubCategoryText/').split('/');
    const text = decodeURIComponent(rest.join('/')).toLowerCase();
    const sub = subcatBySlug.get(slug);
    if (!sub) return { products: [], brands: [] };
    const rows = products.filter((p) => p.sous_categorie_id === sub.id &&
      String(p.designation_fr ?? '').toLowerCase().includes(text)).slice(0, 50);
    return { products: rows, brands: brandsOf(rows) };
  }
  if (path.startsWith('/api/page/')) {
    const p = cmsPageBySlug.get(seg(path, '/api/page/'));
    return p ?? { __status: 404, error: 'Page introuvable' };
  }

  /* Endpoints with nothing behind them in this corpus. A valid empty payload, never a stub row. */
  if (path === '/api/faqs' || path === '/api/services' || path === '/api/redirections' ||
      path === '/api/blog_categories' || path === '/api/blog_tags' || path === '/api/media') {
    return paginatedResponse(path.replace('/api', ''), [], q);
  }

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   4b. THE /storage SHIM
   ══════════════════════════════════════════════════════════════════════════════════════════

   Covers come in two shapes. 11,048 of the 11,367 are ABSOLUTE cloudinary URLs (the iHerb
   import) and load straight from the internet — nothing to do. The other 319 are paths on the
   Laravel public disk ("produits/xxxx.webp"), which lives on the dead VPS.

   Those 319 are the ones that matter most: all 145 shippable products are in that set. Left
   pointing at admin.protein.tn they do not merely fail — they hang for ~20s each, through
   next/image, which makes the local site feel broken in a way the data is not.

   `filament/storage2/app/public/` is a local mirror of that disk and holds 214 of the 319
   (65 of the 145 in stock). So: serve the real file when it exists, and answer an immediate 404
   when it does not. A fast 404 renders the alt text; a 20s stall renders nothing and blocks a
   connection. NO PLACEHOLDER IMAGE IS SUBSTITUTED — a stand-in photo on a product card is
   exactly the kind of invention this tool refuses to make.

   Opt-in: it only takes effect if STORAGE_BACKEND_URL / NEXT_PUBLIC_STORAGE_URL point here.  */

const MIME = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
};

/** basename -> absolute path, so a file that moved between dated upload folders is still found. */
const storageByName = new Map();
let storageFiles = 0;
if (existsSync(STORAGE_ROOT)) {
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else { storageFiles += 1; if (!storageByName.has(e.name)) storageByName.set(e.name, p); }
    }
  })(STORAGE_ROOT);
}

const serveStorage = (rel, res) => {
  // Path traversal guard: the request must resolve INSIDE the root.
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, '');
  let file = join(STORAGE_ROOT, safe);
  if (!normalize(file).startsWith(normalize(STORAGE_ROOT) + sep)) file = '';
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    file = storageByName.get(basename(safe)) ?? '';
  }
  if (!file || !existsSync(file)) {
    // Immediately, deliberately. See the note above.
    res.writeHead(404, { 'content-type': 'text/plain', 'x-replay': 'storage-miss' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'public, max-age=3600',
    'x-replay': 'storage-hit',
  });
  createReadStream(file).pipe(res);
};

/* ══════════════════════════════════════════════════════════════════════════════════════════
   5. SERVE
   ══════════════════════════════════════════════════════════════════════════════════════════ */

const server = createServer((req, res) => {
  const raw = req.url || '/';
  let url;
  try { url = new URL(raw, 'http://localhost'); } catch { url = new URL('/', 'http://localhost'); }
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const q = url.searchParams;

  // A tiny liveness probe, so "is the thing on :4000 actually MINE?" has a real answer rather
  // than a 200 from whatever else happened to bind the port first.
  if (path === '/__offline-replay') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      server: 'offline-api-replay', pid: process.pid, port: PORT,
      replayed: routes.size, products: products.length, brands: brandsById.size,
      categories: categoriesBySlug.size, subcategories: subcatsById.size,
      storageFiles,
    }));
    return;
  }

  // 0. Images off the Laravel public disk. Also accepts /storage-proxy/*, the rewrite the
  //    production frontend keeps for backward compatibility.
  const storagePrefix = ['/storage/', '/storage-proxy/'].find((p) => path.startsWith(p));
  if (storagePrefix) { serveStorage(path.slice(storagePrefix.length), res); return; }

  // 1. Byte-identical replay.
  const hit = routes.get(url.pathname + url.search) ?? routes.get(path + url.search) ?? routes.get(path);
  if (hit) {
    res.writeHead(hit.status, { 'content-type': hit.contentType, 'x-replay': 'hit' });
    res.end(hit.body);
    return;
  }

  // 2. Synthesis from the index.
  let payload = null;
  try { payload = synthesise(path, q); } catch (err) {
    if (!QUIET) console.error(`  error ${path}: ${err?.message}`);
  }
  if (payload !== null && payload !== undefined) {
    const status = payload.__status ?? 200;
    if (payload.__status) delete payload.__status;
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'x-replay': status === 404 ? 'synth-404' : 'synth' });
    res.end(JSON.stringify(payload));
    return;
  }

  // 3. Nothing behind it. Empty but valid, immediately — a page that renders with an empty rail
  //    beats one that never renders, and a fabricated row beats neither.
  if (!misses.has(path) && !QUIET) { misses.add(path); console.log(`  miss  ${path}`); }
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'x-replay': 'miss' });
  res.end(JSON.stringify(EMPTY));
});

server.on('error', (err) => {
  // EADDRINUSE must be loud and fatal. A silent failure here leaves the PREVIOUS process serving
  // :4000, and every later "it returns 200" measurement is then about somebody else's server.
  console.error(`offline-api-replay: FAILED to bind :${PORT} — ${err.code}: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`offline-api-replay: ${files} cached file(s) -> ${routes.size} replayable response(s)`);
  console.log(`  index: ${products.length} products, ${brandsById.size} brands, ` +
    `${categoriesBySlug.size} categories, ${subcatsById.size} subcategories, ` +
    `${productDetailBySlug.size} full product details, ${slidesById.size} slides`);
  console.log(`  storage: ${storageFiles} local file(s) from ${STORAGE_ROOT}` +
    (storageFiles ? '' : '  (NOT FOUND — /storage will 404 fast rather than hang)'));
  console.log(`  rails: new=${railNew().length} best_sellers=${railBest().length} packs=${railPacks().length} flash=${railFlash().length}`);
  // The readiness line. Grep for THIS, not for a status code.
  console.log(`offline-api-replay READY pid=${process.pid} listening on http://0.0.0.0:${PORT}`);
});
