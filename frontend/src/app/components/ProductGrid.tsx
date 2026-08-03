import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

/**
 * The one canonical product grid for the whole catalog (home rails, shop, category, brand,
 * offres, packs, favoris…). Fixed responsive columns + gaps so every product surface lines up
 * and skeletons match exactly (zero CLS). 2 → 2 → 3 → 4 columns.
 *
 * ── TWO PER ROW ON PHONES — THIS REVERSES AN EARLIER OWNER DECISION ───────────────────────
 * It was `grid-cols-1`, chosen deliberately because "the redesigned card is rich (brand, rating,
 * chips) and reads far better full-width". Changed on 2026-08-03 against the owner's newer and
 * more emphatic instruction — "the product card height is so long, we can use the WIDTH better
 * than the height", "maximise the compactness", "all users are from mobile". If the full-width
 * card is wanted back, this is a one-word change and nothing else depends on it.
 *
 * Three things make the reversal safe now that did not hold when 1-up was chosen:
 *
 *   1. THE CARD IS NO LONGER RICH. It lost two of its six body rows (the savings pill moved onto
 *      the price line, the third trust chip is gone) and its image frame went square → 5:4. The
 *      justification for 1-up was the card's density, and that density is gone.
 *
 *   2. IT FIXES A LIVE IMAGE BUG. PackCardImage declares `sizes="(max-width: 640px) 46vw, …"`,
 *      which was never updated when the grid went to one column. At 390px a 1-up card is 358px
 *      wide = 92vw, so the browser was asked for 179px and served a 256w file into a 358px box —
 *      every product image on every mobile rail rendering at a ~1.4x upscale (worse on a 2x
 *      screen, which is most phones). A 2-up card is 173px = 44.4vw, so `46vw` becomes correct
 *      and the images get sharper while also getting SMALLER to download.
 *
 *   3. MEASURED: the four homepage rails go from 11,307px to roughly 4,600px of document —
 *      about a third of the mobile page length, on the surface the owner says all the traffic
 *      uses.
 */
export function ProductGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
