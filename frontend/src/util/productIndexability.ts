import type { Product } from '@/types';
import { seoRobots, type SeoRobots } from '@/util/robotsDirectives';

/**
 * One robots decision for the canonical, crawler and no-subcategory product routes.
 *
 * Returned through `seoRobots` so the page keeps `max-image-preview:large`: Next.js replaces the
 * root layout's `robots.googleBot` whenever a page sets its own `robots`, and product pages host
 * the large majority of our Google Images traffic (953 ranking pages, 05/10/2026).
 */
export function productRobots(product: Pick<Product, 'publier' | 'seo'>): SeoRobots {
  const publier = product.publier as number | boolean | undefined;
  // Older API projections omit publier, but /product_details itself only returns published rows.
  const isPublished = publier === undefined || publier === 1 || publier === true;
  return seoRobots(
    isPublished && (product.seo?.robots?.index ?? true),
    isPublished && (product.seo?.robots?.follow ?? true),
  );
}
