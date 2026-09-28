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
import { useId } from 'react';
import { cn } from '@/app/components/ui/utils';

const SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
} as const;

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21 12 17.77 5.82 21 7 14.14 2 9.27 8.91 8.26 12 2';

export function StarRating({
  rating,
  size = 'md',
  className = '',
  ariaLabel,
  strokeWidth = 2,
  gapPx = 2,
}: {
  rating: number;
  size?: keyof typeof SIZES;
  className?: string;
  ariaLabel?: string;
  strokeWidth?: number;
  gapPx?: number;
}) {
  const clamped = Math.max(0, Math.min(5, rating || 0));
  const glyph = SIZES[size];
  const gap = gapPx * 24 / glyph;
  const width = 120 + 4 * gap;
  const clipId = useId();

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center', className)}
      role="img"
      aria-label={ariaLabel ?? `Note : ${clamped.toFixed(1)} sur 5`}
    >
      <svg width={5 * glyph + 4 * gapPx} height={glyph} viewBox={`0 0 ${width} 24`} aria-hidden="true">
        <defs><clipPath id={clipId}><rect width={(clamped / 5) * width} height="24" /></clipPath></defs>
        <g className="fill-current text-hairline" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
          {[0, 1, 2, 3, 4].map((i) => (
            <polygon key={i} points={STAR_POINTS} transform={`translate(${i * (24 + gap)} 0)`} />
          ))}
        </g>
        {/* Clip the filled row to the exact fraction, including the gaps between stars. */}
        <g className="fill-current text-amber-400" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" clipPath={`url(#${clipId})`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <polygon key={i} points={STAR_POINTS} transform={`translate(${i * (24 + gap)} 0)`} />
          ))}
        </g>
      </svg>
    </span>
  );
}
