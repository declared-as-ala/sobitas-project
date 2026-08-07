'use client';

/**
 * A single deal inside the Ventes Flash banner.
 *
 * ── WHY THIS EXISTS AND ProductCard DOES NOT FIT ───────────────────────────────────────────
 * Owner: *"make it like a banner section, not a wall section. Make the card smaller."*
 *
 * The banner's cards are ~156–176px wide. `ProductCard` carries, in order: a discount badge, a
 * favourite button, the packshot, a brand row with a verified tick, a two-line title, a price with
 * a struck-through original AND a savings pill, a stock line, a delivery line, and a full-width
 * add-to-cart. That is ten things. It is the right card for a 300px grid cell and it is the wrong
 * one at 168px — squeezing it there produces a denser card, which is the opposite of what was
 * asked for.
 *
 * ── AND WHY THIS IS NOT A SECOND ProductCard ───────────────────────────────────────────────
 * There WAS a `FlashProductCard` once. It was deleted because it had drifted into a buggy
 * near-duplicate: no i18n localisation, its own image handling, aroma variants ignored, and the
 * discount rendered twice. The lesson was not "never write a second card" — it was **never
 * re-derive shared logic**.
 *
 * So every number and string here comes from the SAME helper ProductCard calls:
 *
 *   price + promo state   `getPriceDisplay`      (never recomputed from prix/promo by hand)
 *   the displayed name    `localizedName`        (so it localises like everything else)
 *   the image URL         `getStorageUrl`
 *   the link              `buildProductUrlPath`
 *   sellable quantity     `getStockDisponible`
 *   the alt text          `buildProductAlt`
 *   adding to the cart    `useCartActions`       (the narrow hook, not `useCart()` — see the note
 *                                                 in ProductCard: the wide one re-renders every
 *                                                 card on every cart mutation, which is the INP fix)
 *
 * What this file owns is LAYOUT. If a rule about money, stock or naming ever needs writing here,
 * it belongs in the shared helper instead — that is the line the old fork crossed.
 */

import { memo, useCallback, useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Check } from 'lucide-react';
import { toast } from 'sonner';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { useCartActions, useCartQty } from '@/app/contexts/CartContext';
import { getStorageUrl } from '@/services/api';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import { buildProductUrlPath } from '@/util/productUrl';
import { buildProductAlt } from '@/util/productAlt';
import { useI18n } from '@/i18n/I18nProvider';
import { localizedName } from '@/i18n/content';

export interface FlashDealCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: any;
}

/**
 * Derived per DESIGN_SYSTEM §7, and RE-derived after the cards were allowed to fill the rail.
 *
 * The CARD does not own its width — the rail does (see VentesFlashSection). The `max-w-[260px]` cap
 * came off the rail items when the 352px left column was deleted, so four deals now divide the full
 * band rail. The frame is square with `object-contain`, so the required width IS the rendered width
 * — no `object-cover` scale factor to apply.
 *
 *   >=1664  rail = 1536, four cards → (1536 − 36)/4 = 375px          → 380px
 *   >=1024  rail = min(1536, vw − 64) → 25vw is the honest bracket   → 25vw
 *   >=640   rail = vw − 48, cards at basis 168 before they grow      → 180px
 *   below   full-bleed rail, basis 156                               → 170px
 *
 * Every bracket is declared one step ABOVE the requirement rather than at it: a soft packshot on a
 * discounted product reads as a cheap product, and over-declaring costs at most one bucket.
 *
 * WITHOUT this re-derivation the old string's flat `260px` would have made every desktop packshot
 * upscale ~1.29x at 1440 the moment the cap came off — the exact defect that is invisible in review
 * because the layout looks right and only the pixels are wrong.
 */
const IMAGE_SIZES = '(min-width: 1664px) 380px, (min-width: 1024px) 25vw, (min-width: 640px) 180px, 170px';

export const FlashDealCard = memo(function FlashDealCard({ product }: FlashDealCardProps) {
  const { locale } = useI18n();
  const { addToCart } = useCartActions();
  const inCartQty = useCartQty(product.id);
  const [justAdded, setJustAdded] = useState(false);

  const name = localizedName(product, locale);
  const priceDisplay = getPriceDisplay(product);
  const stockDisponible = getStockDisponible(product);
  const outOfStock = stockDisponible <= 0;
  const atLimit = !outOfStock && inCartQty >= stockDisponible;
  const image = product.image || (product.cover ? getStorageUrl(product.cover) : '');

  /* The one number the banner is actually selling. Same expression ProductCard uses — a rounded
     percentage off the ORIGINAL price, computed from the display object rather than from `promo`
     and `prix` directly, so a product whose promo has expired can never show a phantom discount. */
  const discount =
    priceDisplay.hasPromo && priceDisplay.oldPrice != null && priceDisplay.oldPrice > 0
      ? Math.round(((priceDisplay.oldPrice - priceDisplay.finalPrice) / priceDisplay.oldPrice) * 100)
      : 0;

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      /* The button is no longer INSIDE the link (see the root note), so a tap can no longer
         navigate as well as add. These two lines are kept anyway and they are not superstition:
         `LinkWithLoading` also wraps the image and the title, and a fast double-tap that lands on
         the button while the sibling link's navigation is already in flight would otherwise queue
         both. Cheap, and it costs nothing now that the nesting is valid. */
      e.preventDefault();
      e.stopPropagation();
      if (outOfStock) {
        toast.error('Rupture de stock');
        return;
      }
      if (inCartQty >= stockDisponible) {
        toast.error(`Stock insuffisant. Il reste ${stockDisponible - inCartQty} unité(s).`);
        return;
      }
      /* Aromas are handled the way ProductCard handles them — first variant when the product has
         them — rather than ignored. Ignoring them is one of the specific bugs that got the previous
         flash-card fork deleted, and it is silent: the line lands in the cart with no flavour and
         nobody notices until it ships. */
      const aromes = product.aromes;
      const firstAroma = Array.isArray(aromes) && aromes.length > 0 ? aromes[0] : null;
      addToCart(
        {
          ...product,
          name: product.name ?? product.designation_fr,
          price: priceDisplay.finalPrice,
          priceText: `${priceDisplay.finalPrice} DT`,
          image,
          ...(firstAroma && { selectedAroma: firstAroma }),
        },
        1
      );
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 900);
    },
    [outOfStock, inCartQty, stockDisponible, product, addToCart, priceDisplay.finalPrice, image]
  );

  return (
    /* ── THE ROOT IS A PLAIN DIV, AND THE LINK IS INSIDE IT ────────────────────────────────
       It used to be `<LinkWithLoading>` wrapping everything, with the add-to-cart `<button>` as a
       descendant. `LinkWithLoading` renders a real `<a>`, and `<button>` is interactive content,
       which `<a>`'s transparent content model forbids — invalid HTML that browsers are free to
       reparent. The measurable cost was in the accessible name: the card link computed to
       "Whey Isolate, 89 DT, 129 DT, Ajouter Whey Isolate au panier, lien" — the product name spoken
       twice and the link's purpose polluted by a control that is not part of it, on every card.

       The house structure (ProductCard) is this one: a non-focusable root that owns the frame and
       the hover group, the link scoped to the things that actually navigate, and the button as its
       SIBLING.

       ── AND THE FRAME IS NOW THE HOUSE RECIPE ──────────────────────────────────────────────
       `font-poppins rounded-2xl … shadow-sm` matches ProductCard exactly. These were the only cards
       on the homepage in a different typeface, at a different radius, with no shadow — part of the
       owner's "it doesn't look like the design system". It matters more now than it did: inside the
       deleted plate these sat white-on-white with a 1.16:1 hairline as their only edge, and on the
       sand band they are white-on-sand with a shadow, so the card is finally an object. */
    <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-hairline bg-elevated font-poppins shadow-sm transition-[box-shadow,border-color] [@media(hover:hover)]:hover:border-brand/50 [@media(hover:hover)]:hover:shadow-md">
      <LinkWithLoading
        href={buildProductUrlPath(product)}
        loadingMessage="Chargement"
        /* `ring-inset`, not `ring-offset-2`: the link is no longer the root, so an outset ring is
           clipped on three sides by the root's `overflow-hidden`. */
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
      <div className="relative aspect-square w-full overflow-hidden bg-sunken">
        {image ? (
          <Image
            src={image}
            /* The product, plus the LOCALISED name as an override — `buildProductAlt` prefers an
               explicit `seo.image_alt` / `alt_cover` from the admin and otherwise composes
               "name — brand — locality", so passing the product is what keeps a hand-written alt
               winning, and passing `name` is what keeps the fallback localised. */
            alt={buildProductAlt(product, { name })}
            fill
            sizes={IMAGE_SIZES}
            quality={80}
            /* ALWAYS LAZY. Two of these used to be `priority`, on the reasoning that "the first
               card is above the fold on desktop". It is not: this band is fourth on the homepage,
               roughly 1,500px down, and `content-visibility: auto` suppresses PAINT, not image
               fetches — so two below-the-fold packshots were competing for bandwidth inside the
               hero's LCP window at every width. CategoryRail carries this exact rule as a comment
               and obeys it. Deleting the prop is the fix; there is no width where it was right. */
            loading="lazy"
            className="object-contain p-2 transition-transform duration-500 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.04]"
          />
        ) : (
          /* `aria-hidden`: this is a watermark of the first letter, and it was being announced as a
             stray character immediately before the <h3> says the whole name — "W, Whey Isolate
             2kg". Hidden, its 40% alpha is legal decoration rather than 1.70:1 text. */
          <span
            className="flex h-full w-full items-center justify-center font-display font-compressed text-2xl font-extrabold uppercase text-ink-3/40"
            aria-hidden="true"
          >
            {name.charAt(0)}
          </span>
        )}

        {/* ONE badge, and it is the reason this card is in a flash banner at all. The band is
            headed VENTES FLASH, so a "FLASH" pill would repeat the heading once per card; the
            percentage is the part that differs per product. */}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-brand px-1.5 py-0.5 font-display text-[11px] font-bold tabular-nums leading-none text-on-brand">
            −{discount}%
          </span>
        )}

        {outOfStock && (
          <span className="pt-slab absolute inset-x-2 bottom-2 rounded-md px-2 py-1 text-center text-[10px] font-semibold text-ink-1">
            Rupture
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 pb-0">
        <h3 className="line-clamp-2 min-h-[2.1rem] text-[11px] font-semibold leading-snug text-ink-1 transition-colors [@media(hover:hover)]:group-hover:text-brand">
          {name}
        </h3>

        {/* Price and original on ONE line. Stacked, they cost another 18px on every card in the
            rail; side by side the struck-through figure is also directly comparable, which is the
            whole point of showing it. */}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-display text-[15px] font-bold tabular-nums leading-none text-brand">
            {Math.round(priceDisplay.finalPrice)} DT
          </span>
          {priceDisplay.hasPromo && priceDisplay.oldPrice != null && (
            <span className="text-[11px] tabular-nums text-ink-3 line-through">
              {Math.round(priceDisplay.oldPrice)} DT
            </span>
          )}
        </div>

      </div>

      </LinkWithLoading>

      {/* THE CONTROL IS A SIBLING OF THE LINK, NOT ITS CHILD. See the root note. */}
      <div className="p-2.5 pt-2">
        {outOfStock ? (
          <span className="flex min-h-[44px] items-center justify-center rounded-lg bg-sunken text-[11px] font-semibold text-ink-3">
            Indisponible
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            /* ── `aria-disabled`, NOT `disabled` ──────────────────────────────────────────
               `disabled` removed the button from the tab order and painted it at `opacity-40`,
               which groups fill and label together to roughly 1.9:1 — a control that still read
               "Ajouter" while being silently unavailable, and unreachable by keyboard so nobody
               could find out why. It also made the stock guard in `handleAdd` DEAD CODE, so
               CartContext's actual explanation ("Stock insuffisant. Il reste N unité(s).") could
               never reach anyone. `aria-disabled` keeps it focusable and clickable, so the guard
               finally fires and says the useful thing.

               44px, up from 36. The old note argued the card is the real target and the button is
               a shortcut — true, but the site's floor is not conditional, and this was the last
               control on the homepage under it. */
            aria-disabled={atLimit || undefined}
            aria-label={atLimit ? `Stock maximum atteint pour ${name}` : `Ajouter ${name} au panier`}
            className={`flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              atLimit
                ? 'cursor-not-allowed bg-sunken text-ink-3'
                : 'bg-brand text-on-brand [@media(hover:hover)]:hover:bg-brand-hover'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Ajouté
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                Ajouter
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
});
