import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
import { productImageFrame } from '@/util/productCardFrame';
import type { ProductImageMode } from '@/util/productImagePresentation';

/**
 * Loading placeholder mirroring the GPT ProductCard layout (image, title, rating, price + savings,
 * trust chips, add-to-cart) so the skeleton→card swap causes minimal layout shift.
 *
 * The image box comes from the SHARED frame definition (util/productCardFrame.ts). Surface treatment
 * (border/radius/padding/gaps) must stay in lockstep with ProductCard's root.
 *
 * Note: the BRAND row is intentionally NOT reserved — brand names are resolved only on the homepage
 * (which does not render this skeleton), while the pages that DO show it (shop/favoris/packs) pass
 * no brand, so their cards have no brand row either.
 */
export function ProductCardSkeleton({ mode = 'contain' }: { mode?: ProductImageMode }) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className={cn('w-full rounded-none', productImageFrame(mode))} />
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        {/* Title: two lines ≈ 44px, matching the card's min-h-[2.75rem] title box. */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {/* Rating row */}
        <Skeleton className="h-3.5 w-24" />
        {/* Price + savings pill */}
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-32" />
        {/* Trust chips */}
        <Skeleton className="h-3.5 w-full" />
        {/* CTA */}
        <Skeleton className="mt-auto h-[46px] w-full rounded-xl" />
      </div>
    </div>
  );
}
