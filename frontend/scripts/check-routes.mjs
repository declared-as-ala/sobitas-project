/**
 * ONE LIVE URL OF EVERY ROUTE TYPE MUST ANSWER 200. THAT IS THE WHOLE CHECK.
 *
 * ── THE FAILURE THAT PAID FOR THIS ────────────────────────────────────────────────────────────
 * On 13/08/2026 a commit added a product-only eager load to `articleDetails`, an Article has no such
 * relation, and Eloquent turned that into a 500. Every one of the 224 article URLs served 500 for a
 * day. Nothing noticed, and the reasons are worth stating because they are the design of this file:
 *
 *   · the BUILD passed — the bug is a runtime relation lookup, invisible to typecheck and to `next
 *     build`, and the backend is PHP so the frontend build never touched it at all;
 *   · `/blog` and `/blog/category/{slug}` both stayed 200, because they run through a different
 *     controller method. The blog looked alive from outside while every article inside it was down;
 *   · the post-deploy smoke test walked the availability schema, the card hover endpoints and the
 *     shop redirect loop — three checks, all of them about products, none of which fetches an
 *     article;
 *   · and `check-sitemap-routes.mjs` validates that sitemap URLs RESOLVE to a route, which is a
 *     question about the router, not about whether the page renders.
 *
 * Every existing check was a deep check of one surface. What was missing was a shallow check of all
 * of them. This is that: it does not care what a page contains, only that asking for it does not
 * fail. A page that 500s cannot be thin, cannot be miscanonicalised and cannot rank — it is the
 * failure that makes every other audit moot, so it is the one that runs first and cheapest.
 *
 * ── WHY THE URLs ARE DISCOVERED, NOT LISTED ───────────────────────────────────────────────────
 * A hardcoded list of slugs rots: the product gets unpublished, the check starts failing for a
 * reason that is not a bug, somebody adds `|| true`, and the guard is dead. Every dynamic route
 * below picks its subject from the live API at run time, so it always tests something that is
 * genuinely published right now.
 *
 * Redirects are followed and the FINAL status is what is asserted, because a 301 to a 200 is a
 * working page and a 301 to a 500 is not.
 *
 *   node scripts/check-routes.mjs
 *   BASE_URL=http://localhost:3000 node scripts/check-routes.mjs
 */
const BASE = (process.env.BASE_URL || 'https://protein.tn').replace(/\/$/, '');
const API = (process.env.API_BASE || 'https://admin.protein.tn').replace(/\/$/, '');

const j = async (path) => {
  const res = await fetch(`${API}/api${path}`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
};

/** Resolve one live slug per dynamic route type. A route we cannot pick a subject for is reported. */
const discover = async () => {
  const out = {};
  const tries = [
    ['product', async () => {
      // Deliberately an INDEXABLE product: those are the ones in the sitemap, so a 500 there is the
      // most expensive kind. The noindexed population is covered by `product-noindex` below.
      const r = await j('/all_products?fields=index&per_page=200&page=1');
      const p = (r.products ?? []).find((x) => x.slug && x.sous_categorie?.slug && x.seo_robots_index !== false);
      return p && `/${p.sous_categorie.slug}/${p.slug}`;
    }],
    ['product-noindex', async () => {
      const r = await j('/all_products?fields=index&per_page=200&page=12');
      const p = (r.products ?? []).find((x) => x.slug && x.sous_categorie?.slug && x.seo_robots_index === false);
      return p && `/${p.sous_categorie.slug}/${p.slug}`;
    }],
    ['category', async () => {
      const c = await j('/categories?per_page=6');
      const rows = Array.isArray(c) ? c : (c.data ?? c.categories ?? []);
      return rows[0]?.slug && `/${rows[0].slug}`;
    }],
    ['subcategory', async () => {
      const c = await j('/categories?per_page=6');
      const rows = Array.isArray(c) ? c : (c.data ?? c.categories ?? []);
      for (const cat of rows) {
        const sub = (cat.sous_categories ?? [])[0];
        if (sub?.slug) return `/${sub.slug}`;
      }
      return null;
    }],
    // The route that was down. 38% of the site's impressions live behind it.
    ['article', async () => {
      const r = await j('/all_articles?per_page=5');
      const a = (r.articles ?? r.data ?? [])[0];
      return a?.slug && `/blog/${a.slug}`;
    }],
    ['blog-category', async () => {
      const r = await j('/blog_categories');
      const rows = Array.isArray(r) ? r : (r.data ?? []);
      return rows[0]?.slug && `/blog/category/${rows[0].slug}`;
    }],
    ['blog-tag', async () => {
      const r = await j('/blog_tags');
      const rows = Array.isArray(r) ? r : (r.data ?? []);
      return rows[0]?.slug && `/blog/tag/${rows[0].slug}`;
    }],
  ];

  for (const [name, fn] of tries) {
    try {
      const path = await fn();
      if (path) out[name] = path;
      else out[name] = { error: 'no live subject found' };
    } catch (e) {
      out[name] = { error: e.message };
    }
  }
  return out;
};

const STATIC = {
  home: '/',
  shop: '/shop',
  'shop-paged': '/shop?page=2',
  'shop-faceted': '/shop?brand=72',
  packs: '/packs',
  offres: '/offres',
  brands: '/brands',
  blog: '/blog',
  partenaires: '/partenaires',
  contact: '/contact',
  faqs: '/faqs',
  'qui-sommes-nous': '/qui-sommes-nous',
  'pack-builder': '/pack-builder',
  'proteine-sousse': '/proteine-sousse',
  sitemap: '/sitemap.xml',
  robots: '/robots.txt',
};

const dynamic = await discover();
const routes = { ...STATIC };
const undiscovered = [];
for (const [name, v] of Object.entries(dynamic)) {
  if (typeof v === 'string') routes[name] = v;
  else undiscovered.push(`${name}: ${v.error}`);
}

console.log(`Checking ${Object.keys(routes).length} route types on ${BASE}\n`);

const failures = [];
const pad = (s, n) => String(s).padEnd(n);

for (const [name, path] of Object.entries(routes)) {
  let status = 0;
  let note = '';
  try {
    // redirect: 'follow' is the default and is what we want — assert the END of the chain.
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(60_000) });
    status = res.status;
    if (res.url && res.url !== `${BASE}${path}`) note = `-> ${res.url.replace(BASE, '')}`;
  } catch (e) {
    note = e.message;
  }
  const ok = status === 200;
  if (!ok) failures.push(`${name}  ${path}  ${status || 'ERR'}  ${note}`);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${pad(name, 18)} ${pad(status || 'ERR', 6)} ${pad(path, 42)} ${note}`);
  // The origin's php-fpm pool ran out under ~40 concurrent requests on 12/08/2026. A guard must not
  // be the thing that repeats that, so this walks serially with a pause.
  await new Promise((r) => setTimeout(r, 120));
}

if (undiscovered.length) {
  console.log('\nCould not pick a live subject for:');
  for (const u of undiscovered) console.log(`  · ${u}`);
}

if (failures.length) {
  console.log(`\n${failures.length} ROUTE TYPE(S) ARE DOWN:`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log('\nA route type that does not answer 200 serves that status to every URL of its shape.');
  console.log('Multiply by the population: one broken product route is ~10,669 URLs, one broken');
  console.log('article route is 224 — including the best-ranking page on the site.');
  process.exit(1);
}

console.log(`\nAll ${Object.keys(routes).length} route types answer 200.`);
