import Image from 'next/image';
import { ArrowRight, ShoppingCart, Star } from 'lucide-react';
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
 * The orange square carries a cart glyph to match the approved design; it is `aria-hidden` and the
 * row's accessible name is the product name, because the row navigates to the product page rather
 * than adding to the cart. A real add-to-cart here would mean shipping cart JS into the LCP path
 * for three products, which is the wrong trade for the fold.
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
              : 'h-3 w-3 fill-white/15 text-white/15'
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
      className="pt-hero hidden flex-col overflow-hidden rounded-2xl bg-gray-950 ring-1 ring-white/10 xl:flex dark:bg-black"
    >
      <h2 className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white">
        <span className="h-3 w-[3px] rounded-full bg-brand-500" aria-hidden="true" />
        Meilleures ventes
      </h2>

      {/* Rows share the remaining height evenly, and the footer link anchors the bottom so the
          panel reads as a finished block rather than a list that ran out. */}
      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-white/10">
        {products.slice(0, 3).map((p) => {
          const hasRating = (p.reviewCount ?? 0) > 0 && (p.ratingValue ?? 0) > 0;

          return (
            <li key={p.id} className="min-h-0 flex-1">
              <LinkWithLoading
                href={p.href}
                loadingMessage="Chargement..."
                className="group flex h-full items-center gap-3 px-3 transition-colors duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
              >
                {/* Light tile behind the pack shot: these are cut-out product photos on transparent
                    or white, which vanish against the near-black panel without it. */}
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt=""
                      width={56}
                      height={56}
                      /* Below the LCP element in priority terms: the hero banner must win the
                         network. These are small and lazy so they never compete for it. */
                      loading="lazy"
                      sizes="56px"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : null}
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90 transition-colors group-hover:text-white">
                    {p.name}
                  </span>

                  {hasRating && (
                    <span className="flex items-center gap-1.5">
                      <Stars value={p.ratingValue as number} />
                      <span className="text-[11px] tabular-nums text-white/45">({p.reviewCount})</span>
                    </span>
                  )}

                  {p.price != null && (
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-display text-sm font-bold text-brand-500">
                        {Math.round(p.price)} DT
                      </span>
                      {p.oldPrice != null && p.oldPrice > p.price && (
                        <span className="text-[11px] text-white/35 line-through">
                          {Math.round(p.oldPrice)} DT
                        </span>
                      )}
                    </span>
                  )}
                </span>

                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white transition-colors duration-200 group-hover:bg-brand-600"
                >
                  <ShoppingCart className="h-4 w-4" />
                </span>
              </LinkWithLoading>
            </li>
          );
        })}
      </ul>

      <LinkWithLoading
        href="/shop"
        loadingMessage="Chargement..."
        className="flex items-center justify-center gap-1.5 border-t border-white/10 px-4 py-3 text-[12px] font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        Voir toute la boutique
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </LinkWithLoading>
    </aside>
  );
}

export default HeroBestSellers;
