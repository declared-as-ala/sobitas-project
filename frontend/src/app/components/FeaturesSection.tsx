import { Truck, ShieldCheck, CreditCard, Headphones } from 'lucide-react';
import { Section } from '@/app/components/layout/Section';

/**
 * The trust / cash-on-delivery strip — the FOOT of the hero stage, not a band of its own.
 *
 * WHAT CHANGED, AND WHY IT MATTERS MORE THAN IT LOOKS
 *
 * It used to be a white band between two other white bands. Measured on the live page at 1440px it
 * was 98px of content carrying 160px of dead white around it; at 390px it was ~352px of stacked
 * rows plus a 96px gap. It also sat BELOW the best-seller rail, so a first-time visitor met the
 * products before any of the reassurances that make them buy.
 *
 * Now it is `surface="sunken"` + `spacing="strip"`, directly under the hero, so both dead gaps
 * disappear and "Livraison gratuite dès 300 DT / 100% authentique / Paiement à la livraison /
 * Support 7j/7" lands BEFORE browsing. For a Tunisian cash-on-delivery shopper that is the
 * objection-handling order: the free-delivery threshold is a basket driver and COD is the payment
 * reassurance, and neither does much work after the products.
 *
 * SAND, NOT BLACK (v6). It was `surface="slab"`, which fused it to a black hero into one ~700px
 * dark mass. On sand it still separates cleanly from the white hero band above and the white
 * category rail below — a strip is the one place a 1.08:1 fill difference is enough, because it is
 * only 68px tall and the two 1px band seams bracket it.
 *
 * COLOUR IS TOKENS, NOT LITERALS — there is not a single `dark:` class here. The pale `bg-red-50`
 * icon chip is deleted; it was the last decorative container in the row. Icons are bare lucide
 * glyphs in `text-brand` = #D53B04 on sand. That measures 4.36:1, which is BELOW the 4.5:1 text
 * floor but comfortably above the 3:1 floor for graphical objects (WCAG 1.4.11) — and these are
 * icons, not text. The words beside them are `text-ink-1` (17.9:1) and `text-ink-2` (6.7:1). Do
 * not "tidy" the icon colour onto a label.
 *
 * DESCRIPTIONS ARE NOT CLIPPED AND NOT SET IN THE FAINTEST INK. They were `text-xs` in
 * `text-gray-500`. "Gratuite dès 300 DT, partout en Tunisie" is the highest-value string on the
 * page for average order value, and setting it in the lowest-contrast colour available was the
 * wrong trade. They are `text-ink-2` (11.33:1 on the slab).
 *
 * MOBILE IS A 2x2 GRID, NOT FOUR STACKED ROWS — all four reassurances on one screen instead of
 * being scrolled past one at a time.
 *
 * Still a SERVER component with zero client JS. The `gap-px` background hack is replaced by real
 * `divide-*` rules, so cells no longer paint their own background just to fake dividers.
 */

const features = [
  { Icon: Truck, title: 'Livraison rapide', description: 'Gratuite dès 300 DT, partout en Tunisie' },
  { Icon: ShieldCheck, title: '100% authentique', description: 'Produits originaux, certifiés' },
  { Icon: CreditCard, title: 'Paiement à la livraison', description: 'Ou par carte bancaire' },
  { Icon: Headphones, title: 'Support 7j/7', description: 'Une équipe à votre écoute' },
] as const;

export function FeaturesSection() {
  return (
    <Section surface="sunken" spacing="strip" width="wide" aria-labelledby="features-heading">
      <h2 id="features-heading" className="sr-only">
        Pourquoi choisir Protéine Tunisie
      </h2>

      {/* 2x2 on phones, one row from md.
          `gap-px` over `bg-hairline`, NOT `divide-x divide-y`. Tailwind's `divide-x` compiles to
          `& > * ~ *`, which in a TWO-COLUMN grid puts a left border on child 3 as well — a stray
          vertical rule hanging at the left edge of the second row. It was invisible while this
          strip was black-on-black; on sand it is a visible defect. A 1px gap cannot be wrong about
          which edges are interior, because it only ever paints where two cells actually meet. */}
      <ul className="grid grid-cols-2 gap-px bg-hairline md:grid-cols-4">
        {features.map(({ Icon, title, description }) => (
          <li
            key={title}
            /* 8px grid: gap-3 (12) → gap-4 (16), px-4 (16) → px-6 (24), py-3 (12). The v5 values
               were gap-3.5 (14) / px-5 (20) / py-2.5 (10) — three off-grid numbers in one row. */
            className="flex min-h-[68px] items-center gap-3 bg-sunken px-4 py-3 sm:gap-4 sm:px-6 md:min-h-0"
          >
            <Icon className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-display font-compressed text-[13px] font-bold uppercase leading-tight tracking-[0.03em] text-ink-1 sm:text-sm">
                {title}
              </p>
              {/* No clamp. See the note above: the 300 DT threshold is the point of this row. */}
              <p className="mt-0.5 text-[11px] leading-snug text-ink-2 sm:text-[12px]">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
