import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
import { productImageFrame } from '@/util/productCardFrame';
import type { ProductImageMode } from '@/util/productImagePresentation';

/**
 * Loading placeholder mirroring ProductCard's real layout (image, 2-line title, price,
 * add-to-cart) so the skeleton→card swap causes zero layout shift.
 *
 * The image box comes from the SHARED frame definition (util/productCardFrame.ts) rather than a
 * second hardcoded copy — the two had already drifted, leaving cover-mode cards shifting on load.
 * Surface treatment must stay in lockstep with ProductCard's root element.
 */
export function ProductCardSkeleton({ mode = 'contain' }: { mode?: ProductImageMode }) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:rounded-2xl">
      <Skeleton className={cn('w-full rounded-none', productImageFrame(mode))} />
      <div className="flex flex-1 flex-col gap-2 px-3 py-3 sm:gap-2.5 sm:px-4 sm:py-4">
        {/* Title: two lines reserving ~40px, matching the card's min-h-[2.5rem] title box. */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-auto h-6 w-24" />
        <div className="mt-1 border-t border-gray-100 pt-2.5 dark:border-gray-800 sm:pt-3">
          <Skeleton className="h-11 w-full rounded-lg sm:rounded-xl" />
        </div>
      </div>
    </div>
  );
}
