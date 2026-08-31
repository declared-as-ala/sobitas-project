import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { buildProductUrlPath, getProductPrimarySubCategory } from '@/util/productUrl';

interface ProductReviewsPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Legacy /shop/:slug/reviews. 301 directly to the canonical product URL #reviews — no chain.
 */
export default async function ProductReviewsPage({ params }: ProductReviewsPageProps) {
  const { slug } = await params;
  const cleanSlug = (slug || '').trim();
  const safeSlug = encodeURIComponent(cleanSlug);
  let target = `/shop/${safeSlug}`;
  try {
    const product = await getCachedProductDetails(cleanSlug);
    if (product?.slug && getProductPrimarySubCategory(product)?.slug) {
      target = buildProductUrlPath(product);
    }
  } catch {
    // fall through
  }
  permanentRedirect(`${target}#reviews`);
}

/**
 * Middleware now answers this path BEFORE the page renders (see the "THREE-SEGMENT /shop PATHS"
 * block in middleware.ts) — a real 301, or 410 when the target is definitively gone. This route
 * survives only as the fail-open path for when the backend is unreachable and middleware
 * deliberately declines to guess.
 *
 * On that path `permanentRedirect()` degrades to `<meta http-equiv="refresh">` at HTTP 200, so the
 * metadata below is what a crawler would judge. noindex is the only safe answer for a URL whose
 * destination could not be resolved.
 */
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: true } };
}
