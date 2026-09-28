import type { Product } from '@/types';

/** One robots decision for the canonical, crawler and no-subcategory product routes. */
export function productRobots(product: Pick<Product, 'publier' | 'seo'>): { index: boolean; follow: boolean } {
  const publier = product.publier as number | boolean | undefined;
  // Older API projections omit publier, but /product_details itself only returns published rows.
  const isPublished = publier === undefined || publier === 1 || publier === true;
  return {
    index: isPublished && (product.seo?.robots?.index ?? true),
    follow: isPublished && (product.seo?.robots?.follow ?? true),
  };
}
