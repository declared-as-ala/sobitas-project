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
 * DESIGN SYSTEM — A PLATE ON THE BLACK STAGE (DESIGN_SYSTEM v5 §4).
 *
 * The hero band now carries `.pt-slab`, so everything inside it inherits near-black surfaces and
 * light ink. This panel carries `.pt-plate`, which restores PAGE token scope for its own subtree —
 * so it renders as a white card punched out of the black stage (19.26:1 against the band) while
 * every `text-ink-1` / `text-brand` / `border-hairline` inside it resolves against a light surface
 * again. In dark theme the plate becomes a recessed #141416 well and `--slab-plate-hairline` gives
 * it a real #767682 edge, because the plate-to-band fill difference there is only 1.29:1.
 *
 * That is why this file has no `dark:` classes at all any more: the band decides, not the
 * component. It previously hand-wrote `bg-white ring-black/[0.06] dark:bg-gray-900
 * dark:ring-white/10` and a `gray-*` divider on every row.
 *
 * The price uses `text-brand`, which on a plate is #D53B04 (4.71:1) — the action shade. brand-500
 * (#F8480C) is 3.55:1 on white and is a GRAPHICAL accent only; it must never carry text.
 *
 * Product images went 56px → 112px (owner: "bigger and clear for the user") — 112 rather than 96
 * because the rows are ~154px tall, so 96 left ~58px of dead vertical space per row. They sit on a faint
 * `gray-50` tile with a hairline, because these are cut-out pack shots on white — on a pure white
 * card they would dissolve into the surface with no edge at all.
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
      className="pt-plate pt-hero hidden flex-col overflow-hidden rounded-2xl ring-1 ring-hairline xl:flex"
    >
      <div className="border-b border-hairline px-4 py-3">
        <h2 className="font-display text-[13px] font-extrabold uppercase leading-none tracking-tight text-ink-1">
          Meilleures ventes
        </h2>
        {/* Same accent rule as the category card, so the two headings read as one system. */}
        <span aria-hidden="true" className="mt-2 block h-[3px] w-9 rounded-full bg-brand-500" />
      </div>

      {/* Rows share the remaining height evenly, and the footer link anchors the bottom so the
          panel reads as a finished block rather than a list that ran out. */}
      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-hairline">
        {products.slice(0, 3).map((p) => {
          const hasRating = (p.reviewCount ?? 0) > 0 && (p.ratingValue ?? 0) > 0;

          return (
            <li key={p.id} className="min-h-0 flex-1">
              <LinkWithLoading
                href={p.href}
                loadingMessage="Chargement..."
                className="group flex h-full items-center gap-3 px-3 transition-colors duration-200 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
              >
                {/* 112px, up from 56. The faint tile + hairline give cut-out pack shots an edge on
                    a white card; without it they float with no boundary. */}
                <span className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sunken ring-1 ring-hairline">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt=""
                      width={112}
                      height={112}
                      /* Below the LCP element in priority terms: the hero banner must win the
                         network. These are small and lazy so they never compete for it. */
                      loading="lazy"
                      sizes="112px"
                      className="h-full w-full object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : null}
                </span>

                {/* line-clamp-3, not 2: at 112px the image leaves ~150px for the name, and two
                    lines cut "…CHALLENGER…" mid-brand. The 154px row has room for a third. */}
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="line-clamp-3 text-[13px] font-semibold leading-snug text-ink-1 transition-colors group-hover:text-brand">
                    {p.name}
                  </span>

                  {hasRating && (
                    <span className="flex items-center gap-1.5">
                      <Stars value={p.ratingValue as number} />
                      <span className="text-[11px] tabular-nums text-ink-3">({p.reviewCount})</span>
                    </span>
                  )}

                  {p.price != null && (
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-display text-[15px] font-bold text-brand">
                        {Math.round(p.price)} DT
                      </span>
                      {p.oldPrice != null && p.oldPrice > p.price && (
                        <span className="text-[11px] text-ink-3 line-through">
                          {Math.round(p.oldPrice)} DT
                        </span>
                      )}
                    </span>
                  )}
                </span>

                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand shadow-sm transition-colors duration-200 group-hover:bg-brand-hover"
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
        className="flex items-center justify-center gap-1.5 border-t border-hairline px-4 py-3 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-sunken hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        Voir toute la boutique
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </LinkWithLoading>
    </aside>
  );
}

export default HeroBestSellers;
