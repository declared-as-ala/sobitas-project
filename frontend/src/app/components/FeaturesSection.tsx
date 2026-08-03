import { Truck, ShieldCheck, Banknote, Headset } from 'lucide-react';

/**
 * The trust / cash-on-delivery row — the FOOT OF THE HERO, not a band of its own.
 *
 * ── WHY IT IS NO LONGER A <Section> ───────────────────────────────────────────────────────
 * Owner, 2026-08-03: "the badges of shipping and those stuff — it looks like it's connected,
 * there's no spacing between them and the slider, and it looks like it's wide. No need to be wide.
 * Maybe you can make it as wide as the header up there."
 *
 * Both halves of that are the same cause. As a full-bleed `surface="sunken"` band its FILL ran to
 * the screen edges (so it read as "wide" next to a header whose content stops at the rail), and a
 * band has no gap to its neighbour by design (so it read as glued to the slider).
 *
 * It is now a CARD rendered inside the hero band: same container as the slider and the header, a
 * real `mt-4 lg:mt-6` above it, a hairline and a radius so it is visibly one object. It reads as
 * the hero's footer, which is also what it is editorially — the reassurances that answer the
 * banner's offer.
 *
 * Keeping it inside the hero band is what preserves the canvas ⇄ sunken alternation. As a separate
 * band on the page canvas it would have been the second white band in a row; see the sequence in
 * HomePageClient.
 *
 * ── MOBILE IS THE POINT ───────────────────────────────────────────────────────────────────
 * At 390px the four labels wrapped to two and three lines each ("PAIEMENT À LA LIVRAISON" took
 * three), so a 68px row became 96px of ragged text.
 *
 * The first attempt shortened the labels to one word each — "LIVRAISON", "PAIEMENT" — and that was
 * worse than the wrapping: "Livraison" alone says nothing a shopper did not assume, and the whole
 * value of this row is the SPECIFICS (free over 300 DT, pay on delivery). Cutting the words cut
 * the message.
 *
 * The type is what shrinks instead: 11px label / 10px description on phones against 14/12 from
 * `sm`. In a 2-up grid at 390px each cell has ~124px of text column, and "PAIEMENT À LA LIVRAISON"
 * in the compressed display face at 11px measures ~120px — one line. Every description also fits
 * one line at 10px. Nothing is truncated and nothing is lost.
 *
 * COLOUR IS TOKENS. Icons are `text-brand` = #D03B04 on sand: 4.51:1, which clears the 4.5:1 text
 * floor as well as the 3:1 graphical one. Labels are `text-ink-1` (17.9:1), descriptions
 * `text-ink-2` (6.7:1).
 *
 * Still a SERVER component with zero client JS.
 */

const features = [
  { Icon: Truck, title: 'Livraison rapide', description: 'Gratuite dès 300 DT' },
  { Icon: ShieldCheck, title: '100% authentique', description: 'Produits certifiés' },
  { Icon: Banknote, title: 'Paiement à la livraison', description: 'Ou par carte bancaire' },
  { Icon: Headset, title: 'Support 7j/7', description: 'Une équipe à l’écoute' },
] as const;

export function FeaturesSection() {
  return (
    <section aria-labelledby="features-heading" className="mt-4 lg:mt-6">
      <h2 id="features-heading" className="sr-only">
        Pourquoi choisir Protéine Tunisie
      </h2>

      {/* 2x2 on phones, one row from md.
          `gap-px` over `bg-hairline`, NOT `divide-x divide-y`. Tailwind's `divide-x` compiles to
          `& > * ~ *`, which in a TWO-COLUMN grid puts a left border on child 3 as well — a stray
          vertical rule hanging at the left edge of the second row. A 1px gap cannot be wrong about
          which edges are interior, because it only ever paints where two cells actually meet. */}
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline md:grid-cols-4">
        {features.map(({ Icon, title, description }) => (
          <li
            key={title}
            className="flex min-h-[56px] items-center gap-2 bg-sunken px-3 py-2.5 sm:min-h-[60px] sm:gap-3 sm:px-4 sm:py-3 md:min-h-0 lg:px-5"
          >
            <Icon
              className="h-4 w-4 shrink-0 text-brand sm:h-5 sm:w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-display font-compressed text-[11px] font-bold uppercase leading-tight tracking-[0.02em] text-ink-1 sm:text-sm sm:tracking-[0.03em]">
                {title}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-ink-2 sm:text-[12px]">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
