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
 * Now it is `surface="slab"` + `spacing="strip"`, directly under the hero — the same surface — so
 * the two fuse into one black mass separated by nothing but the automatic 1px rule. Both dead gaps
 * disappear, and "Livraison gratuite dès 300 DT / 100% authentique / Paiement à la livraison /
 * Support 7j/7" now lands BEFORE browsing. For a Tunisian cash-on-delivery shopper that is the
 * objection-handling order: the free-delivery threshold is a basket driver and COD is the payment
 * reassurance, and neither does much work after the products.
 *
 * COLOUR IS TOKENS, NOT LITERALS. The band scope supplies the surface, so there is not a single
 * `dark:` class here. The pale `bg-red-50` icon chip is deleted — a tinted square is meaningless on
 * black and it was the last decorative container in the row. Icons are bare lucide glyphs in
 * `text-brand`, which resolves to #FF8A4C on the slab (8.25:1 light / 6.11:1 dark).
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
    <Section surface="slab" spacing="strip" width="wide" aria-labelledby="features-heading">
      <h2 id="features-heading" className="sr-only">
        Pourquoi choisir Protéine Tunisie
      </h2>

      {/* 2x2 on phones, one row from md. `divide-*` draws the rules, so no cell needs its own
          background and the hairline colour comes from the band's scope in both themes. */}
      <ul className="grid grid-cols-2 divide-x divide-y divide-hairline md:grid-cols-4 md:divide-y-0">
        {features.map(({ Icon, title, description }) => (
          <li
            key={title}
            className="flex min-h-[68px] items-center gap-3 px-3 py-2.5 sm:gap-3.5 sm:px-5 md:min-h-0"
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
