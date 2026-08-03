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
    // Tokens, not `bg-white dark:bg-gray-900` + a hardcoded #E5E7EB border: this sits directly
    // beside real ProductCards (`.pt-plate border-hairline`) and a skeleton on a different surface
    // than the card it stands in for is a visible seam mid-grid.
    // Row on phones, column from `sm` — must mirror ProductCard's own `flex-row sm:flex-col`
    // exactly, or the skeleton→card swap changes the layout direction mid-load.
    <div className="pt-plate flex h-full w-full min-w-0 flex-row overflow-hidden rounded-2xl border border-hairline shadow-sm sm:flex-col">
      <div className="w-[124px] shrink-0 self-stretch sm:w-auto sm:self-auto">
        <Skeleton className={cn('w-full rounded-none', productImageFrame(mode))} />
      </div>
      {/* Geometry must match ProductCard's body EXACTLY or the skeleton→card swap shifts layout.
          Four rows now, not six — the savings pill moved onto the price row and the third trust
          chip is gone. Kept in lockstep by hand; there is no shared definition for the body. */}
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-3 sm:px-4 sm:py-4">
        {/* Title: two lines ≈ 44px, matching the card's min-h-[2.75rem] title box. */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {/* Price row (price + struck + savings pill all on one line) */}
        <Skeleton className="h-7 w-36" />
        {/* Meta row — one line */}
        <Skeleton className="h-3.5 w-2/3" />
        {/* CTA */}
        <Skeleton className="mt-auto h-[44px] w-full rounded-xl" />
      </div>
    </div>
  );
}
