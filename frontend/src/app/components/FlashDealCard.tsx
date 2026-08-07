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
 * Derived per DESIGN_SYSTEM §7. The frame is a fixed square — 80px on phones, 96px from `sm` —
 * with `object-contain`, so the required width IS the rendered width. Declared one step above the
 * larger of the two.
 *
 * A flat `sizes` is correct here rather than lazy: the packshot's box does not vary with the
 * viewport at all any more, so there is nothing for a `vw` bracket to express.
 */
const IMAGE_SIZES = '110px';

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

  const state = outOfStock ? 'out' : atLimit ? 'limit' : 'ok';

  return (
    /* ── THE CARD IS A ROW, NOT A COLUMN, AND THAT IS THE WHOLE BANNER FIX ─────────────────
       Owner, third pass: "make it a banner not a full section, just a small part of the landing
       page, make the cards smaller."

       The three previous attempts all cut chrome — band padding, heading scale, a countdown row —
       and the band still measured half a screen, because the chrome was never what made it tall.
       A VERTICAL card stacks a square packshot on top of a name, a price and a button, so its
       height is its width plus ~127px of text: at 172px wide that is a 299px card, and no amount
       of tightening the band around it gets below that.

       Turned on its side, the packshot is a fixed 64px thumbnail beside the text instead of above
       it, and the card's height stops depending on its width entirely — it is `max(64, text)` plus
       padding, about 84px. Measured across the band: 736px -> ~240px at 1920.

       It is also, on its own terms, the more honest shape for the job. A vertical card is for
       BROWSING a grid; this rail is four known offers the visitor scans and either takes or does
       not, and a scannable list of offers is a row. The band above it ("Les plus vendus") keeps the
       vertical card, so the two now read as different KINDS of thing, which is what a banner among
       sections is supposed to do.

       ── THE ROOT IS A PLAIN DIV, AND THE LINK IS INSIDE IT ────────────────────────────────
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
    <div className="group relative flex h-full w-full items-center gap-3 overflow-hidden rounded-2xl border border-hairline bg-elevated p-3 font-poppins shadow-sm transition-[box-shadow,border-color] [@media(hover:hover)]:hover:border-brand/50 [@media(hover:hover)]:hover:shadow-md">
      <LinkWithLoading
        href={buildProductUrlPath(product)}
        loadingMessage="Chargement"
        /* `ring-inset`, not `ring-offset-2`: the link is not the root, so an outset ring would be
           clipped by the root's `overflow-hidden`. */
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        {/* THE THUMBNAIL IS A FIXED SIZE, AND IT IS THE BAND'S HEIGHT DIAL.
            80px on phones, 96px from `sm` — up from a flat 64, which measured correct but read as
            a favicon beside the text. Because the row layout decoupled card height from card
            WIDTH, this is now the only number that moves the band, which makes "bigger cards"
            a one-line change with a predictable cost: +16px of thumbnail is +16px of band.
            96 + 24px of padding = a 120px card, so the band lands ~273px — still inside the 320px
            banner ceiling the guard asserts. */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sunken sm:h-24 sm:w-24">
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
                 hero's LCP window at every width. */
              loading="lazy"
              className={`object-contain p-1 transition-transform duration-500 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.06] ${
                outOfStock ? 'opacity-45' : ''
              }`}
            />
          ) : (
            /* `aria-hidden`: this is a watermark of the first letter, and it was being announced as
               a stray character immediately before the name — "W, Whey Isolate 2kg". */
            <span
              className="flex h-full w-full items-center justify-center font-display font-compressed text-xl font-extrabold uppercase text-ink-3/40"
              aria-hidden="true"
            >
              {name.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-ink-1 transition-colors sm:text-sm [@media(hover:hover)]:group-hover:text-brand">
            {name}
          </h3>

          {/* ── ONE LINE: PRICE, ORIGINAL, DISCOUNT ────────────────────────────────────────
              The discount moved off the packshot and onto this line. On a 64px thumbnail an
              absolutely-positioned badge covered a quarter of the product; beside the two prices
              it is where the eye is already comparing numbers, and it needs no space of its own.

              `Rupture` replaces the whole row when there is no stock, rather than being a fourth
              thing next to a price the visitor cannot act on. */}
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            {outOfStock ? (
              <span className="text-xs font-semibold text-ink-3">Rupture de stock</span>
            ) : (
              <>
                <span className="font-display text-base font-bold tabular-nums leading-none text-brand sm:text-lg">
                  {Math.round(priceDisplay.finalPrice)} DT
                </span>
                {priceDisplay.hasPromo && priceDisplay.oldPrice != null && (
                  <span className="text-xs tabular-nums text-ink-3 line-through">
                    {Math.round(priceDisplay.oldPrice)} DT
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded bg-brand px-1.5 py-px font-display text-[11px] font-bold tabular-nums leading-normal text-on-brand">
                    −{discount}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </LinkWithLoading>

      {/* ── THE CONTROL IS A SIBLING OF THE LINK, AND IT IS NOW ICON-ONLY ──────────────────
          A row has no full width to give a button, and it does not need to: the visible label
          "Ajouter" was repeated once per card beside a name that already says what is being added.
          44x44 is the site's floor and the icon carries it, with the product name in the ACCESSIBLE
          name so a screen reader's control list does not read four identical "Ajouter"s.

          IT STILL RENDERS WHEN THERE IS NO STOCK, as `aria-disabled` rather than `disabled`.
          `disabled` takes a control out of the tab order and made `handleAdd`'s two guards dead
          code, so CartContext's actual explanations — "Rupture de stock", "Stock insuffisant. Il
          reste N unité(s)." — could never be reached by anyone who tried. Now a tap explains
          itself, which is the entire reason those messages were written. */}
      <button
        type="button"
        onClick={handleAdd}
        aria-disabled={state !== 'ok' || undefined}
        aria-label={
          state === 'out'
            ? `${name} — rupture de stock`
            : state === 'limit'
              ? `Stock maximum atteint pour ${name}`
              : `Ajouter ${name} au panier`
        }
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-elevated ${
          state === 'ok'
            ? 'bg-brand text-on-brand [@media(hover:hover)]:hover:bg-brand-hover'
            : 'cursor-not-allowed bg-sunken text-ink-3'
        }`}
      >
        {justAdded ? (
          <Check className="h-5 w-5" aria-hidden="true" />
        ) : (
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
