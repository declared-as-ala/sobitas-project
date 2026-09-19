import type { Product, SubCategory } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

/**
 * A TAXONOMY SLUG, AS IT MAY APPEAR IN A URL: LOWERCASE.
 *
 * Middleware folds any path that carries a capital letter to lowercase with a 301 (see the
 * `/[A-Z]/.test(pathname)` block there — it exists because /whey-proteine, /Whey-Proteine and
 * /WHEY-PROTEINE each used to return 200). That makes lowercase the site's URL contract, and every
 * builder in this file has to honour it — because the DB does not.
 *
 * Measured on production 19/09/2026. `sous_categories` id 43 has slug `Intra-Workout`, typed by
 * hand in Filament (the slug field auto-generates `Str::slug` but accepts anything). Every builder
 * here emitted it verbatim, and the product route compared it verbatim, so:
 *
 *     /Intra-Workout/nutrabio-intra-blast-…-716-g   301 → /intra-workout/nutrabio-…   (middleware)
 *     /intra-workout/nutrabio-intra-blast-…-716-g   308 → /Intra-Workout/nutrabio-…   (this file)
 *
 * An infinite loop, for all 12 products in the category: the listing linked them, the sitemap
 * submitted 4 of them, and neither a shopper nor Googlebot could open one. Search Console files
 * it under "Redirect error" (33 pages, climbing since late August).
 *
 * Folding the segment where the URL is BUILT fixes every href, canonical, breadcrumb, JSON-LD and
 * sitemap entry at once; comparing through `sameUrlSlug` fixes the redirect that closed the loop.
 * Product slugs are not folded: none carries a capital today (0 of 11,368 in the 14/09 dump) and
 * the product lookup is by slug, so folding one that did would trade a loop for a 404.
 */
export function urlSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Do two slugs name the same URL segment? Case-insensitive, because middleware is. */
export function sameUrlSlug(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return urlSlug(a) === urlSlug(b);
}

/**
 * Build product link href (without base URL).
 * Uses new SEO-friendly format /{sousCategorySlug}/{productSlug}
 * Falls back to legacy /shop/{slug} if no subcategory.
 *
 * @param product - The product object
 * @returns The relative URL path (e.g., "/proteine-whey/gold-standard-whey")
 */
export function getProductLink(product: Product): string {
  const subCategory = getProductPrimarySubCategory(product);

  if (!subCategory?.slug) {
    return `/shop/${product.slug}`;
  }

  return `/${urlSlug(subCategory.slug)}/${product.slug}`;
}

/**
 * Build full product URL with base URL.
 */
export function getProductFullUrl(product: Product): string {
  return `${BASE_URL}${getProductLink(product)}`;
}

/**
 * Get the primary subcategory from a product.
 * Prefers the first sous_categorie, falls back to legacy sous_categorie.
 */
export function getProductPrimarySubCategory(product: Product): SubCategory | undefined {
  // Try multiple subcategories first (many-to-many relationship)
  if (product.sous_categories && product.sous_categories.length > 0) {
    return product.sous_categories[0];
  }
  // Fall back to legacy single subcategory
  return product.sous_categorie;
}

/**
 * Build the new SEO-friendly product URL.
 * Format: /{sousCategorySlug}/{productSlug}
 */
export function buildProductUrl(product: Product, baseUrl: string = BASE_URL): string {
  const subCategory = getProductPrimarySubCategory(product);
  
  if (!subCategory?.slug) {
    // Fallback to legacy /shop URL if no subcategory
    return `${baseUrl}/shop/${product.slug}`;
  }

  return `${baseUrl}/${urlSlug(subCategory.slug)}/${product.slug}`;
}

/**
 * Build product URL path (without base URL).
 * Format: /{sousCategorySlug}/{productSlug}
 */
export function buildProductUrlPath(product: Product): string {
  const subCategory = getProductPrimarySubCategory(product);

  if (!subCategory?.slug) {
    return `/shop/${product.slug}`;
  }

  return `/${urlSlug(subCategory.slug)}/${product.slug}`;
}

/**
 * Build canonical URL for a product.
 * Always uses the new SEO-friendly format.
 */
export function buildProductCanonicalUrl(product: Product, baseUrl: string = BASE_URL): string {
  return buildProductUrl(product, baseUrl);
}

/**
 * Build legacy shop URL for a product (for redirects).
 * Format: /shop/{productSlug}
 */
export function buildLegacyShopUrl(product: Product): string {
  return `/shop/${product.slug}`;
}

/**
 * Check if a subcategory slug is a known category route that might conflict.
 * These are routes that exist at the root level that shouldn't be intercepted.
 */
export function isReservedRouteSlug(slug: string): boolean {
  const reservedSlugs = [
    'shop',
    'blog',
    'brands',
    'brand',
    'category',
    'cart',
    'checkout',
    'account',
    'favoris',
    'packs',
    'offres',
    'faqs',
    'contact',
    'login',
    'register',
    'verify-email',
    'verify-phone',
    'verify-account',
    'reset-password',
    'forgot-password',
    'order-confirmation',
    'product',
    'products',
    'page',
    'proteine-sousse',
    'qui-sommes-nous',
    'mentions-legales',
    // Public member profiles (/membres/{id}). Caught by check-reserved-routes on the very first
    // build after the route was added: without this the middleware rewrites /membres to
    // /x-crawler/category/membres, which resolves category → brand → CMS page, finds none, and
    // serves Googlebot a 404 for a route that answers 200 to a browser.
    'membres',
    // Missing here meant middleware rewrote /pack-builder to /x-crawler/category/pack-builder,
    // which resolves category → brand → CMS page, found none, and served Googlebot a 404 +
    // noindex for a page that returns 200 to every human. Verified live before the fix:
    //   bot   → 404, robots: noindex, no canonical
    //   human → 200, "Composez votre pack — Protéine Tunisie"
    // scripts/check-reserved-routes.mjs now fails the build if this list drifts from app/ again.
    'pack-builder',
    // Caught by that same check on its first build — which is the point of having it.
    'partenaires',
    /*
     * /avis/{token} — the per-order review page. Same defect as /pack-builder, and it survived
     * check-reserved-routes.mjs because that check only looks at top-level segments that hold a
     * page.tsx DIRECTLY. `avis/` holds no page of its own, only `avis/[token]/page.tsx`, so the
     * segment was invisible to it while being very much a real route.
     *
     * Verified on production 18/08/2026, /avis/zz-test-123:
     *   human → 200
     *   bot   → 404   (rewritten to /x-crawler/product/avis/{token}, which is not a product)
     *
     * Found by rule L2 of scripts/check-indexability-live.mjs — "browser and Googlebot agree" —
     * which is the rule that exists because a status that differs by user-agent is invisible to
     * every check run from a browser.
     */
    'avis',
    /*
     * 'x-crawler' — the rewrite TARGET, reserved so it can never be rewritten a second time.
     *
     * Middleware sends crawler user-agents from /shop to /x-crawler/shop. A rewrite is supposed to
     * be internal and not re-enter middleware; on a local production build it does. On re-entry the
     * path /x-crawler/shop matched the two-segment product rule, was rewritten AGAIN to
     * /x-crawler/product/x-crawler/shop, and 404'd — so the boutique answered Googlebot 404 on any
     * cold cache. Reserving the segment makes the second pass a no-op, which is the correct
     * behaviour either way: /x-crawler/* is never a category or a product.
     *
     * check-reserved-routes.mjs skips this segment when it enumerates real routes, so listing it
     * here is additive and cannot make that check drift.
     */
    'x-crawler',
    'api',
    'admin',
    '_next',
    'sitemap',
    'robots',
    'sw',
    'manifest',
    'icon',
    'apple-touch-icon',
    'favicon',
  ];
  
  return reservedSlugs.includes(slug.toLowerCase());
}

/**
 * Validate that a product actually belongs to the claimed subcategory.
 * Returns true if the product's subcategory matches the URL slug.
 */
export function isProductInSubCategory(product: Product, claimedSubCategorySlug: string): boolean {
  const subCategory = getProductPrimarySubCategory(product);
  
  if (!subCategory) {
    return false;
  }

  return sameUrlSlug(subCategory.slug, claimedSubCategorySlug);
}

/**
 * Get the full breadcrumb trail for a product.
 * Returns array of { name, url } objects.
 */
export function getProductBreadcrumbs(product: Product): Array<{ name: string; url: string }> {
  const breadcrumbs: Array<{ name: string; url: string }> = [
    { name: 'Accueil', url: '/' },
    { name: 'Boutique', url: '/shop' },
  ];
  
  const subCategory = getProductPrimarySubCategory(product);
  
  if (subCategory?.categorie) {
    breadcrumbs.push({
      name: subCategory.categorie.designation_fr || subCategory.categorie.slug,
      url: `/${urlSlug(subCategory.categorie.slug)}`,
    });
  }

  if (subCategory?.slug) {
    breadcrumbs.push({
      name: subCategory.designation_fr || subCategory.slug,
      url: `/${urlSlug(subCategory.slug)}`,
    });
  }
  
  breadcrumbs.push({
    name: product.designation_fr || product.slug,
    url: buildProductUrlPath(product),
  });
  
  return breadcrumbs;
}

/**
 * Extract product slug from either new or legacy URL format.
 * Handles: /{sousCategorySlug}/{productSlug} or /shop/{productSlug}
 */
export function extractProductSlugFromUrl(pathname: string): string | null {
  // Remove leading/trailing slashes
  const cleanPath = pathname.replace(/^\/|\/$/g, '');
  const segments = cleanPath.split('/');
  
  if (segments.length === 2 && segments[0] === 'shop') {
    // Legacy format: /shop/{productSlug}
    return segments[1];
  }
  
  if (segments.length === 2) {
    // New format: /{sousCategorySlug}/{productSlug}
    return segments[1];
  }
  
  return null;
}

/**
 * Get the subcategory slug from a new-format URL.
 * Returns null for legacy format or invalid URLs.
 */
export function extractSubCategorySlugFromUrl(pathname: string): string | null {
  const cleanPath = pathname.replace(/^\/|\/$/g, '');
  const segments = cleanPath.split('/');
  
  // Skip legacy /shop format
  if (segments[0] === 'shop') {
    return null;
  }
  
  if (segments.length === 2) {
    const subCatSlug = segments[0];
    // Make sure it's not a reserved route
    if (!isReservedRouteSlug(subCatSlug)) {
      return subCatSlug;
    }
  }
  
  return null;
}
