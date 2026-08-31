/**
 * Five stars, filled to a rating.
 *
 * ── WHY A COMPONENT FOR TEN LINES ───────────────────────────────────────────────────────────
 * `ProductDetailClient` hand-rolled this row FIVE times — twice in the hero (once per render tree),
 * once in the reviews summary, once per review, once in the review form — with four different sizes
 * and three different empty-star colours. That is how the mobile hero ended up showing a different
 * rating treatment from the desktop hero for weeks without anyone noticing: nothing tied them
 * together.
 *
 * ── HALF STARS, AND WHY THEY MATTER HERE ────────────────────────────────────────────────────
 * Every previous copy used `Math.round(rating)`, so 4.5 and 4.4 both drew five solid stars and 4.4
 * was rounded UP into a claim the reviews do not support. A rating is a number a shop is legally on
 * the hook for; rounding it in the shop's favour is the one direction that is not a rendering
 * detail. The half star is drawn by clipping a filled row over the empty one, so the geometry is
 * exact at any value rather than snapped to a bucket.
 */
import { Star } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

const SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

export function StarRating({
  rating,
  size = 'md',
  className = '',
}: {
  rating: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating || 0));
  const glyph = SIZES[size];

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center', className)}
      role="img"
      aria-label={`Note : ${clamped.toFixed(1)} sur 5`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={cn(glyph, 'fill-current text-hairline')} />
        ))}
      </span>
      {/*
        The filled row, clipped to the exact fraction. `overflow-hidden` on a percentage width is
        what makes 4.4 render as 4.4 rather than as 4 or 5 — see the note above.
      */}
      <span
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-0.5 overflow-hidden"
        style={{ width: `${(clamped / 5) * 100}%` }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={cn(glyph, 'shrink-0 fill-current text-amber-400')} />
        ))}
      </span>
    </span>
  );
}
