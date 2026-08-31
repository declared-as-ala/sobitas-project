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

  /*
   * ── ONE COLUMN OR TWO, DECIDED BY THE COPY ────────────────────────────────────────────────
   * The buy column is 744px wide at 1920 since the hero moved to 6/6, and on this catalogue a
   * benefit line is very often three words: "Soutien osseux", "Sans gluten", "Produit végétarien".
   * Five of those in a single column draw a 744px hairline under 90px of text, five times over,
   * which reads as a block that could not fill itself — the exact "empty white space" the owner
   * pointed at.
   *
   * When every line is SHORT the list goes two-up from `sm` and the rules become half as wide as
   * the lines are long. When any line is a real sentence — the reference storefront's shape,
   * "Digestion maximale : naturellement sans lactose, sans soja…" — two columns would set it at
   * roughly 35 characters a line, so it stays one column.
   *
   * 46 characters is the threshold and it is not arbitrary: at the 13.5px body size, half of the
   * narrowest buy column that still shows two columns (`sm`, 640px viewport) holds about 46.
   */
  const isCompact = highlights.every((item) => `${item.lead} ${item.text}`.trim().length <= 46);

  return (
    <ul
      className={`border-s-2 border-brand ps-4 ${
        isCompact ? 'grid gap-x-8 sm:grid-cols-2' : ''
      } ${className}`}
    >
      {highlights.map((item, i) => (
        <li
          key={i}
          className="border-b border-hairline py-2 text-[13.5px] leading-relaxed last:border-b-0 sm:text-sm"
        >
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
