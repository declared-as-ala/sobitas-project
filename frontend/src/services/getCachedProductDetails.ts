import { cache } from 'react';

import {
  getProductDetails,
  fetchCategoryOrSubCategory,
  getArticleDetails,
  getPageBySlug,
  getAllBrands,
  getProductsByBrand,
} from '@/services/api';

/**
 * Dedupe `getProductDetails` within one RSC request (e.g. `generateMetadata` + page).
 * Import only from Server Components / server-only modules — not from client components.
 */
export const getCachedProductDetails = cache((slug: string) => getProductDetails(slug));

/**
 * Request-scoped dedupe for the OTHER resolvers every indexable route calls at least TWICE
 * (once in `generateMetadata`, once in the page body — and up to three times on /{slug},
 * which probes category -> brand -> CMS page in both).
 *
 * `apiFetch` only dedupes CONCURRENT in-flight GETs, so those sequential repeats were real
 * extra HTTP requests. Two consequences, both bad:
 *   1. They multiplied SSR traffic against the single shared per-IP bucket — self-inflicted 429s.
 *   2. They failed INDEPENDENTLY, so `generateMetadata` could 429 while the page body (a
 *      separate call, separately retried) succeeded. That is exactly how a page emitted
 *      HTTP 200 with a full product grid, a generic title and NO canonical — the duplicate,
 *      canonical-less shell Googlebot indexed.
 * With cache() both callers await ONE promise: one API call, and they succeed or fail together.
 *
 * These MUST live here rather than in api.ts: api.ts is also imported by client components
 * (BrandsSection.tsx, BrandsPageClient.tsx, AboutPageClient.tsx) where React `cache` has no
 * request scope. Those files must keep importing straight from '@/services/api'.
 *
 * Do NOT 'tidy' pack-builder/page.tsx or util/sitemapData.ts onto these — sitemap generation
 * runs outside a request scope, where React cache() has no store.
 */
export const getCachedCategoryOrSubCategory = cache((slug: string) => fetchCategoryOrSubCategory(slug));
export const getCachedArticleDetails = cache((slug: string) => getArticleDetails(slug));
export const getCachedPageBySlug = cache((slug: string) => getPageBySlug(slug));
export const getCachedAllBrands = cache(() => getAllBrands());

/**
 * Brand product listing, deduped per request.
 *
 * Needed by `generateMetadata` as well as the page body: a brand with zero products is a heading
 * and nothing to buy, which Google reads as a soft 404, so the metadata has to know the count to
 * decide `noindex`. Without cache() that would be a second identical API call on every brand page.
 */
export const getCachedProductsByBrand = cache((brandId: number) => getProductsByBrand(brandId));
