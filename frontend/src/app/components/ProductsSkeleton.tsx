import { cn } from '@/app/components/ui/utils';
import { Skeleton as SkeletonLine } from '@/app/components/ui/skeleton';
import { ProductGrid } from '@/app/components/ProductGrid';
import { ProductCardSkeleton } from '@/app/components/ProductCardSkeleton';

/** Number of product cards to show while loading. */
const CARD_COUNT = 12;

export interface ProductsSkeletonProps {
  /** Show breadcrumb skeleton */
  showBreadcrumb?: boolean;
  /** Show filter pills row (2–4 pills) */
  showFilters?: boolean;
  /** Number of product cards (default 12) */
  cardCount?: number;
  className?: string;
}

/**
 * Skeleton for the shop/products list. Matches the real layout exactly — same container,
 * the shared <ProductGrid> columns/gaps, and <ProductCardSkeleton> cards — so the swap to
 * real content causes no layout shift. Server-safe (no 'use client').
 */
export function ProductsSkeleton({
  showBreadcrumb = true,
  showFilters = true,
  cardCount = CARD_COUNT,
  className,
}: ProductsSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {showBreadcrumb && (
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <SkeletonLine className="h-4 w-16" />
          <span className="text-gray-300 dark:text-gray-600" aria-hidden>/</span>
          <SkeletonLine className="h-4 w-24" />
        </div>
      )}

      {/* Page header */}
      <div className="mb-6 sm:mb-10">
        <SkeletonLine className="h-8 sm:h-10 w-3/4 max-w-md mb-2" />
        <SkeletonLine className="h-4 w-48" />
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <SkeletonLine className="h-11 flex-1 rounded-lg" />
        <SkeletonLine className="h-11 w-24 sm:w-28 rounded-lg" />
      </div>

      {/* Filter pills */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLine key={i} className="h-8 w-20 sm:w-24 rounded-full" />
          ))}
        </div>
      )}

      {/* Product grid — shared primitive, matches the real grid */}
      <ProductGrid>
        {Array.from({ length: cardCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </ProductGrid>
    </div>
  );
}

/** Skeleton for category page — same layout as products list. */
export function CategorySkeleton(props: ProductsSkeletonProps) {
  return <ProductsSkeleton showBreadcrumb showFilters {...props} />;
}

/** Skeleton for subcategory page — same as category (title + filters + grid). */
export function SubCategorySkeleton(props: ProductsSkeletonProps) {
  return <ProductsSkeleton showBreadcrumb showFilters {...props} />;
}
