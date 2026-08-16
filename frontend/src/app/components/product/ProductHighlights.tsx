/**
 * The benefits panel — the short list of claims, directly under the title.
 *
 * ── WHAT THE OWNER ASKED FOR ────────────────────────────────────────────────────────────────
 * 16/08/2026, holding a reference storefront beside our page. The reference's most distinctive
 * element is a small highlighted box of five or six bullets sitting between the product name and
 * the price — the first thing the eye lands on and the reason the layout reads as a product page
 * rather than a catalogue row.
 *
 * We had the identical sentences. "24 g de protéines", "1 g de sucre", "100 % des protéines sont
 * issues de caséine micellaire" — all of them, on the page, in the right language. They were grey
 * bullets inside a collapsed accordion, under a `max-h-60` clamp, below a specification table,
 * behind a "Lire plus" button, roughly 1,400 pixels down a phone screen. Nothing needed writing;
 * something needed MOVING. See util/productHighlights.ts for the extraction and its guards.
 *
 * ── WHY IT IS NOT A CARD ────────────────────────────────────────────────────────────────────
 * A bordered card here would be the fourth stacked rectangle in the buy column (gallery, panel,
 * price box, trust row) and the column stops reading as one thought. It is a tinted plate with a
 * brand rule down its leading edge instead: enough weight to be the first thing scanned, not enough
 * to compete with the price directly below it.
 *
 * `border-s-2` rather than `border-l-2` — the rule follows the writing direction, which matters
 * because this site serves Arabic product pages under the same components.
 */
import { Check } from 'lucide-react';
import type { ProductHighlight } from '@/util/productHighlights';

export function ProductHighlights({
  highlights,
  className = '',
}: {
  highlights: ProductHighlight[];
  className?: string;
}) {
  if (highlights.length === 0) return null;

  return (
    <ul className={`space-y-1.5 rounded-xl border-s-2 border-brand bg-sunken px-4 py-3 ${className}`}>
      {highlights.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2 sm:text-sm">
          {/*
            `mt-[3px]` optically centres a 14px glyph against a 13.5px cap height — without it the
            tick sits visibly high against the first line of a two-line benefit. Five of these stack,
            so the drift is not subtle.
          */}
          <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={3} aria-hidden="true" />
          <span className="min-w-0">
            {item.lead && <strong className="font-semibold text-ink-1">{item.lead}</strong>}
            {item.lead && item.text ? ' ' : ''}
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
