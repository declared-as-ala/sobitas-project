import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

/**
 * The one canonical product grid for the whole catalog (home rails, shop, category, brand,
 * offres, packs, favoris…). Fixed responsive columns + gaps so every product surface lines up
 * and skeletons match exactly (zero CLS). 2 → 2 → 3 → 4 columns.
 *
 * ── ONE PER ROW ON PHONES, AS A HORIZONTAL ROW ────────────────────────────────────────────
 * This column count has now been changed three times, so the reasoning is worth stating once
 * properly instead of re-deriving it.
 *
 *   1-up, TALL card   the original. ~500px per product on a phone, because a full-width card
 *                     puts a full-width IMAGE above the text. Four products = 2,235px.
 *   2-up, tall card   fixed the length (910px) and broke the card: at 173px the title, the
 *                     stock label and the CTA all truncated — "Ajouter au p…". The owner's
 *                     word was "squeezed", and they were right.
 *   1-up, ROW card    what ships. The image is 124px on the LEFT and the text runs beside it,
 *                     so the card is as tall as its CONTENT (~180px) rather than as tall as a
 *                     full-width image. Four products ≈ 750px.
 *
 * That is the resolution of what looked like a conflict in the brief — "it's okay to show one
 * product under each other, but don't make the card so big". A one-column grid does not have to
 * mean a tall card; it only did because the card was always laid out vertically. The layout
 * switch lives on ProductCard itself (`flex-row sm:flex-col`), so the grid just counts columns.
 *
 * It also keeps the image `sizes` string honest. PackCardImage declares
 * `(max-width: 640px) 46vw`; at 1-up-vertical the card was 92vw, so the browser was asked for
 * 179px and served a 256w file into a 358px box — every mobile product image at a ~1.4x upscale.
 * The 124px row thumbnail is well UNDER 46vw, so the declaration is now conservative rather than
 * wrong, and the bytes drop again.
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
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
