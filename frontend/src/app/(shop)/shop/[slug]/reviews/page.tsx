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
