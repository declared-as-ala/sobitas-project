import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper to generate slug from name
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

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
      // Redirect /shop?category=slug to /category/slug
      const newUrl = new URL(`/category/${category}`, request.url);
      // Preserve other query params (like page)
      searchParams.forEach((value, key) => {
        if (key !== 'category') {
          newUrl.searchParams.set(key, value);
        }
      });
      return NextResponse.redirect(newUrl, 301);
    }

    if (brand) {
      // For brand, we need to fetch the brand name and convert to slug
      // Since we can't do async operations in middleware easily, we'll redirect to a handler
      // For now, redirect to /shop with brand query (we'll handle this in the page)
      // Actually, let's keep brand as query param for now since we need the ID
      // But we should create a mapping or use the brand ID directly
      // For SEO, we'll redirect to /brand/{slug} but we need the brand name
      // Since middleware can't fetch data, we'll handle this in the page component
      // For now, keep the redirect logic simple
    }
  }

  // Redirect legacy /product/... to official /shop/... (e.g. /product/slug, /product/slug/reviews)
  if (pathname.startsWith('/product/')) {
    const rest = pathname.slice('/product'.length) || '/';
    const newUrl = new URL(`/shop${rest}`, request.url);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl, 301);
  }

  // Redirect old /products/slug (string slug) to /shop/slug; keep /products/[id] for numeric ID
  if (pathname.startsWith('/products/')) {
    const segment = pathname.replace(/^\/products\/?/, '');
    if (segment && !/^\d+$/.test(segment)) {
      const newUrl = new URL(`/shop/${segment}`, request.url);
      newUrl.search = request.nextUrl.search;
      return NextResponse.redirect(newUrl, 301);
    }
  }

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
