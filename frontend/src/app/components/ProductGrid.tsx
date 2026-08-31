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
  as: Tag = 'div',
  role,
}: {
  children: ReactNode;
  className?: string;
  /**
   * The element to render. `div` for the rails, `ul` for a band that wants list semantics.
   *
   * ── WHY THIS PROP EXISTS AT ALL ─────────────────────────────────────────────────────────
   * Ventes flash wanted `<ul role="list">` — a rail's only "there is more" cue is visual, so a
   * list announces its size to a screen reader — and this component rendered a hard `<div>`. So
   * it copied the class string instead, and the copy immediately drifted: it shipped
   * `grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4` with `gap-2.5 sm:gap-3`. Two arbitrary
   * numbers (a 420px breakpoint that is on no scale, a 10px gap that is on no lattice) and a
   * MISSING `md` step, so at 768-1023px the flash band showed two columns while the identical
   * rail above it showed three.
   *
   * That is the exact failure the docblock above this one is about. A component that cannot be
   * reused in the one shape a caller needs does not prevent the fork — it guarantees it.
   */
  as?: 'div' | 'ul';
  /** Set alongside `as="ul"`: preflight's `list-style:none` makes Safari+VoiceOver drop list semantics. */
  role?: string;
}) {
  return (
    <Tag
      role={role}
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
