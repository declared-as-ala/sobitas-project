import { notFound, permanentRedirect } from 'next/navigation';
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { buildProductUrlPath, getProductPrimarySubCategory } from '@/util/productUrl';

interface ProductReviewsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductReviewsPage({ params }: ProductReviewsPageProps) {
  const { id } = await params;
  const safeId = (id || '').trim();
  if (!safeId) notFound();

  // Resolve the product here so we can 301 ONCE straight to the canonical URL.
  // (Previously this redirected to /products/{id}#reviews, which 301s AGAIN to the canonical
  // /{sub}/{slug} and drops the #reviews fragment on the second hop.)
  let dest: string | null = null;
  try {
    const product = await getCachedProductDetails(safeId);
    if (product?.id && product.slug) {
      const sub = getProductPrimarySubCategory(product);
      dest = sub?.slug ? buildProductUrlPath(product) : `/shop/${encodeURIComponent(product.slug)}`;
    }
  } catch {
    /* resolution failed — fall back to the products resolver below (still single-purpose) */
  }

  permanentRedirect(dest ? `${dest}#reviews` : `/products/${encodeURIComponent(safeId)}#reviews`);
}
