/**
 * The benefits panel — the short list of claims, directly under the title.
 *
 * ── WHAT THE OWNER ASKED FOR ────────────────────────────────────────────────────────────────
 * 16/08/2026, holding a reference storefront beside our page. The reference's most distinctive
 * element is a small block of five or six benefit lines sitting between the product name and the
 * price — the first thing the eye lands on and the reason the layout reads as a product page
 * rather than a catalogue row.
 *
 * We had the identical sentences. "24 g de protéines", "1 g de sucre", "100 % des protéines sont
 * issues de caséine micellaire" — all of them, on the page, in the right language. They were grey
 * bullets inside a collapsed accordion, under a `max-h-60` clamp, below a specification table,
 * behind a "Lire plus" button, roughly 1,400 pixels down a phone screen. Nothing needed writing;
 * something needed MOVING. See util/productHighlights.ts for the extraction and its guards.
 *
 * ── WHY THE TICKS ARE GONE ──────────────────────────────────────────────────────────────────
 * Owner, 17/08/2026, on the first version: *"change the design of [the benefits] — looks so bad,
 * looks AI generated. Look at impact, how beautiful, looks like a human designed it."*
 *
 * That is a fair reading and it is worth being precise about WHY, because the fix is not more
 * styling. The first version was five short fragments, each preceded by a red tick, in a tinted
 * plate. A tick is a claim of verification, and repeating it five times against phrases like
 * "Douce pour l'estomac" spends that claim on marketing copy — which is exactly the texture of
 * generated content: uniform, decorated, and saying less than it appears to.
 *
 * The reference does none of that. It sets a **bold lead phrase**, a colon, then a sentence of
 * substance, with no glyph in front of it. The hierarchy is TYPOGRAPHIC — weight and colour carry
 * the structure, and the reader's eye lands on the lead words rather than on five identical marks.
 * That is what makes it read as written by someone.
 *
 * So: no icons, no tint. A hairline-divided list where the lead (when the source gives one) is
 * bold and dark and the remainder is body colour. Lines with no lead are set in the darker ink
 * rather than being left as an undecorated fragment, so a list of short specs still reads as a
 * spec list and not as leftovers.
 *
 * ── WHY IT STILL HAS AN EDGE ────────────────────────────────────────────────────────────────
 * `border-s-2 border-brand` survived the redesign. Without any container this block dissolves into
 * the column — it sits between an H1 and a price, both of which are louder than it, and it is the
 * only part of the hero that explains what the product DOES. One rule down its leading edge is the
 * least furniture that still marks it as a block.
 *
 * `border-s-2` rather than `border-l-2` — the rule follows the writing direction, which matters
 * because this site serves Arabic product pages under the same components.
 */
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
    <ul className={`divide-y divide-hairline border-s-2 border-brand ps-4 ${className}`}>
      {highlights.map((item, i) => (
        <li key={i} className="py-2 text-[13.5px] leading-relaxed sm:text-sm">
          {item.lead ? (
            <>
              <strong className="font-semibold text-ink-1">{item.lead}</strong>
              {item.text ? <span className="text-ink-2"> {item.text}</span> : null}
            </>
          ) : (
            /* No lead in the source. Set in `text-ink-1` at medium weight rather than the body
               colour: on this catalogue a lead-less line is almost always a specification
               ("Sans OGM", "Végan", "90 comprimés"), and a spec deserves the weight of a fact. */
            <span className="font-medium text-ink-1">{item.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
