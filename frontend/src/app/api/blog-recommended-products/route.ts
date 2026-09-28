import { NextRequest, NextResponse } from 'next/server';
import {
  getBestSellers,
  getProductsByCategory,
  getProductsBySubCategory,
  getProductDetails,
} from '@/services/api';
import type { Product } from '@/types';

const CACHE_MAX_AGE = 300; // 5 minutes
const MAX_PRODUCTS = 8;
const MIN_PRODUCTS = 4;

/**
 * GET /api/blog-recommended-products
 * Query: articleSlug (for cache key), categorySlug (optional), productSlugs (optional, comma-separated).
 * Returns 4–8 products: manual override by slug → category match → best sellers fallback.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = (searchParams.get('categorySlug') ?? '').trim();
    const productSlugsParam = (searchParams.get('productSlugs') ?? '').trim();
    const productSlugs = productSlugsParam
      ? productSlugsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let products: Product[] = [];

    // 1) Manual override: admin-set product slugs for this article
    if (productSlugs.length > 0) {
      const bySlug = await Promise.all(
        productSlugs.slice(0, MAX_PRODUCTS).map((slug) =>
          getProductDetails(slug).catch(() => null)
        )
      );
      products = bySlug.filter((p): p is Product => p != null && p.id != null);
    }

    // 2) Category match: a commerce bridge can point to either a top-level category or a
    // subcategory. Try both APIs before falling back so a /creatine article cannot silently show
    // generic best sellers merely because creatine is modelled as a subcategory in the catalogue.
    if (products.length < MIN_PRODUCTS && categorySlug) {
      try {
        const { products: catProducts } = await getProductsByCategory(categorySlug);
        const existingIds = new Set(products.map((p) => p.id));
        const extra = (catProducts ?? [])
          .filter((p) => p?.id && !existingIds.has(p.id))
          .slice(0, MAX_PRODUCTS - products.length);
        products = [...products, ...extra];
      } catch {
        try {
          const { products: subCategoryProducts } = await getProductsBySubCategory(categorySlug, {
            perPage: MAX_PRODUCTS,
          });
          const existingIds = new Set(products.map((p) => p.id));
          const extra = (subCategoryProducts ?? [])
            .filter((p) => p?.id && !existingIds.has(p.id))
            .slice(0, MAX_PRODUCTS - products.length);
          products = [...products, ...extra];
        } catch {
          // Keep any manual products and only use best sellers when no relevant product exists.
        }
      }
    }

    // 3) Fallback: best sellers only when the article produced no relevant recommendation.
    // A short, accurate rail converts better than four cards from unrelated categories.
    if (products.length === 0) {
      try {
        const best = await getBestSellers();
        const existingIds = new Set(products.map((p) => p.id));
        const extra = (best ?? [])
          .filter((p) => p?.id && !existingIds.has(p.id))
          .slice(0, MAX_PRODUCTS - products.length);
        products = [...products, ...extra];
      } catch {
        // ignore
      }
    }

    const list = products.slice(0, MAX_PRODUCTS);

    const response = NextResponse.json({ products: list });
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE}`
    );
    return response;
  } catch (err) {
    console.error('[blog-recommended-products]', err);
    return NextResponse.json(
      { products: [] },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } }
    );
  }
}
