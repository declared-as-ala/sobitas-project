'use client';

import { cn } from '@/app/components/ui/utils';

/** Number of product cards to show: 8 on mobile (2 cols), 12 on desktop (4 cols) */
const CARD_COUNT = 12;

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse', className)}
      aria-hidden
    />
  );
}

function ProductCardSkeleton() {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-[14px] sm:rounded-xl lg:rounded-2xl',
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        'shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
      )}
    >
      <div className="aspect-square w-full bg-gray-200 dark:bg-gray-700 animate-pulse min-h-[200px] sm:min-h-[240px] md:min-h-[280px]" />
      <div className="p-3 sm:p-4 space-y-2">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-5 w-20 mt-2" />
      </div>
    </div>
  );
}

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
 * Skeleton UI for the shop/products list page.
 * Matches layout: header (title + subtitle), optional filters pills, product grid.
 * Used in loading.tsx (route transition) and when isSearching in ShopPageClient.
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
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <SkeletonLine className="h-4 w-24" />
        </div>
      )}

      {/* Page header */}
      <div className="mb-4 sm:mb-10">
        <SkeletonLine className="h-8 sm:h-10 w-3/4 max-w-md mb-2" />
        <SkeletonLine className="h-4 w-48" />
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <SkeletonLine className="h-11 flex-1 rounded-lg" />
        <SkeletonLine className="h-11 w-24 sm:w-28 rounded-lg" />
      </div>

      {/* Filter pills */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLine key={i} className="h-8 w-20 sm:w-24 rounded-full" />
          ))}
        </div>
      )}

      {/* Product grid — same as ShopPageClient */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7">
        {Array.from({ length: cardCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for category page — same layout as products list. */
export function CategorySkeleton(props: ProductsSkeletonProps) {
  return <ProductsSkeleton showBreadcrumb showFilters {...props} />;
}
