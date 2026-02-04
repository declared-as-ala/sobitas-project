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

  // Redirect old query-based category URLs to new clean URLs
  if (pathname === '/shop') {
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');

    if (category) {
      // Redirect /shop?category=slug to /shop/slug
      const newUrl = new URL(`/shop/${category}`, request.url);
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

  // Redirect old /products/[id] to /product/[id] (if it's actually a slug)
  if (pathname.startsWith('/products/')) {
    const slug = pathname.replace('/products/', '');
    const newUrl = new URL(`/product/${slug}`, request.url);
    return NextResponse.redirect(newUrl, 301);
  }

  return NextResponse.next();
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
