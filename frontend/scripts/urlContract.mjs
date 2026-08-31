/**
 * THE URL CONTRACT — one registry, two enforcers.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────────
 * Search Console reports SYMPTOMS grouped into buckets ("Crawled - currently not indexed": 860,
 * "Duplicate without user-selected canonical": 31) and never names a cause. Worse, the buckets
 * feed each other: a 404 that gets a redirect stops being a 404 and becomes "Page with redirect";
 * a soft 404 is not in the 404 bucket at all, it sits in "Crawled - currently not indexed"
 * forever. Rounds of fixing can move URLs between buckets indefinitely without one page entering
 * the index.
 *
 * Every one of those buckets is downstream of a small set of INVARIANTS that a route either holds
 * or breaks. This file states the invariants, per route, as data. Two scripts read it:
 *
 *   scripts/check-url-contract.mjs      static, runs in `prebuild`, no network. Fails the BUILD.
 *   scripts/check-indexability-live.mjs live, runs against a built server or production.
 *
 * ── THE RULE THAT MATTERS MOST ────────────────────────────────────────────────────────────────
 * Adding a dynamic route without adding it here FAILS THE BUILD. That is the point. Every defect
 * this registry was written from was invisible to normal browsing and to every existing check:
 *
 *   MEASURED ON PRODUCTION, 18/08/2026
 *   /blog/{any-invented-slug}            HTTP 200, cached s-maxage=600 + swr 365 days
 *   /blog/tag/{anything}                 HTTP 200, no canonical, robots flips per request
 *   /blog/category/{anything}            HTTP 200, no canonical, robots flips per request
 *   /shop/{cat}/{any-invented-slug}      HTTP 200, robots "index, follow", homepage <title>
 *   /shop/{any}/reviews                  HTTP 200
 *
 * Five unbounded families of HTTP 200 pages that say "not found". Google calls that a soft 404:
 * the URL is never dropped, never indexed, and re-crawled forever. None of them was catchable by
 * a check that only asks whether the site is up.
 */

/**
 * A destination that answers 200 but tells the visitor nothing about the URL they asked for.
 * Google documents "redirects to an irrelevant page" as a soft 404 — the hop is spent and the URL
 * moves from one non-indexed bucket to another. Landing here is the difference between "retired"
 * and "retired honestly".
 */
export const HUBS = new Set([
  '/', '/shop', '/blog', '/brands', '/marques', '/categories', '/packs', '/offres',
]);

/** Statuses that genuinely retire a URL. Everything else leaves it in the crawl queue. */
export const TERMINAL = new Set([404, 410]);

/**
 * Prefixes that are MACHINE endpoints, not pages. Each must be BOTH robots.txt-disallowed and
 * served with `X-Robots-Tag: noindex` — belt and braces, because the two fail differently:
 * robots.txt stops the crawl but cannot remove a URL already indexed from a link, and the header
 * removes it but only if the crawl is allowed. A path that is only disallowed is exactly how a
 * URL lands in "Indexed, though blocked by robots.txt".
 */
export const MACHINE_PREFIXES = ['/api/', '/api-proxy/', '/x-crawler/'];

/*
 * A NOTE ON /x-crawler, BECAUSE THE OBVIOUS FIX IS A TRAP.
 *
 * Requested directly it answers 200 and is indexable, and robots.txt is therefore the only thing
 * keeping it out. Refusing it in middleware was implemented and measured, and it answered
 * Googlebot 404 for /whey-proteine, /shop and every product page — the rewrite re-entered
 * middleware on a cold cache. The Disallow stays; L6 reports the direct-access 200 as an advisory
 * rather than a failure, so nobody "fixes" it again without reading middleware.ts first.
 */

/**
 * Every dynamic route in src/app, and what it OWES a request it cannot serve.
 *
 * `missing` is the whole point: the set of statuses allowed when the dynamic segment names
 * something that does not exist. A route whose answer is 200 mints an unbounded family of
 * near-duplicate pages, which is the single most expensive shape in this entire report.
 *
 *   route      path under src/app, route groups included, exactly as the scanner finds it.
 *   probe      a path whose dynamic segment CANNOT exist. `{n}` is replaced with a nonce so the
 *              measurement is of the origin, never of a CDN entry a previous run created.
 *   missing    allowed status codes for that probe.
 *   indexable  whether a VALID url on this route is meant to be in the index. Drives the
 *              canonical + robots assertions, and the "must not be noindex" assertion.
 *   sample     a URL known to exist, used for the positive assertions. null = no positive check
 *              (private/auth routes).
 *   why        the measured reason this entry says what it says. Not decoration: the next person
 *              to relax one of these needs to know what it cost to learn.
 */
export const ROUTE_CONTRACT = [
  {
    route: '(shop)/[slug]',
    probe: '/zz-no-such-listing-{n}',
    missing: [404, 410],
    indexable: true,
    sample: '/whey-proteine',
    why: 'Category/brand/CMS-page namespace. Correct today — the reference behaviour for the rest.',
  },
  {
    route: '(shop)/[slug]/[productSlug]',
    probe: '/whey-proteine/zz-no-such-product-{n}',
    missing: [404, 410],
    indexable: true,
    sample: '/whey-proteine/100-whey-gold-standard-2-27kg',
    why: 'The primary indexable surface. Resolves legacy -N slugs before giving up; see util/retiredSlug.ts.',
  },
  {
    route: '(shop)/blog/[slug]',
    probe: '/blog/zz-no-such-article-{n}',
    missing: [404, 410],
    indexable: true,
    sample: '/blog/whey-protein-en-tunisie',
    why:
      'Was HTTP 200 + x-nextjs-prerender:1 + `s-maxage=600, stale-while-revalidate=31535400`. A soft ' +
      '404 cached for a YEAR, over an unbounded slug space.',
  },
  {
    route: '(shop)/blog/category/[slug]',
    probe: '/blog/category/zz-{n}',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why:
      'The CMS returns [] for /blog_categories — the feature has no data at all. Every URL under ' +
      'this prefix was a 200 with no rel=canonical and a robots value that changed between two ' +
      'fetches of the same URL.',
  },
  {
    route: '(shop)/blog/tag/[slug]',
    probe: '/blog/tag/zz-{n}',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why: 'Same as blog/category: /blog_tags returns []. Indexable only on an explicit per-tag opt-in that no tag can set, because no tag exists.',
  },
  {
    route: '(shop)/brand/[slug]',
    probe: '/brand/zz-no-such-brand-{n}',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why:
      'A LEGACY namespace, not an indexable one: a valid brand 301s to its bare slug (/brand/Optimum' +
      '%20Nutrition -> /optimum-nutrition), which is where the brand is actually served and indexed. ' +
      'An invalid one 410s. Nothing on this route is meant to answer 200, so there is no sample.',
  },
  {
    route: '(shop)/category/[slug]',
    probe: '/category/zz-{n}',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why: 'Legacy duplicate of /{slug}. A valid slug 301s to the bare form; an invalid one must not redirect at all.',
  },
  {
    route: '(shop)/product/[slug]',
    probe: '/product/zz-{n}',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why: 'Legacy duplicate of /{category}/{product}. Correct today: 410.',
  },
  {
    route: '(shop)/products/[id]',
    probe: '/products/99999999',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why: 'Numeric-id legacy route. Correct today: 410.',
  },
  {
    route: '(shop)/products/[id]/reviews',
    probe: '/products/99999999/reviews',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why: 'Correct today: 410.',
  },
  {
    route: '(shop)/shop/[slug]',
    probe: '/shop/zz-{n}',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why: 'Legacy /shop/* namespace, 338 of which still carry impressions. Correct today: 410.',
  },
  {
    route: '(shop)/shop/[slug]/[subcategory]',
    probe: '/shop/whey-proteine/zz-{n}',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why:
      'Was HTTP 200 with `robots: index, follow`, NO rel=canonical, and the HOMEPAGE <title>. An ' +
      'indexable unbounded duplicate — the exact shape of "Duplicate without user-selected canonical".',
  },
  {
    route: '(shop)/shop/[slug]/reviews',
    probe: '/shop/zz-{n}/reviews',
    missing: [404, 410],
    indexable: false,
    sample: null,
    why: 'Was HTTP 200 for a category slug that does not exist.',
  },
  {
    route: '(shop)/page/[slug]',
    probe: '/page/zz-{n}',
    missing: [404, 410, 301],
    indexable: false,
    sample: null,
    why:
      'DELIBERATE EXCEPTION. /page/:slug 301s to /{slug}. The redirect stays because it was built ' +
      'from real Search Console data ' +
      '— /page/creatine-monohydrate-tunisie carried 698 impressions at position 9.58, ' +
      '/page/proteine-tunisie 205 — and those URLs must reach their live page. Making the rule ' +
      'conditional would need a per-request CMS lookup in middleware. Known invalid forms such as ' +
      '/page/undefined and deeper junk are intercepted with 410 before this mapping.',
  },
  {
    route: '(shop)/avis/[token]',
    probe: '/avis/zz-{n}',
    missing: [200, 404, 410],
    // DOCUMENTED EXCEPTION to "never 200 for input you cannot serve", and the only one.
    // The token space is a per-order secret: unguessable, never linked, never in the sitemap, and
    // the page is noindex,nofollow. So there is no crawl to waste and nothing to duplicate. L1
    // still asserts the noindex on every run, so it cannot quietly become indexable.
    noindex200Ok: true,
    indexable: false,
    sample: null,
    why:
      'Per-order review token, noindex. `avis` had to be added to isReservedRouteSlug: without it, ' +
      'middleware rewrote /avis/{token} to /x-crawler/product/avis/{token} and Googlebot got 404 ' +
      'where a human got 200. Found by L2, missed by check-reserved-routes.mjs because avis/ holds ' +
      'no page of its own — that check now looks for nested pages too.',
  },
  {
    route: '(shop)/order-confirmation/[id]',
    probe: null,
    missing: null,
    indexable: false,
    sample: null,
    why: 'Per-order, auth-guarded, robots.txt-disallowed AND noindex. No public contract to probe.',
  },
  {
    route: '(shop)/membres/[id]',
    probe: '/membres/99999{n}',
    missing: [404],
    indexable: false,
    sample: null,
    why:
      'Public member profile, noindex + follow. The FIRST version rendered a "profil introuvable" ' +
      'panel client-side, which is an HTTP 200 — this check failed the build over it, and was ' +
      'right to: /membres/{anything} answering 200 mints an unbounded family of near-identical ' +
      'pages, and noindex does not help because a crawler still has to fetch each one to learn ' +
      'that. The page now resolves the profile server-side and calls notFound(). The API also ' +
      '404s any member with no PUBLISHED review, so most ids are genuine misses.',
  },
  {
    route: '(shop)/account/orders/[id]',
    probe: null,
    missing: null,
    indexable: false,
    sample: null,
    why: 'Auth-guarded, noindex,nofollow. No public contract to probe.',
  },
  {
    route: 'x-crawler/category/[slug]',
    probe: null,
    missing: null,
    indexable: false,
    sample: null,
    why:
      'INTERNAL rewrite target. Middleware sends crawler UAs here for /{slug}; the rewrite is ' +
      'invisible, so the response is judged as /{slug} and is deliberately indexable THERE. Reached ' +
      'directly it must not be — enforced by MACHINE_PREFIXES, not by a missing-slug probe.',
  },
  {
    route: 'x-crawler/product/[...slug]',
    probe: null,
    missing: null,
    indexable: false,
    sample: null,
    why: 'Internal rewrite target for /{category}/{product}. Same reasoning as x-crawler/category.',
  },
  {
    route: 'sitemaps/[file]',
    probe: '/sitemaps/zz-{n}.xml',
    missing: [404],
    indexable: false,
    sample: '/sitemaps/static.xml',
    why:
      'Names resolve from the manifest, never from the request, so a crawler probing ' +
      '/sitemaps/anything.xml cannot mint an infinite family of empty indexable sitemaps.',
  },
];

/**
 * Single-segment paths that must answer 200 and be self-canonical. These are the routes middleware
 * must NOT mistake for a category slug — check-reserved-routes.mjs already guards the list itself;
 * this guards that they still resolve.
 */
export const STATIC_PAGES = [
  '/', '/shop', '/blog', '/brands', '/packs', '/offres', '/pack-builder',
  '/partenaires', '/proteine-sousse', '/qui-sommes-nous', '/mentions-legales', '/faqs', '/contact',
];

/** 200 + noindex, and NOT robots.txt-disallowed — Google must be able to crawl to see the noindex. */
export const NOINDEX_PAGES = ['/cart', '/checkout', '/account', '/favoris', '/login', '/register'];

/**
 * URL shapes that must normalise to one canonical form in at most ONE hop.
 * `{p}` is replaced with a path known to be 200.
 */
export const NORMALISATIONS = [
  { from: 'http://protein.tn{p}', to: 'https://protein.tn{p}', maxHops: 1 },
  { from: 'https://www.protein.tn{p}', to: 'https://protein.tn{p}', maxHops: 1 },
  { from: 'https://protein.tn{p}/', to: 'https://protein.tn{p}', maxHops: 1 },
  { from: 'https://protein.tn{P}', to: 'https://protein.tn{p}', maxHops: 1 }, // {P} = uppercased path
];

/**
 * Dead URL classes inherited from the WordPress era plus scanner probes. Each must be TERMINAL.
 *
 * `.php` is here because every *.php path on this origin answered HTTP 500 (measured 18/08/2026:
 * /foo.php, /index.php, /config.php, /admin.php all 500; /foo.bar, /foo.html, /foo.aspx all 404).
 * A 500 is the worst possible answer for a URL that should be retired — Google retries it.
 */
export const MUST_BE_TERMINAL = [
  '/wp-login.php', '/wp-admin', '/wp-json', '/feed', '/trackback',
  '/2023/01', '/tag/whey', '/author/admin', '/xmlrpc.php',
  '/foo.php', '/index.php', '/.env', '/page/undefined', '/cart-2', '/checkout-2',
  '/products/amino-target-xplode-275-g',
  '/pre-workout/king-real-preworkout-500gr-real-pharm',
  '/cardio-fitness/ring-de-boxe',
];

/** Replace the {n} nonce so a probe measures the origin rather than a CDN entry a prior run made. */
export function withNonce(probe, nonce) {
  return probe ? probe.replaceAll('{n}', String(nonce)) : probe;
}
