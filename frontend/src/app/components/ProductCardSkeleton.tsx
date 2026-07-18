import { Skeleton } from '@/app/components/ui/skeleton';

/**
 * Loading placeholder that mirrors ProductCard's real layout (image, 2-line title,
 * price, add-to-cart button) so swapping skeleton → card causes zero layout shift.
 * The image box matches PackCardImage's contain-mode frame (aspect-[4/5] on narrow
 * 2-col grids, aspect-[3/2] from sm+) so the skeleton→card swap doesn't shift layout.
 * Pair with <ProductGrid> for lists.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden rounded-xl lg:rounded-2xl bg-white dark:bg-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      <Skeleton className="aspect-[4/5] sm:aspect-[3/2] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 px-3 py-3 sm:gap-2.5 sm:px-4 sm:py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-auto h-6 w-24" />
        <div className="mt-1 border-t border-gray-100 pt-2.5 dark:border-gray-700 sm:pt-3">
          <Skeleton className="h-11 w-full rounded-lg sm:rounded-xl" />
        </div>
      </div>
    </div>
  );
}
