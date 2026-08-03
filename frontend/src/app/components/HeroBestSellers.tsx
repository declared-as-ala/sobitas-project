import Image from 'next/image';
import { ArrowRight, ChevronRight, Star } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';

/**
 * "Meilleures ventes" column beside the hero on wide screens (≥1280px).
 *
 * On a 1440–1920px display the hero previously left a large empty band; this turns that space into
 * three shoppable products above the fold, which is the single highest-intent slot on the site.
 * Below 1280px it is not rendered at all — Hero drops the grid column — so phones and tablets are
 * unaffected and pay nothing for it.
 *
 * SERVER COMPONENT, deliberately: it is above the fold and must not cost the LCP path any
 * JavaScript. Each row is ONE link to the product page, so there is no cart state, no client
 * handler, and no hydration here.
 *
 * DESIGN SYSTEM — A RANKED TOP 3 (DESIGN_SYSTEM v6 §4).
 *
 * Owner, 2026-08-03: "the one that shows the products beside the slides is not good, it's not
 * looking good." Four concrete faults, each fixed here:
 *
 *   1. NO RANK. It was three products in a box with nothing saying they were the best-selling
 *      three. The whole value of this slot is the ranking, so the ranking is now VISIBLE — 01/02/03
 *      in the compressed display face, which is also the cheapest possible way to make the panel
 *      look designed rather than generated.
 *   2. THE ORANGE SQUARE WAS A LIE. A cart glyph on a row that navigates to a product page is a
 *      false affordance, and three saturated orange squares stacked vertically were the loudest
 *      thing in the panel while carrying the least meaning. Replaced by a chevron in the faintest
 *      ink, which is what "this row goes somewhere" actually looks like.
 *   3. THE IMAGE WAS TOO BIG FOR THE ROW. At 112px it left ~150px for the name, so titles wrapped
 *      to three lines and every row read as a wall of text. 88px is the largest size that keeps
 *      the name to two lines at this column width, and two lines is what makes three rows scan.
 *   4. NO INTERNAL RHYTHM. Padding was `px-3` with `gap-3` and a 12px header — none of it on the
 *      grid. Now: 16px gutters, 16px gaps, 12/16px header padding, all multiples of 4/8.
 *
 * SERVER COMPONENT, deliberately: it is above the fold and must not cost the LCP path any
 * JavaScript. Each row is ONE link, so there is no cart state and no hydration here.
 *
 * COLOUR. The hero band is the page canvas now, so this panel no longer needs `.pt-plate` to climb
 * back out of a black stage — it is a plain `bg-elevated` card with a hairline, and every token in
 * it resolves in page scope in both themes with zero `dark:` classes.
 *
 * The price uses `text-brand` = #D53B04 (4.71:1 on white) — the action shade. brand-500 (#F8480C)
 * is 3.55:1 on white and is a GRAPHICAL accent only; it must never carry text.
 *
 * RATINGS: shown only when the product actually has reviews. This catalogue currently has none, and
 * rendering "0 avis" or an empty five-star row is negative social proof — worse than showing
 * nothing (the same reason the product page stopped printing "(0) · 0 avis").
 */

export type HeroBestSeller = {
  id: number | string;
  name: string;
  href: string;
  image?: string | null;
  /** Effective price in TND. */
  price?: number | null;
  /** Struck-through original price when the product is on promo. */
  oldPrice?: number | null;
  ratingValue?: number | null;
  reviewCount?: number | null;
};

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="flex items-center gap-px" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rounded
              ? 'h-3 w-3 fill-brand-500 text-brand-500'
              : 'h-3 w-3 fill-hairline text-hairline'
          }
        />
      ))}
    </span>
  );
}

export function HeroBestSellers({ products }: { products: HeroBestSeller[] }) {
  if (products.length === 0) return null;

  return (
    /* `pt-hero` matches the slider's height exactly, so the two columns are flush at every width —
       and because the height is definite, adding this column cannot shift the hero (CLS 0).
       `hidden xl:flex` keeps it out of the DOM below 1280px. */
    <aside
      aria-label="Meilleures ventes"
      className="pt-hero hidden flex-col overflow-hidden rounded-2xl border border-hairline bg-elevated xl:flex"
    >
      {/* The header is the panel's only tinted area — a 1px rule plus a sand fill, which is what
          separates it from the rows without spending a heading size on the job. */}
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-sunken px-4 py-3">
        <h2 className="pt-kicker text-ink-1">Meilleures ventes</h2>
        <span className="pt-kicker text-[10px] text-brand">Top 3</span>
      </div>

      {/* Rows share the remaining height evenly, and the footer link anchors the bottom so the
          panel reads as a finished block rather than a list that ran out. */}
      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-hairline">
        {products.slice(0, 3).map((p, i) => {
          const hasRating = (p.reviewCount ?? 0) > 0 && (p.ratingValue ?? 0) > 0;

          return (
            <li key={p.id} className="min-h-0 flex-1">
              <LinkWithLoading
                href={p.href}
                loadingMessage="Chargement..."
                className="group flex h-full items-center gap-4 px-4 transition-colors duration-200 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
              >
                {/* THE RANK. `aria-hidden` because the list order already conveys it to assistive
                    tech, and "01" announced before every product name is noise. Set in the
                    compressed display face at the SAME size as the price so the two read as a
                    matched pair bracketing the row. */}
                <span
                  aria-hidden="true"
                  /* `text-ink-3` (#6C6C73, 5.21:1), not `text-hairline`. A rank numeral set in the
                     boundary colour is 1.09:1 — a ghost. It carries information, so it clears AA
                     even though it is aria-hidden. */
                  className="w-6 shrink-0 text-center font-display font-compressed text-[1.375rem] font-extrabold leading-none tabular-nums text-ink-3 transition-colors duration-200 group-hover:text-brand"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* 88px. The tile + hairline give cut-out pack shots an edge on a white card;
                    without it they float with no boundary. */}
                <span className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-sunken">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt=""
                      width={88}
                      height={88}
                      /* Below the LCP element in priority terms: the hero banner must win the
                         network. These are small and lazy so they never compete for it. */
                      loading="lazy"
                      sizes="88px"
                      className="h-full w-full object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : null}
                </span>

                {/* line-clamp-2. At 88px the name gets ~170px, which fits two lines of 13px text —
                    and two lines is what lets three rows scan as a list instead of as prose. */}
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-1 transition-colors group-hover:text-brand">
                    {p.name}
                  </span>

                  {hasRating && (
                    <span className="flex items-center gap-1.5">
                      <Stars value={p.ratingValue as number} />
                      <span className="text-[11px] tabular-nums text-ink-3">({p.reviewCount})</span>
                    </span>
                  )}

                  {p.price != null && (
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-[1.0625rem] font-extrabold leading-none tabular-nums text-brand">
                        {Math.round(p.price)} DT
                      </span>
                      {p.oldPrice != null && p.oldPrice > p.price && (
                        <span className="text-[11px] tabular-nums text-ink-3 line-through">
                          {Math.round(p.oldPrice)} DT
                        </span>
                      )}
                    </span>
                  )}
                </span>

                {/* A chevron, not an orange cart square. This row NAVIGATES; a cart glyph promised
                    an action it never performed. */}
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand motion-reduce:transition-none"
                />
              </LinkWithLoading>
            </li>
          );
        })}
      </ul>

      <LinkWithLoading
        href="/shop"
        loadingMessage="Chargement..."
        className="group flex items-center justify-center gap-2 border-t border-hairline px-4 py-3.5 font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-1 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        Voir toute la boutique
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </LinkWithLoading>
    </aside>
  );
}

export default HeroBestSellers;
