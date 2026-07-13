import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isCrawlerUA, CRAWLER_PREVIEW_PARAM } from '@/util/isCrawler';
import { isReservedRouteSlug } from '@/util/productUrl';
import { getAdminRedirect } from '@/util/adminRedirects';

function redirectPreservingQuery(request: NextRequest, path: string): NextResponse {
  const url = new URL(path, request.url);
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

/** Resolve /shop/:slug → /{subcat}/{slug} or /{slug} via backend API. Returns null on failure. */
async function resolveShopSlug(slug: string): Promise<string | null> {
  const apiBase =
    process.env.API_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace('/api-proxy', '') ||
    'https://admin.protein.tn/api';
  try {
    const res = await fetch(`${apiBase}/product_details/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) {
      // 404 → might be a category slug like /shop/omega-3
      if (res.status === 404) return `/${slug}`;
      return null;
    }
    const product = await res.json();
    const subSlug: string | undefined =
      product?.sous_categorie?.slug ||
      product?.sousCategorie?.slug ||
      product?.sous_categorie_slug;
    if (subSlug) return `/${subSlug}/${slug}`;
    // Product exists but no subcategory — redirect to /shop is wrong; keep on /shop
    return null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

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
    const dest = new URL(adminRule.to as string, request.url);
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

  // /shop/:slug → resolve to /{subcat}/{slug} with real HTTP 301
  // This fires before the page renders, eliminating the __next-page-redirect meta-refresh tag.
  const shopSlug = pathname.match(/^\/shop\/([^/]+)\/?$/);
  if (shopSlug?.[1]) {
    const canonical = await resolveShopSlug(shopSlug[1]);
    if (canonical) return redirectPreservingQuery(request, canonical);
    // If API is unreachable, fall through to the page (it handles it too)
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

  // Add no-cache headers for blog pages to ensure fresh content
  const response = NextResponse.next();
  
  if (pathname.startsWith('/blog')) {
    // Force no-cache for blog pages (HTML and API responses)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  // Redirect old query-based category URLs to new clean URLs
  if (pathname === '/shop') {
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');

    if (category) {
      // Redirect /shop?category=slug to /slug
      const newUrl = new URL(`/${category}`, request.url);
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
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|manifest.json|site.webmanifest).*)',
  ],
};
