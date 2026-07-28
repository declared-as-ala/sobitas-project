import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isCrawlerUA, CRAWLER_PREVIEW_PARAM } from '@/util/isCrawler';
import { isReservedRouteSlug } from '@/util/productUrl';
import { getAdminRedirect } from '@/util/adminRedirects';

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
async function resolveShopSlug(slug: string): Promise<string | null> {
  const direct = await lookupProduct(slug);
  if (typeof direct === 'string') return direct;
  if (direct === null) return null; // API error — let the page decide, never guess

  // Genuine 404 for the full slug. If it carries a legacy numeric suffix, retry the base slug.
  const base = slug.replace(/-\d+$/, '');
  if (base && base !== slug) {
    const stripped = await lookupProduct(base);
    if (typeof stripped === 'string') return stripped;
    // Not a product either — the base is most likely a category/brand slug (/creatine-2 → /creatine).
    if (stripped === false) return `/${base}`;
    return null;
  }

  // No numeric suffix: the slug may be a category served at /{slug} (e.g. /shop/omega-3).
  return `/${slug}`;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

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

  // Widening the matcher from the bare `api` prefix to `api/` means middleware now RUNS for the
  // bare `/api`, which it never did before. Left alone, the crawler rewrite further down would
  // send Googlebot to /x-crawler/category/api — where the "API" brand resolves and returns 200 —
  // while a browser still got the 404 from the shadowed `app/api/` segment. Serving bots a
  // different status than users is cloaking, so hold /api at exactly its current behaviour until
  // the brand-slug collision is fixed for BOTH audiences at once.
  if (pathname === '/api') {
    return NextResponse.next();
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
    if (canonical) return redirectPreservingQuery(request, canonical);
    // If API is unreachable, fall through to the page (it handles it too)
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
    return redirectPreservingQuery(request, canonical || `/product/${legacyReviews[1]}`);
  }

  const legacyCategory = pathname.match(/^\/category\/([^/]+)\/?$/);
  if (legacyCategory?.[1]) {
    return redirectPreservingQuery(request, `/${legacyCategory[1]}`);
  }

  // Legacy brand URLs: /brand/{NAME} or /brand/{NAME}/{id}. The NAME must be slugified
  // (e.g. "BIOTECH USA" → "biotech-usa") — the old code redirected to the RAW name, which
  // 404'd for every multi-word/uppercase brand. Lands on /{brand-slug}, which resolves.
  const legacyBrand = pathname.match(/^\/brand\/(.+?)(?:\/\d+)?\/?$/);
  if (legacyBrand?.[1]) {
    const slug = slugifyName(legacyBrand[1]);
    if (slug) return redirectPreservingQuery(request, `/${slug}`);
  }

  // Legacy /products/{slug} → resolve straight to canonical /{subcat}/{slug} in ONE hop
  // (was /products/ → /product/ → canonical, a 2-hop chain). Falls back to /product/{slug}.
  const legacyProducts = pathname.match(/^\/products\/([^/]+)\/?$/);
  if (legacyProducts?.[1]) {
    const canonical = await resolveShopSlug(legacyProducts[1]);
    return redirectPreservingQuery(request, canonical || `/product/${legacyProducts[1]}`);
  }

  // ── Feed the Crawler First ──────────────────────────────────────────────
  // For crawlers only, REWRITE (not redirect) a canonical product URL
  // /{subcategory}/{productSlug} to the zero-JS, fully-SSR crawler view.
  // The bot keeps requesting/indexing the canonical URL (rewrite is invisible);
  // it just receives complete server-rendered HTML + full structured data instead
  // of a hydration-dependent client page. Runs AFTER the 301 blocks above so bots
  // still follow legacy→canonical redirects first. Content stays at parity with the
  // human page — this is dynamic rendering, not cloaking. See util/isCrawler.ts.
  const wantsCrawlerView =
    isCrawlerUA(request.headers.get('user-agent')) ||
    searchParams.get(CRAWLER_PREVIEW_PARAM) === '1';
  // CRITICAL: never run the crawler rewrite on file-like paths. Real category/product/brand slugs
  // never contain a dot, but `/sitemap.xml` and `/robots.txt` match the single-segment regex below
  // and isReservedRouteSlug('sitemap.xml') !== 'sitemap' → they were rewritten to
  // /x-crawler/category/sitemap.xml → notFound() → Googlebot got a 404 for the sitemap AND robots.txt
  // (sitemap unreadable in Search Console; robots.txt 404 = "crawl everything"). The dot guard fixes it.
  if (wantsCrawlerView && !pathname.includes('.')) {
    const productPath = pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (productPath && !isReservedRouteSlug(productPath[1])) {
      return NextResponse.rewrite(
        new URL(`/x-crawler/product/${encodeURIComponent(productPath[2])}`, request.url)
      );
    }
    // Single-segment listings — category / subcategory / brand — live at /{slug} (served by
    // app/[slug]/page.tsx). Their H1 + product links sit inside ShopPageClient's useSearchParams
    // Suspense bailout, so the prerendered HTML crawlers get is just a skeleton. Rewrite bots to
    // the zero-JS SSR listing view (which resolves category→subcategory→brand→CMS the same way,
    // so a CMS/404 slug is never mis-served). Reserved routes (/shop, /blog…) are excluded.
    const categoryPath = pathname.match(/^\/([^/]+)\/?$/);
    if (categoryPath && !isReservedRouteSlug(categoryPath[1])) {
      return NextResponse.rewrite(
        new URL(`/x-crawler/category/${encodeURIComponent(categoryPath[1])}`, request.url)
      );
    }
  }

  // NOTE: we deliberately no longer force no-store on /blog. Mutating response headers on this
  // passthrough NextResponse.next() pinned every /blog response to HTTP 200 — so notFound() for a
  // deleted article or a bad blog category/tag rendered the not-found page as a SOFT-404 (200 body),
  // and it also defeated the ISR (revalidate 300/3600) edge/browser caching those routes were
  // converted to. Blog freshness is handled server-side by ISR + revalidateTag('blog')
  // (POST /api/revalidate-blog); the blog HTML documents cache normally.
  const response = NextResponse.next();

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
    '/((?!api/|api-proxy/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|manifest.json|site.webmanifest).*)',
  ],
};
