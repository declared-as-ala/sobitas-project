import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isCrawlerUA, CRAWLER_PREVIEW_PARAM } from '@/util/isCrawler';
import { isReservedRouteSlug } from '@/util/productUrl';
import { getAdminRedirect } from '@/util/adminRedirects';
import { brandSlugRedirectTarget } from '@/util/brandSlug';
import { isTaxonomySlug, bestCategoryForSlug, isBrandSlug } from '@/util/taxonomySlugs';
import { isArticleSlug } from '@/util/blogSlugs';

/**
 * Open-redirect guard. A path derived from user input — e.g. `/en//evil.com` or `/en/\evil.com`
 * — resolves to an OFF-ORIGIN destination when fed to `new URL(path, request.url)` (protocol-
 * relative and backslash forms both hijack the origin), turning a redirect into a cacheable
 * 301 open redirect. If the built destination leaves our origin, discard it and fall back to a
 * safe same-origin path (the homepage). Fixed internal paths (/shop, /{seg}) stay untouched.
 */
function sameOriginOrHome(url: URL, request: NextRequest): URL {
  if (url.origin !== request.nextUrl.origin) {
    return new URL('/', request.url);
  }
  return url;
}

/**
 * For ADMIN-configured redirects (trusted input set in Filament → Redirections): allow
 * same-origin AND any *.protein.tn subdomain (a legitimate cross-subdomain redirect, e.g.
 * → admin.protein.tn), but still discard an arbitrary off-site host as defense-in-depth.
 */
function sameOriginOrTrusted(url: URL, request: NextRequest): URL {
  const host = url.hostname.toLowerCase();
  if (url.origin === request.nextUrl.origin || host === 'protein.tn' || host.endsWith('.protein.tn')) {
    return url;
  }
  return new URL('/', request.url);
}

function redirectPreservingQuery(request: NextRequest, path: string): NextResponse {
  const url = sameOriginOrHome(new URL(path, request.url), request);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return NextResponse.redirect(url, 301);
}

/**
 * Slugify a brand/category name the same way the app's nameToSlug does, so legacy URLs
 * like /brand/BIOTECH USA/6 or /brand/OSTROVIT resolve to the real page (/biotech-usa,
 * /ostrovit). Lowercases, strips accents, and collapses non-alphanumerics to hyphens.
 */
function slugifyName(name: string): string {
  let decoded = name;
  try { decoded = decodeURIComponent(name); } catch { /* keep raw */ }
  return decoded
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

const API_BASE =
  process.env.API_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace('/api-proxy', '') ||
  'https://admin.protein.tn/api';

/** Look a product up by slug. Returns its canonical path, `false` for a clean 404, null on error. */
async function lookupProduct(slug: string): Promise<string | null | false> {
  try {
    const res = await fetch(`${API_BASE}/product_details/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(1500),
    });
    if (res.status === 404) return false;
    if (!res.ok) return null;
    const product = await res.json();
    const subSlug: string | undefined =
      product?.sous_categorie?.slug ||
      product?.sousCategorie?.slug ||
      product?.sous_categorie_slug;
    return subSlug ? `/${subSlug}/${slug}` : null;
  } catch {
    return null;
  }
}

/**
 * Resolve /shop/:slug → /{subcat}/{slug} or /{slug}. Returns null to fall through to the page.
 *
 * LEGACY NUMERIC SUFFIX (the biggest single source of GSC "Not found (404)").
 * The old site emitted hundreds of URLs with an index appended to the slug —
 * /shop/xtend-bcaa-420g-0, /creatine/creatine-real-pharm-300g-11, /musculation/leg-press-machine-46.
 * The previous code answered a product-API 404 by unconditionally redirecting to `/{slug}`, which
 * turned every one of those into a 301 **into a 404** — strictly worse than a plain 404, because
 * Google follows the hop and still finds nothing, and the redirect is cacheable.
 *
 * Order matters and is deliberate: the FULL slug is always tried first, so real slugs that simply
 * end in a number (omega-3, bcaa-8-1-1-400g-real-pharm, iso-100-dymatize-2-3kg) resolve normally
 * and are never stripped. Only when the full slug is genuinely unknown do we retry without the
 * trailing `-N`, which lands the legacy URL on the real product in ONE hop.
 */
type ShopResolution =
  | { kind: 'redirect'; to: string }
  /** Definitively not a product and not a category. The caller decides 301-to-category or 410. */
  | { kind: 'gone'; slug: string }
  /** Could not find out — backend unhealthy. Fall through to the page and never guess. */
  | { kind: 'unknown' };

async function resolveShopSlug(slug: string): Promise<ShopResolution> {
  const direct = await lookupProduct(slug);
  if (typeof direct === 'string') return { kind: 'redirect', to: direct };
  if (direct === null) return { kind: 'unknown' }; // API error — let the page decide, never guess

  // Genuine 404 for the full slug. If it carries a legacy numeric suffix, retry the base slug.
  const base = slug.replace(/-\d+$/, '');
  if (base && base !== slug) {
    const stripped = await lookupProduct(base);
    if (typeof stripped === 'string') return { kind: 'redirect', to: stripped };
    if (stripped === null) return { kind: 'unknown' };
    // Not a product either. It may still be a real category (/creatine-2 → /creatine) — but that
    // has to be CHECKED, not assumed. See below.
    return classifyNonProduct(base);
  }

  return classifyNonProduct(slug);
}

/**
 * A slug that is not a product: is it a category, or is it simply gone?
 *
 * This function is the whole fix. Both branches above used to end in `return \`/${slug}\``, which
 * reads as "it is probably a category" and is right for `/shop/omega-3` and wrong for every
 * discontinued product. Wrong meant 301 → 404: Google spends a hop, caches the redirect, still
 * finds nothing, and the hop hides the real status from Search Console. Measured on 14/08/2026
 * that was the largest shape in a 1,060-page "Not found" bucket.
 */
async function classifyNonProduct(slug: string): Promise<ShopResolution> {
  const isCategory = await isTaxonomySlug(slug);

  // null = the taxonomy could not be read. Unknown is not evidence of absence, and acting on it
  // would 410 live category pages during a backend hiccup.
  if (isCategory === null) return { kind: 'unknown' };
  if (isCategory) return { kind: 'redirect', to: `/${slug}` };

  return { kind: 'gone', slug };
}

/**
 * What a discontinued product should answer.
 *
 * Google's guidance is a redirect to a RELEVANT page, and 404/410 when none exists. An irrelevant
 * redirect is treated as a soft 404 — it spends the hop and earns nothing — so the category is used
 * only when the slug genuinely shares a term with it, and 410 Gone otherwise. 410 is also the
 * status that empties the Search Console bucket fastest: it says "do not come back", where 404 only
 * says "not today".
 */
async function goneOrCategory(request: NextRequest, slug: string): Promise<NextResponse> {
  const best = await bestCategoryForSlug(slug);
  if (best) return redirectPreservingQuery(request, `/${best}`);

  return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Lowercase a path WITHOUT touching percent-escapes.
 *
 * `/blog/%D9%85%D8%A7` is a real, ranking Arabic article (1,969 impressions). Lowercasing the whole
 * string turns it into `%d9%85%d8%a7` — still legal, since RFC 3986 makes hex case-insensitive, but
 * it rewrites a URL that was fine and invites a second variant of every Arabic article into the
 * index. So the escapes are stepped over and only real ASCII letters are folded.
 */
function lowercasePreservingEscapes(path: string): string {
  return path.replace(/%[0-9A-Fa-f]{2}|[A-Z]+/g, (m) => (m.startsWith('%') ? m : m.toLowerCase()));
}

/**
 * WHAT A LEGACY PREFIX SHOULD ANSWER, IN ONE PLACE.
 *
 * Thirteen prefixes from the WordPress and old-Laravel eras all carry the same payload — a product
 * or listing slug in their last segment — and every one of them was answered in redirects.js by a
 * catch-all onto a HUB:
 *
 *     /produit/:path*            -> /shop
 *     /musculation-products/:*   -> /shop
 *     /category/:path*           -> /shop
 *     /categorie/:path*          -> /proteines      (not even a hub: the WRONG category)
 *     /brand/:path+              -> /brands
 *
 * Those rules look like fixes and are not. Google documents a redirect to an irrelevant page as a
 * SOFT 404: the hop is spent, the target is not relevant, the URL is neither dropped nor indexed —
 * it simply moves from "Not found (404)" to "Page with redirect". That is exactly the pair of
 * numbers on this property (1,060 and 817), and it is why the buckets never drain no matter how
 * many redirects get added.
 *
 * ── AND THE RULES WERE UNREACHABLE-CODE GENERATORS TOO ────────────────────────────────────────
 * `next.config.js` redirects run BEFORE middleware. Measured on production 15/08/2026 by status
 * code, since `p()` emits 308 and this file emits 301:
 *
 *     /brand/ZZZ-FAKE-BRAND   308 -> /brands     (redirects.js)
 *     /shop/serious-mass-2-7-kg   301 -> /mass-gainers/serious-mass-2-7-kg   (this file)
 *
 * So `legacyCategory`, `legacyBrand` and `legacyProducts` below — each written to resolve the real
 * destination — had never fired for any URL a catch-all also matched. Deleting the catch-alls is
 * what makes them reachable, and this function is what they should have shared all along.
 *
 * The order of the three attempts is the whole design:
 *   1. taxonomy   — a live category/subcategory slug, the cheapest and most common answer
 *   2. product    — a live product, resolved to its canonical /{subcat}/{slug} in ONE hop
 *   3. relevance  — `bestCategoryForSlug`, which demands a shared significant token, or 410
 *
 * `preferProduct` flips 1 and 2 for prefixes that named products (/produit, /products): it only
 * changes which lookup runs first, never what counts as an answer.
 */
async function retireLegacyPath(
  request: NextRequest,
  rawSlug: string,
  preferProduct: boolean
): Promise<NextResponse | null> {
  let slug = rawSlug;
  try { slug = decodeURIComponent(rawSlug); } catch { /* keep raw */ }
  slug = slug.trim().toLowerCase().replace(/\s+/g, '-');
  if (!slug) return null;

  const asTaxonomy = async (): Promise<NextResponse | null> => {
    const known = await isTaxonomySlug(slug);
    // null is "the taxonomy could not be read". Unknown is not evidence of absence.
    if (known === null) return NextResponse.next();
    return known ? redirectPreservingQuery(request, `/${slug}`) : null;
  };

  const asProduct = async (): Promise<NextResponse | null> => {
    const found = await lookupProduct(slug);
    if (typeof found === 'string') return redirectPreservingQuery(request, found);
    if (found === null) return NextResponse.next(); // backend unhealthy — never guess
    return null;
  };

  const first = preferProduct ? asProduct : asTaxonomy;
  const second = preferProduct ? asTaxonomy : asProduct;

  const a = await first();
  if (a) return a;
  const b = await second();
  if (b) return b;

  // Neither. `goneOrCategory` redirects only on a real token overlap, and 410s otherwise — the
  // status that empties the bucket fastest, and the honest one.
  return goneOrCategory(request, slug);
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  /* ── Machine paths from the old Laravel deployment → 410 ─────────────────────────────────────
   *
   * /public/api/searchProduct/BCAA, /public/api/productsBySubCategoryId/898-accessories,
   * /storage/products/… — the previous stack served its API and its uploads under paths that this
   * app does not have and will never have. They are in the "Not found" export because Google found
   * them linked from the old HTML, not because anyone wants them. 410 says do not come back.
   *
   * ABOVE the case fold, and that ordering is the whole reason this block moved. Below it,
   * /public/api/searchProduct/BCAA was first 301'd to its lowercase form and only then answered
   * 410 — a redirect into a Gone, which is a hop spent to say nothing. A terminal status should
   * never be reached through a redirect.
   */
  if (/^\/(?:public|storage)(?:\/|$)/i.test(pathname)) {
    return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  /* ── URL CASE, NORMALISED BEFORE ANYTHING ELSE RUNS ──────────────────────────────────────────
   *
   * A miscapitalised URL is not a 404 here — it is a slow 308, and that is worse. MySQL's default
   * collation is case-insensitive, so `productsBySubCategoryId/Creatine` MATCHES the row whose slug
   * is `creatine`; `(shop)/[slug]` therefore resolves the category, renders `CategoryPage`, and only
   * THEN discovers in the page body that `getCanonicalSlug()` disagrees with the requested slug and
   * issues `permanentRedirect`. The redirect is decided after the full category walk. Measured on
   * production 15/08/2026, before this rule:
   *
   *     /Creatine    308 -> /creatine    5.9 s
   *     /Proteines   308 -> /proteines   16.8 s
   *     /WHEY-ISOLATE   no response inside 45 s (cold)
   *
   * Seventeen seconds for a redirect, and cold requests that outlive any crawler's patience. Google
   * responds to timeouts by crawling the whole HOST less, so one bad inbound link with a capital
   * letter taxes every other URL on the site.
   *
   * Doing it here costs zero backend calls and answers in single-digit milliseconds. It also
   * collapses a duplicate-content class that `getCanonicalSlug` could only paper over: /whey-proteine,
   * /Whey-Proteine and /WHEY-PROTEINE each used to return 200.
   *
   * RESERVED FIRST SEGMENTS KEEP THEIR TAIL. Blog slugs on this site contain spaces, apostrophes and
   * capitals — `/blog/Le%20magn%C3%A9sium%20:%20la%20condition%20cach%C3%A9e…` is a live URL in
   * sitemaps/blog.xml. Folding that tail would 404 a published article, so when the first segment is
   * a known route (/blog, /shop, /account…) only the SEGMENT is normalised and the rest is left
   * exactly as sent.
   */
  if (/[A-Z]/.test(pathname)) {
    const [, head = '', ...rest] = pathname.split('/');
    const headLower = lowercasePreservingEscapes(head);

    /* A prefix whose own handler already folds the slug it extracts must NOT be folded here, or
       the fix becomes a chain. Measured on production right after this shipped:

           /produits-search/GLUTAMINE   301 -> /produits-search/glutamine   301 -> /glutamine

       Two hops to reach a page that `retireLegacyPath` resolves in one, because that function
       lowercases before it looks anything up. `/shop/{slug}` and `/product(s)/{slug}` are
       deliberately NOT in this set: `resolveShopSlug` matches the slug verbatim, so folding first
       is what makes /shop/Xtend-BCAA resolve at all. */
    const foldedDownstream =
      /^(?:category|categorie|categories|subcategories|sous-categories|product-category|produit|produits|musculation-products|collections|produits-search|brand|brands)$/.test(
        headLower
      ) && rest.length > 0;

    /* Head-only in both special cases, for different reasons: a legacy prefix needs its head
       folded so the case-sensitive patterns below can match `/Category/...` at all, and a reserved
       route needs its head folded without touching a tail that may legitimately carry capitals. */
    const normalised =
      foldedDownstream || isReservedRouteSlug(headLower)
        ? ['', headLower, ...rest].join('/')
        : lowercasePreservingEscapes(pathname);

    if (normalised !== pathname) {
      return redirectPreservingQuery(request, normalised);
    }
  }

  // ── Machine endpoint crawled as a page → 410 (Gone) ─────────────────────
  // /api-proxy is not, and never was, a page: next.config.js rewrites `/api-proxy/:path*` to the
  // Laravel API, and path-to-regexp lets `:path*` match ZERO segments, so the bare path silently
  // proxies to the API root instead of 404ing cleanly. It is in the GSC "Not found (404)" export;
  // 410 tells Google to drop it for good.
  //
  // DELIBERATELY NOT /api. `/api` looks like a machine path but is the BRAND PAGE for the brand
  // "API" (brands id=5) — the sitemap lists it between /activlab and /applied-nutrition. It 404s
  // today only because the static `app/api/` segment shadows the dynamic `(shop)/[slug]` route.
  // 410ing it would permanently delete a real brand listing. Tracked separately as a brand-slug
  // collision fix; leaving the existing 404 here is a no-op, not a regression.
  //
  // EXACT equality only — `/api-proxy/accueil` cannot match, and the `config.matcher` below
  // already excludes the `api-proxy/` prefix so this file never runs for a real endpoint. Must
  // stay ABOVE any await: Next.js runs middleware BEFORE next.config rewrites, which is the only
  // reason a 410 can beat the /api-proxy proxy.
  if (pathname === '/api-proxy') {
    return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  // ── Brand slug shadowed by a real route segment → 301 to the served slug ──
  // `/api` LOOKS like a machine path but is the brand page for the brand "API" (brands id=5) —
  // sitemap.xml lists it between /activlab and /applied-nutrition. It 404s only because the static
  // `app/api/` segment beats the dynamic `(shop)/[slug]` route, so the brand can never render
  // there no matter what the page does. util/brandSlug.ts now serves that brand at /marque-api;
  // this sends the shadowed URL there in ONE hop.
  //
  // Must run BEFORE the crawler rewrite below, so Googlebot and a browser get the same 301. If it
  // ran after, bots would be rewritten to /x-crawler/category/api (where the brand resolves and
  // returns 200) while users still got the 404 — the same status for the same URL is the whole
  // point. Exact equality only: `/api/revalidate` and friends are already excluded by the matcher.
  const shadowedBrand = pathname === '/api' ? brandSlugRedirectTarget('api') : null;
  if (shadowedBrand) {
    return redirectPreservingQuery(request, `/${shadowedBrand}`);
  }

  // ── Admin-defined redirects (301 / 302 / 410) ───────────────────────────
  // Managed in Filament → "Redirections", served from /api/redirections, cached in-process
  // (~1 backend hit per 5 min) and fail-open. Runs FIRST so the store owner can retire any dead
  // URL — this is how the "Not found (404)" bucket in Search Console gets cleaned up without a
  // code deploy. Exact-path match only (never shadows a real page unless explicitly configured).
  const adminRule = await getAdminRedirect(pathname);
  if (adminRule) {
    if (adminRule.code === 410) {
      // Permanently gone — tells Google to drop the URL from the index.
      return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
    }
    const dest = sameOriginOrTrusted(new URL(adminRule.to as string, request.url), request);
    request.nextUrl.searchParams.forEach((value, key) => {
      if (!dest.searchParams.has(key)) dest.searchParams.append(key, value);
    });
    return NextResponse.redirect(dest, adminRule.code === 302 ? 302 : 301);
  }

  // Hard 410 for WordPress-era junk URLs still in Google's index (GSC "Excluded by noindex"
  // examples from 2021–2023): /product-tag/* taxonomy pages and /cart/?remove_item=… action URLs.
  // These never existed on this app — Gone tells Google to drop them for good.
  if (pathname.startsWith('/product-tag/') || (pathname.startsWith('/cart') && searchParams.has('remove_item'))) {
    return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  // ── WordPress/WooCommerce-era dead URL classes → hard 410 (Gone) ─────────────
  // The store migrated off WordPress; these URL classes never exist on this Next app but
  // linger in Google's index — and several /wp-*.php paths currently return HTTP 500 (worst
  // case for crawl signals). 410 tells crawlers to drop them permanently. Each pattern was
  // probed against the LIVE taxonomy and matches ONLY dead URLs, never a real route:
  //   • /wp-*            wp-login.php, wp-admin, wp-json, wp-content, wp-includes, wp-cron.php…
  //   • /feed, /comments/feed   RSS/Atom feeds (no feeds on this app)
  //   • /trackback       WordPress pingback endpoint
  //   • /tag/*, /author/*, /attachment/*   WP taxonomy / author / attachment archives
  //   • /YYYY[/MM[/DD]]  WP date archives (e.g. /2023, /2023/01, /2023/01/15)
  // Runs BEFORE the crawler rewrite so bots get 410 instead of a "product not found" 404.
  // (/product-tag/* and /xmlrpc.php are already folded to /shop and / by next.config redirects.js.)
  const isWordPressDeadPath =
    pathname.startsWith('/wp-') ||
    pathname === '/feed' ||
    pathname === '/comments/feed' ||
    pathname === '/trackback' ||
    /^\/(tag|author|attachment)\/[^/]+\/?$/.test(pathname) ||
    // Require at least a month segment (/YYYY/MM[/DD]) so a bare single-segment
    // /YYYY can never collide with a numeric category/brand slug.
    /^\/(19|20)\d{2}(?:\/\d{1,2}){1,2}\/?$/.test(pathname);
  if (isWordPressDeadPath) {
    return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  /*
   * ── WHY /x-crawler IS **NOT** REFUSED HERE, THOUGH IT LOOKS LIKE IT SHOULD BE ───────────────
   *
   * /x-crawler/** is the internal target middleware rewrites crawler user-agents to. Reached
   * DIRECTLY it answers 200 with `robots: index, follow` — so robots.ts's claim that the Disallow
   * is "belt-and-suspenders alongside the route's own noindex" is not true, and a linked copy is
   * how a URL lands in "Indexed, though blocked by robots.txt" (1 page in the 14/08/2026 report).
   *
   * A three-line `if (pathname.startsWith('/x-crawler/')) return 404` was written here, built, and
   * MEASURED — and it took the whole site down for Googlebot:
   *
   *     GET /whey-proteine                            browser 200   Googlebot 404
   *     GET /shop                                     browser 200   Googlebot 404
   *     GET /whey-proteine/100-whey-gold-standard…    browser 200   Googlebot 404
   *
   * The rewrite is supposed to be internal and not re-enter middleware. In this app, on a cold
   * cache, it does. So the guard cannot distinguish "someone asked for the internal path" from
   * "we sent them there ourselves", and getting it wrong 404s every indexable page on the site to
   * the only visitor that matters.
   *
   * ONE indexed URL is not worth that trade. The robots.txt Disallow stays and is the whole
   * defence. If this is ever revisited: rule L2 of scripts/check-indexability-live.mjs
   * ("browser and Googlebot agree on status") is what caught it, and it must be run against a
   * real build with a COLD cache before believing any version of this works.
   */

  // ── Server-side script paths → 410, because today they are HTTP 500 ─────────
  // Measured on production AND on a local production build, 18/08/2026:
  //     /foo.php  /index.php  /config.php  /admin.php  /whey-proteine.php   500
  //     /.env  /.env.local                                                  500
  //     /foo.bar  /foo.html  /foo.jpg  /foo.aspx                            404  (correct)
  // So it is `.php` and `.env` specifically, and it is this app — not nginx, not Cloudflare.
  // These paths reach (shop)/[slug] as a slug containing a dot and something throws downstream.
  //
  // A 500 is the WORST answer for a URL that should be retired: Google treats it as temporary and
  // keeps retrying, which is why "Server error (5xx)" sits in the coverage report at all. This app
  // has never had a PHP entry point — the Laravel admin is a different origin — so every one of
  // these is either WordPress-era residue or a vulnerability scanner. 410 retires them for good
  // and costs one middleware string compare.
  //
  // Extension test, not a substring test: `/creatine-500g-php-blend` must not match.
  if (/\.php\d?$/i.test(pathname) || /(^|\/)\.env(\.[a-z0-9-]+)?$/i.test(pathname)) {
    return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  // ── Blog taxonomy: a feature with no data, serving an unbounded 200 space ───
  // /blog_categories and /blog_tags BOTH return `[]` from the API — measured through the
  // production proxy, 18/08/2026. There is not one tag and not one category in the CMS, and the
  // per-slug endpoints answer 404 ("Tag blog introuvable") for every input.
  //
  // The routes answered HTTP 200 anyway, with no rel=canonical and a `robots` value that CHANGED
  // BETWEEN TWO FETCHES OF THE SAME URL (the metadata catch fell through to the layout default of
  // "index, follow" whenever the API call failed, and to the real noindex when it succeeded). An
  // unbounded family of canonical-less near-duplicate pages whose indexability is a coin flip.
  //
  // 410 rather than 404: both retire the URL, 410 drains the Search Console bucket faster, and
  // there is no ambiguity to preserve here — these cannot become valid without a code change,
  // because the routes are being retired, not waiting for content. If blog taxonomy is ever
  // populated in Filament, delete this block and the two routes come back.
  //
  // Runs BEFORE the crawler rewrite so Googlebot and a browser get the same status.
  if (/^\/blog\/(tag|category)(\/|$)/.test(pathname)) {
    return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  // ── /blog/{slug} that is not an article → 410 ───────────────────────────────
  // The route already does the right thing and cannot make it stick. Its own log line, on a local
  // production build with the (shop)/not-found.tsx boundary in place:
  //
  //     Error fetching article: Error [ApiError]: Article not found  { status: 404 }
  //     → HTTP 200,  Cache-Control: s-maxage=600, stale-while-revalidate=31535400
  //
  // notFound() is reached and the status is 200 anyway, cached for a year, over a slug space
  // anyone can invent. Middleware is the layer whose status codes have proven reliable here —
  // the same reason /shop/:slug, /brand/:slug and /product/:slug are resolved here and not in
  // their routes.
  //
  // isArticleSlug is three-valued and this only acts on a definitive `false`; `null` (backend
  // unreachable, timeout, empty payload) falls through to the page exactly as before. See
  // util/blogSlugs.ts for why a cache miss forces one refresh before it is believed.
  const blogArticle = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogArticle?.[1]) {
    let articleSlug = blogArticle[1];
    try { articleSlug = decodeURIComponent(articleSlug); } catch { /* keep raw */ }
    if ((await isArticleSlug(articleSlug)) === false) {
      return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  // WordPress query-string artifacts on the homepage. Today they all render the homepage with
  // HTTP 200 (?p=123, ?author=1, ?s=whey, ?m=202301, ?page_id=2, ?product_cat=…), so Google sees
  // an unbounded set of duplicate-of-home URLs. Consolidate them. Only WP-specific param names
  // trigger this and only on "/", so real app/tracking params (category, brand, page, search,
  // utm_*, gclid, fbclid, __crawler…) pass through untouched.
  if (pathname === '/') {
    if (searchParams.has('feed')) {
      // ?feed=rss2 etc. — feeds are gone.
      return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
    }
    if (searchParams.has('s')) {
      // Legacy WordPress search → the real search listing, preserving the query.
      const term = searchParams.get('s') || '';
      const searchUrl = new URL('/shop', request.url);
      if (term) searchUrl.searchParams.set('search', term);
      return NextResponse.redirect(searchUrl, 301);
    }
    const WP_HOME_PARAMS = ['p', 'page_id', 'author', 'm', 'cat', 'product_cat', 'attachment_id', 'paged'];
    if (WP_HOME_PARAMS.some((k) => searchParams.has(k))) {
      // Strip the legacy param → canonical homepage (no redirect loop: "/" has none of these).
      return NextResponse.redirect(new URL('/', request.url), 301);
    }
  }

  // ── Sitelinks-searchbox template leaked into the index → 410 ────────────
  // The SearchAction markup that published this urlTemplate is ALREADY GONE (see the note on
  // buildWebSiteSchema in util/structuredData.ts), so nothing is still emitting it — this only
  // drains the stale index entries: /shop?search=%7Bsearch_term_string%7D and the /search?q=
  // form in the GSC export. A param value containing BRACES can never be a real query: every
  // search URL this app builds comes from URLSearchParams over a user term, so the literal
  // placeholder is provably invalid and permanently so. Path-agnostic on purpose (one rule,
  // both URL shapes); it only ever inspects `q`/`search`, so no path is otherwise affected.
  const templatedTerm = searchParams.get('q') ?? searchParams.get('search');
  if (templatedTerm && /^\{search_term_string\}$/i.test(templatedTerm.trim())) {
    return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }

  // Legacy WordPress archive pagination: /{segment}/page/{n} (e.g. /shop/page/2, /proteines/page/2).
  // These 3-segment paths have no route here — /shop/page/2 currently serves a soft meta-refresh to
  // the homepage (HTTP 200, a duplicate). 301 to the clean base path with ?page so the pagination
  // folds onto the real listing. No real route has "page" as a middle segment, so this only matches
  // dead WP pagination URLs.
  const wpPaging = pathname.match(/^\/([^/]+)\/page\/(\d+)\/?$/);
  if (wpPaging?.[1]) {
    // Guard against a backslash first segment (/\evil.com/page/2 → off-origin) via same-origin check.
    const pagedUrl = sameOriginOrHome(new URL(`/${wpPaging[1]}`, request.url), request);
    if (Number(wpPaging[2]) > 1) pagedUrl.searchParams.set('page', wpPaging[2]);
    return NextResponse.redirect(pagedUrl, 301);
  }

  // /shop/:slug → resolve to /{subcat}/{slug} with real HTTP 301
  // This fires before the page renders, eliminating the __next-page-redirect meta-refresh tag.
  const shopSlug = pathname.match(/^\/shop\/([^/]+)\/?$/);
  if (shopSlug?.[1]) {
    const canonical = await resolveShopSlug(shopSlug[1]);
    if (canonical.kind === 'redirect') return redirectPreservingQuery(request, canonical.to);
    if (canonical.kind === 'gone') return goneOrCategory(request, canonical.slug);
    // 'unknown' — API unreachable. Fall through to the page (it handles it too).
  }

  // ── THREE-SEGMENT /shop PATHS, WHICH HAVE NEVER ACTUALLY REDIRECTED ─────────
  //
  // app/(shop)/shop/[slug]/[subcategory]/page.tsx and .../reviews/page.tsx are both written as
  // pure `permanentRedirect(...)` routes. They do not redirect. Measured on production AND on a
  // local production build, 18/08/2026, for VALID and invalid inputs alike:
  //
  //     GET /shop/whey-proteine/whey-isolate        HTTP 200
  //     <meta id="__next-page-redirect" http-equiv="refresh" content="0;url=/whey-isolate"/>
  //
  // A `permanentRedirect()` raised from a page body in this app degrades to a meta-refresh at
  // HTTP 200 — the exact failure the `/shop/:slug` rule 30 lines above was moved into middleware
  // to fix ("This fires before the page renders, eliminating the __next-page-redirect meta-refresh
  // tag"). The 3-segment routes were never given the same treatment.
  //
  // The cost of leaving it: `/shop/{anything}/{anything}` answers 200 with `robots: index, follow`,
  // NO rel=canonical, and the HOMEPAGE <title> — because the page function returns nothing, so
  // metadata falls through to the root layout default. That is an unbounded, indexable,
  // canonical-less duplicate space, which is what "Duplicate without user-selected canonical"
  // and "Crawled - currently not indexed" are made of.
  //
  // Placed AFTER the 2-segment /shop/:slug rule and BEFORE the 4-segment WordPress rule, matching
  // the order the app router itself resolves them in.
  const shopThree = pathname.match(/^\/shop\/([^/]+)\/([^/]+)\/?$/);
  if (shopThree) {
    const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
    const first = decode(shopThree[1]!);
    const second = decode(shopThree[2]!);

    if (second.toLowerCase() === 'reviews') {
      // /shop/{product}/reviews → the product's canonical URL, anchored at its reviews block.
      const found = await lookupProduct(first);
      if (typeof found === 'string') return redirectPreservingQuery(request, `${found}#reviews`);
      if (found === false) {
        return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
      }
      // null — backend unreachable. Fall through rather than guess while it is unhealthy.
    } else {
      // /shop/{cat}/{subcat} → the subcategory is served at /{subcat}, whatever its parent.
      const known = await isTaxonomySlug(second);
      if (known === true) return redirectPreservingQuery(request, `/${encodeURIComponent(second)}`);
      if (known === false) {
        // Not taxonomy. It may still be a product sitting under a category segment, which is the
        // one live shape this path can legitimately carry.
        const asProduct = await lookupProduct(second);
        if (typeof asProduct === 'string') return redirectPreservingQuery(request, asProduct);
        if (asProduct === false) {
          return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
        }
      }
      // null from either lookup — fall through, never act on "could not find out".
    }
  }

  // ── WordPress nested shop paths: /shop/{cat}/{subcat}/{product}[/reviews] ──
  // WHY THIS CAN NEVER MATCH A LIVE URL: this is a FOUR-segment path, and the deepest real /shop
  // route in the app router is THREE segments — app/(shop)/shop/[slug]/page.tsx,
  // shop/[slug]/reviews/page.tsx and shop/[slug]/[subcategory]/page.tsx. There is no 4-segment
  // route anywhere, so every path this regex matches is a hard 404 today.
  // WooCommerce always put the PRODUCT in the last segment, so resolve that segment with the same
  // resolver resolveShopSlug uses:
  //   • product found      → ONE 301 to its canonical /{subcat}/{slug} (link equity kept)
  //   • definitive API 404 → 410, the URL class is permanently gone with WordPress
  //   • API error (null)   → fall through; never guess while the backend is unhealthy
  // NOTE: /shop/{a}/{b}/reviews resolves its last segment as "reviews" and will 410 rather than
  // 404. Both are terminal and neither is a live route (the real reviews route is 3 segments).
  const wpNestedShop = pathname.match(/^\/shop\/[^/]+\/[^/]+\/([^/]+?)(?:\/reviews)?\/?$/);
  if (wpNestedShop?.[1]) {
    let lastSegment = wpNestedShop[1];
    try { lastSegment = decodeURIComponent(lastSegment); } catch { /* keep raw */ }
    const nested = await lookupProduct(lastSegment);
    if (typeof nested === 'string') return redirectPreservingQuery(request, nested);
    if (nested === false) {
      return new NextResponse('Gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  // Legacy locale-prefixed URLs (old i18n scheme): /en/... , /ar/... → strip the prefix.
  // Locale is client-side now, so /ar/shop/x and /en/category/y should land on the real URL.
  const legacyLocale = pathname.match(/^\/(en|ar)(\/.*)?$/);
  if (legacyLocale) {
    return redirectPreservingQuery(request, legacyLocale[2] || '/');
  }

  // Legacy review sub-pages: /product/{slug}/reviews or /products/{slug}/reviews.
  // Resolve straight to the canonical /{subcat}/{slug} in ONE hop (falling back to /product/{slug},
  // which resolves server-side) instead of chaining through /product/{slug} → canonical.
  const legacyReviews = pathname.match(/^\/products?\/(.+?)\/reviews\/?$/);
  if (legacyReviews?.[1]) {
    const canonical = await resolveShopSlug(legacyReviews[1]);
    if (canonical.kind === 'redirect') return redirectPreservingQuery(request, canonical.to);
    if (canonical.kind === 'gone') return goneOrCategory(request, canonical.slug);
    return redirectPreservingQuery(request, `/product/${legacyReviews[1]}`);
  }

  /* ── THE LEGACY PREFIXES, ALL RESOLVED THROUGH ONE PATH ─────────────────────────────────────
   *
   * Every prefix below used to be a catch-all onto /shop, /brands or /proteines in redirects.js.
   * See the docblock on `retireLegacyPath` for why those were not fixes, and for the measurement
   * showing they also made this file's own handlers unreachable.
   *
   * The LAST segment is the payload in all of them, which is what lets one rule serve WooCommerce's
   * nested taxonomy (/product-category/acides-amines/stimulants-hormonaux) and the flat old-Laravel
   * shapes (/produit/psychotic-pre-workout) with the same code.
   *
   * `/category/{x}` is in this list rather than keeping its old one-line prefix-strip because the
   * strip was a 301 into a 404 for anything that was not a category: `/category/whey-pro-warriors-2kg`
   * is a PRODUCT slug, and it went to `/whey-pro-warriors-2kg`, which does not exist.
   */
  const legacyTaxonomy = pathname.match(
    /^\/(?:category|categorie|categories|subcategories|sous-categories|product-category)\/(?:.*\/)?([^/]+)\/?$/
  );
  if (legacyTaxonomy?.[1]) {
    const answer = await retireLegacyPath(request, legacyTaxonomy[1], false);
    if (answer) return answer;
  }

  const legacyProductPrefix = pathname.match(
    /^\/(?:produit|produits|musculation-products|collections)\/(?:.*\/)?([^/]+)\/?$/
  );
  if (legacyProductPrefix?.[1]) {
    const answer = await retireLegacyPath(request, legacyProductPrefix[1], true);
    if (answer) return answer;
  }

  /* ── The old site's search URLs ──────────────────────────────────────────────────────────────
   *
   * /produits-search/ACIDES AMINES, /produits-search/GLUTAMINE, /produits-search/WHEY ISOLATE …
   * Sixteen of them in the export, and every one was sent to a bare /shop, which discards the only
   * thing the URL contained. Most of these terms ARE categories on this site — `bcaa`, `glutamine`,
   * `whey-isolate` — so `retireLegacyPath` lands them on the real listing; the ones that are not
   * fall through to the shop's own search, which at least answers the question that was asked.
   */
  const legacySearch = pathname.match(/^\/produits-search\/(.+?)\/?$/);
  if (legacySearch?.[1]) {
    const answer = await retireLegacyPath(request, legacySearch[1], false);
    // Only a REDIRECT counts here. `retireLegacyPath` ends in 410 when nothing is relevant and in
    // `next()` when the backend could not be read — but a search term with no matching category is
    // still a real question, and this URL is the only place it is written down. Both of those
    // outcomes therefore fall through to the listing that can actually answer it.
    if (answer && answer.status >= 300 && answer.status < 400) return answer;
    let term = legacySearch[1];
    try { term = decodeURIComponent(term); } catch { /* keep raw */ }
    const searchUrl = new URL('/shop', request.url);
    searchUrl.searchParams.set('search', term);
    return NextResponse.redirect(searchUrl, 301);
  }

  // ── The French shop prefix ────────────────────────────────────────────────────────────────
  // Two of /boutique's shapes are hard 404s. Measured on production, 14/08/2026:
  //
  //     /boutique                                404
  //     /boutique/                               308 → /boutique → 404
  //     /boutique/creatine/gold-creatine-300g    404
  //     /boutique/proteines                      308 → /proteines        (already correct)
  //
  // That last one works BY ACCIDENT and the accident is worth naming, because it is what makes
  // this rule narrower than it looks: /boutique/{x} matches the real two-segment product route
  // (`[slug]/[productSlug]`), whose product lookup fails and whose dead-end fallback redirects to
  // /{x}. It already lands in one hop on the right page. Routing it through /shop/{x} — the
  // obvious "normalise the prefix" version of this rule — would replace that one hop with two,
  // making the only working shape worse in order to fix the broken ones.
  //
  // So: the bare path goes to the boutique, and anything three segments deep drops the prefix
  // onto the real /{category}/{product} route, which knows how to resolve a live product and how
  // to retire a dead one. Two-segment paths are deliberately left alone.
  const legacyBoutique = pathname.match(/^\/boutique(?:\/(.+?))?\/?$/);
  if (legacyBoutique) {
    const rest = legacyBoutique[1];
    if (!rest) return redirectPreservingQuery(request, '/shop');
    if (rest.includes('/')) return redirectPreservingQuery(request, `/${rest}`);
  }

  // Legacy brand URLs: /brand/{NAME} or /brand/{NAME}/{id}. The NAME must be slugified
  // (e.g. "BIOTECH USA" → "biotech-usa") — the old code redirected to the RAW name, which
  // 404'd for every multi-word/uppercase brand. Lands on /{brand-slug}, which resolves.
  const legacyBrand = pathname.match(/^\/brands?\/(.+?)(?:\/\d+)?\/?$/);
  if (legacyBrand?.[1]) {
    const slug = slugifyName(legacyBrand[1]);
    if (slug) {
      /* CHECKED, not assumed. Slugifying "JX FITNESS" to `jx-fitness` is the easy half; the half
         that matters is knowing whether that brand still exists, because 301ing to a brand page
         that does not is the same 301-into-a-404 this file exists to end. `null` = the brand list
         could not be read, and during a backend hiccup the old behaviour (redirect and hope) is
         still better than a 410 on a live brand. */
      const known = await isBrandSlug(slug);
      if (known !== false) return redirectPreservingQuery(request, `/${slug}`);
      // A brand that is genuinely gone. Its products may not be: try the taxonomy and the
      // relevance match before giving up, exactly as a retired product does.
      const answer = await retireLegacyPath(request, slug, false);
      if (answer) return answer;
    }
  }

  /* ── /product/{slug} AND /products/{slug} → the canonical URL, in ONE hop ────────────────────
   *
   * The singular form is new here, and it is the largest single shape in a bucket nobody had
   * connected to it. In the Search Console export, "Crawled – currently not indexed" holds 1,000
   * URLs; 857 of the 898 that answer 200 are legacy product URLs:
   *
   *     403  /product/*      346  /products/*      108  /shop/*
   *
   * `app/(shop)/product/[slug]/page.tsx` resolves the product and 301s to its canonical — but its
   * fallback, taken whenever the lookup THROWS or the product carries no subcategory, is
   * `permanentRedirect('/shop/' + slug)`, and /shop/{slug} then redirects again. That fallback is
   * not rare: the route is `force-dynamic` with `revalidate = 0`, so every hit is a live backend
   * call, and the backend measured 20–34 s per listing call on 15/08/2026. A slow backend turned
   * every legacy product URL into a two-hop chain, which is precisely what the /shop/* count above
   * is made of.
   *
   * Resolving here costs one cached lookup and hands Google a single hop. On the `unknown` branch
   * this now falls THROUGH rather than redirecting to `/product/{slug}` — that redirect was safe
   * only while this pattern excluded the singular form, and would otherwise be a loop.
   */
  const legacyProducts = pathname.match(/^\/products?\/([^/]+)\/?$/);
  if (legacyProducts?.[1]) {
    const canonical = await resolveShopSlug(legacyProducts[1]);
    if (canonical.kind === 'redirect') return redirectPreservingQuery(request, canonical.to);
    if (canonical.kind === 'gone') return goneOrCategory(request, canonical.slug);
    // 'unknown' — the backend could not answer. Both routes exist on disk and resolve server-side;
    // never guess, and never redirect into a path this same rule matches.
  }

  // ── Feed the Crawler First ──────────────────────────────────────────────
  // For crawlers only, REWRITE (not redirect) a canonical product URL
  // /{subcategory}/{productSlug} to the zero-JS, fully-SSR crawler view.
  // The bot keeps requesting/indexing the canonical URL (rewrite is invisible);
  // it just receives complete server-rendered HTML + full structured data instead
  // of a hydration-dependent client page. Runs AFTER the 301 blocks above so bots
  // still follow legacy→canonical redirects first. Content stays at parity with the
  // human page — this is dynamic rendering, not cloaking. See util/isCrawler.ts.
  /*
   * ── /shop?category=X CONSOLIDATES BEFORE ANYTHING ELSE LOOKS AT THE REQUEST ────────────────
   * This block used to sit ~90 lines further down, AFTER the crawler rewrite — and therefore
   * unreachable for any crawler user-agent. A human on /shop?category=proteines got a 301 to
   * /proteines; Googlebot got 200 and the unfiltered page-1 boutique, plus an uncached upstream
   * catalogue fetch it did not need.
   *
   * Two different status codes for one URL, decided by user-agent, is the definition of the thing
   * this file's own notes elsewhere warn against. It is a pure redirect with no dependency on the
   * crawler branch, so it belongs above it.
   *
   * `sameOriginOrHome` STAYS on the target: `category` is a raw query param, and a value like
   * `//evil.com` would otherwise become an off-origin 301.
   */
  // Redirect old query-based category URLs to new clean URLs
  if (pathname === '/shop') {
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');

    if (category) {
      // Redirect /shop?category=slug to /slug. Guard: `category` is a raw query param, so
      // a value like //evil.com or \evil.com would otherwise become an off-origin 301.
      const newUrl = sameOriginOrHome(new URL(`/${category}`, request.url), request);
      // Preserve other query params (like page)
      searchParams.forEach((value, key) => {
        if (key !== 'category') {
          newUrl.searchParams.set(key, value);
        }
      });
      return NextResponse.redirect(newUrl, 301);
    }

    if (brand) {
      // Brand query values are numeric IDs in this app, so the shop page keeps resolving them.
    }
  }

  const wantsCrawlerView =
    isCrawlerUA(request.headers.get('user-agent')) ||
    searchParams.get(CRAWLER_PREVIEW_PARAM) === '1';
  // CRITICAL: never run the crawler rewrite on file-like paths. Real category/product/brand slugs
  // never contain a dot, but `/sitemap.xml` and `/robots.txt` match the single-segment regex below
  // and isReservedRouteSlug('sitemap.xml') !== 'sitemap' → they were rewritten to
  // /x-crawler/category/sitemap.xml → notFound() → Googlebot got a 404 for the sitemap AND robots.txt
  // (sitemap unreadable in Search Console; robots.txt 404 = "crawl everything"). The dot guard fixes it.
  if (wantsCrawlerView && !pathname.includes('.')) {
    // /shop is named explicitly, BEFORE the reserved-slug checks below deliberately exclude it.
    //
    // The boutique is the natural landing page for "proteine tunisie", and it was the one listing
    // Googlebot could not read: a bot fetch returned ~1MB of HTML with exactly TWELVE product
    // links, because the catalogue lives behind ShopPageClient's useSearchParams Suspense bailout
    // and never becomes crawlable anchors. isReservedRouteSlug('shop') is true, which is correct
    // for /cart and /blog — it just also caught the page that needed the rewrite most.
    //
    // Naming it here rather than loosening isReservedRouteSlug keeps that guard intact: it is what
    // stops /sitemap.xml and /robots.txt being rewritten into a 404, which has happened before.
    if (pathname === '/shop' || pathname === '/shop/') {
      /*
       * ?page=N IS CARRIED THROUGH. NOTHING ELSE IS.
       *
       * `new URL('/x-crawler/shop', request.url)` replaces the whole path INCLUDING the query, so
       * every paginated boutique URL reached the crawler view with no params at all. Measured on
       * production 19/08/2026, as Googlebot:
       *
       *     GET /shop?page=2      200, page-1 content, rel=canonical → /shop
       *     GET /shop?page=939    200, page-1 content, rel=canonical → /shop
       *
       * — while a browser at the same URLs gets page 2 and a self-canonical. Two consequences, both
       * bad and both invisible from a browser:
       *
       *   1. The crawler view RENDERS a pager (this file's docblock explains why it was added: with
       *      a 10,669-product catalogue "no link existed to the other 7,572 from anywhere on the
       *      site"). Every one of those links led back to page 1, so the fix has never worked for
       *      the only visitor it was for.
       *   2. Each ?page=N is a 200 whose canonical is a different URL — the literal definition of
       *      Search Console's "Alternate page with proper canonical", and /shop?page=2 and
       *      /shop?page=939 are the two the boutique hands Googlebot on every crawl.
       *
       * Only `page` is forwarded. Carrying the facets too (?search, ?brand, ?flavors…) would turn
       * an unbounded query space into one upstream catalogue call per distinct crawled URL; they
       * are X-Robots noindexed in next.config anyway, so collapsing them onto the unfiltered first
       * page is both cheaper and the consolidation we want.
       */
      const crawlerShop = new URL('/x-crawler/shop', request.url);
      const page = searchParams.get('page');
      if (page && /^\d{1,6}$/.test(page) && page !== '1') crawlerShop.searchParams.set('page', page);
      return NextResponse.rewrite(crawlerShop);
    }

    /*
     * BOTH SEGMENTS ARE FORWARDED, AND THE SECOND ONE IS THE POINT.
     *
     * This used to rewrite to `/x-crawler/product/{productSlug}` and drop the category. The
     * crawler route therefore could not see which category the URL claimed, so it could not do
     * what app/(shop)/[slug]/[productSlug] has always done — 301 to the canonical when the claimed
     * category is not the product's own. The two answered the same URL differently. Measured on
     * production 17/08/2026:
     *
     *     /isolat-de-whey/iso-whey-2-27kg-muscletech      Chrome 308 -> canonical   Googlebot 200
     *     /gainers-haute-energie/mass-gainer-zero-7kg-…   Chrome 308 -> canonical   Googlebot 200
     *
     * Both first segments are RETIRED taxonomy slugs, and serving 200 for them left a live copy of
     * the product at every address anyone had ever linked — the first segment was never checked, so
     * any string resolved. The canonical tag was the only thing arguing for consolidation.
     *
     * The crawler route is a catch-all (`[...slug]`) so these arrive as params rather than a query
     * string: reading searchParams would be a dynamic API, and a route that uses one cannot also
     * export generateStaticParams — which is what registers it for ISR at all.
     */
    const productPath = pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (productPath && !isReservedRouteSlug(productPath[1])) {
      return NextResponse.rewrite(
        new URL(
          `/x-crawler/product/${encodeURIComponent(productPath[1])}/${encodeURIComponent(productPath[2])}`,
          request.url
        )
      );
    }
    // Single-segment listings — category / subcategory / brand — live at /{slug} (served by
    // app/[slug]/page.tsx). Their H1 + product links sit inside ShopPageClient's useSearchParams
    // Suspense bailout, so the prerendered HTML crawlers get is just a skeleton. Rewrite bots to
    // the zero-JS SSR listing view (which resolves category→subcategory→brand→CMS the same way,
    // so a CMS/404 slug is never mis-served). Reserved routes (/shop, /blog…) are excluded.
    const categoryPath = pathname.match(/^\/([^/]+)\/?$/);
    if (categoryPath && !isReservedRouteSlug(categoryPath[1])) {
      const crawlerCategory = new URL(
        `/x-crawler/category/${encodeURIComponent(categoryPath[1])}`,
        request.url
      );
      // Category pagination is as crawl-critical as /shop pagination above. Forward only the
      // bounded page number; facets remain collapsed so they cannot create an unbounded crawl
      // space or a separate cache entry for every filter combination.
      const page = searchParams.get('page');
      if (page && /^\d{1,6}$/.test(page) && page !== '1') crawlerCategory.searchParams.set('page', page);
      return NextResponse.rewrite(crawlerCategory);
    }
  }

  // NOTE: we deliberately no longer force no-store on /blog. Mutating response headers on this
  // passthrough NextResponse.next() pinned every /blog response to HTTP 200 — so notFound() for a
  // deleted article or a bad blog category/tag rendered the not-found page as a SOFT-404 (200 body),
  // and it also defeated the ISR (revalidate 300/3600) edge/browser caching those routes were
  // converted to. Blog freshness is handled server-side by ISR + revalidateTag('blog')
  // (POST /api/revalidate-blog); the blog HTML documents cache normally.
  const response = NextResponse.next();


  // /product/* and /products/* are now handled by their own server components
  // which resolve the product and 301 directly to /{sousCategorySlug}/{productSlug}
  // — single-hop redirects, no /shop/ chain. See app/product/[slug]/page.tsx
  // and app/products/[id]/page.tsx.

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - SEO/PWA metadata files (sitemap.xml, robots.txt, sw.js, manifests) — belt-and-suspenders
     *   so the crawler rewrite can never intercept them even if the dot-guard is ever removed.
     */
    /*
     * Exclusions are BOUNDARY-AWARE (`api/`, `api-proxy/`), not bare prefixes. The old `api`
     * prefix also swallowed `/api-proxy*`, and it hid the page-less parents `/api` and
     * `/api-proxy` — both of which appear in the GSC "Not found" export — from middleware,
     * making it impossible to give them a terminal 410. Real endpoints under `api/` and
     * `api-proxy/` are still excluded outright, so no request that carries data is affected.
     */
    // `sitemaps/` covers the child sitemaps behind the /sitemap.xml index (/sitemaps/products-0.xml
    // and friends). They are machine paths like sitemap.xml itself, and without this every crawler
    // fetch of one paid for an admin-redirect lookup that can never match.
    '/((?!api/|api-proxy/|_next/static|_next/image|favicon.ico|sitemap.xml|sitemaps/|robots.txt|sw.js|manifest.json|site.webmanifest).*)',
  ],
};
