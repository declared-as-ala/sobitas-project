import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function redirectPreservingQuery(request: NextRequest, path: string): NextResponse {
  const url = new URL(path, request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return NextResponse.redirect(url, 301);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const legacyCategory = pathname.match(/^\/category\/([^/]+)\/?$/);
  if (legacyCategory?.[1]) {
    return redirectPreservingQuery(request, `/${legacyCategory[1]}`);
  }

  const legacyBrand = pathname.match(/^\/brand\/([^/]+)\/?$/);
  if (legacyBrand?.[1]) {
    return redirectPreservingQuery(request, `/${legacyBrand[1]}`);
  }

  // Legacy /products/ URLs → /product/ (which resolves and 301s to canonical)
  const legacyProducts = pathname.match(/^\/products\/(.+)$/);
  if (legacyProducts?.[1]) {
    return redirectPreservingQuery(request, `/product/${legacyProducts[1]}`);
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
