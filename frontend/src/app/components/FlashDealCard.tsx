'use client';

/**
 * A single deal in the Ventes Flash band.
 *
 * ── WHY THIS EXISTS AND ProductCard DOES NOT FIT ───────────────────────────────────────────
 * Owner: *"make it like a banner section, not a wall section."*
 *
 * The band sits between two rails of `ProductCard`, and it must not be as tall as they are — that
 * is the only thing separating a banner from a third section. `ProductCard` carries, in order: a
 * discount badge, a favourite button, the packshot, a brand row with a verified tick, a two-line
 * title, a price with a struck-through original AND a savings pill, a stock line, a delivery line,
 * and a full-width add-to-cart. Ten things, and a column layout from `sm` up, so it is ~250-300px
 * tall wherever it lands. Four of those is a section by definition.
 *
 * This card carries FOUR — packshot, name, price line, add — in a row that stays a row at every
 * width, so it measures ~104-122px. Same grid, same frame, same helpers, a third of the height.
 * That is the whole difference, and it is deliberately the ONLY difference: see the note at the
 * root for what happened when it was also a different SHAPE from its neighbours.
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
    /* ── THE ROOT IS A PLAIN DIV, AND THE LINK IS INSIDE IT ────────────────────────────────
       It used to be `<LinkWithLoading>` wrapping everything, with the add-to-cart `<button>` as a
       descendant. `LinkWithLoading` renders a real `<a>`, and `<button>` is interactive content,
       which `<a>`'s transparent content model forbids — invalid HTML that browsers are free to
       reparent. The measurable cost was in the accessible name: the card link computed to
       "Whey Isolate, 89 DT, 129 DT, Ajouter Whey Isolate au panier, lien" — the product name spoken
       twice and the link's purpose polluted by a control that is not part of it, on every card.

       The house structure (ProductCard) is this one: a non-focusable root that owns the frame and
       the hover group, the link scoped to the things that actually navigate, and the button as its
       SIBLING. */
    /* ── A ROW AT EVERY WIDTH, WHICH IS WHAT MADE THE BAND UNIFORM ────────────────────────
       Owner, 13/08/2026: "redesign the vente flash section to be kinda uniform with the landing
       page."

       This card and `ProductCard` — the card in the rails directly above and below it — were
       EXACTLY INVERTED at every width. ProductCard is `flex-row sm:flex-col`; this was
       `flex-col sm:flex-row`. So on a phone the best-seller rail showed image-left/text-right row
       cards and this band showed stacked columns, and from `sm` they swapped over. Two adjacent
       bands rendering the same kind of object in opposite shapes at every single width is the most
       literal form the complaint can take.

       Both halves of that inversion were also measurably wrong on their own terms:

         PHONES  the previous grid was `grid-cols-1` below 420px, so at 390px — the single most
                 common phone width in the traffic — four COLUMN cards stacked and the band
                 measured 1,227px: 1.36 viewport heights, for the band the owner had asked three
                 times to make smaller than a section. A column card is as tall as its width plus
                 its text; a row card's height does not depend on its width at all. Measured:
                 254px per card -> 104px, and the band 1,227px -> ~600px.

         1024px  `lg:grid-cols-4` starts here, which put four row cards in a 900px rail at 219px
                 each. The row shape needs ~264px (96px thumbnail + 48px control + a legible name),
                 so the name wrapped and the card grew to 181px against 122px at 1280. That minimum
                 is why the band overrides ProductGrid's middle steps to two columns rather than
                 copying 2 -> 3 -> 4 blindly — see the note on the grid in VentesFlashSection.

       So the fix is one direction, at all widths. On a phone it is now the same shape as the cards
       above and below it; from `sm` it stays a row while ProductCard becomes a column, and THAT is
       what keeps this band a banner — 122px of card instead of 254px — without it being built out
       of different parts than the rest of the page.

       The frame is the house recipe: `.pt-plate`, `rounded-2xl`, `border-hairline`, `shadow-sm`,
       `font-poppins`, `hover:shadow-lg` — character for character what ProductCard opens with. */
    /*
      `.pt-plate` IS KEPT EVEN THOUGH THERE IS NO LONGER A DARK SCOPE TO ESCAPE.

      It was added when this card sat inside a `.pt-slab` banner and used `bg-elevated`, which
      paints a light background but leaves the SLAB's ink inherited — every flash-deal title
      rendered at 1.70:1 on the live homepage, against a WCAG AA floor of 4.5:1. The banner has
      since gone light and then gone away entirely, so today this class re-points the token set at
      values it already had: a no-op.

      It stays because ProductCard opens with it too, and because the rule it encodes is the one
      that gets broken next time: a light surface nested in a dark scope must RE-ENTER page scope,
      never merely repaint its background. Painting the background alone changes what you see and
      not what you inherit.
    */
    <div className="pt-plate group relative flex h-full w-full min-w-0 flex-row items-center gap-3 overflow-hidden rounded-2xl border border-hairline p-3 font-poppins shadow-sm transition-shadow duration-200 ease-out [@media(hover:hover)]:hover:shadow-lg">
      <LinkWithLoading
        href={buildProductUrlPath(product)}
        loadingMessage="Chargement"
        /* `ring-inset`, not `ring-offset-2`: the link is not the root, so an outset ring would be
           clipped by the root's `overflow-hidden`. */
        className="flex min-w-0 flex-1 flex-row items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        {/* THE THUMBNAIL IS A FIXED SIZE, AND IT IS THE BAND'S HEIGHT DIAL.
            80px on phones, 96px from `sm` — up from a flat 64, which measured correct but read as
            a favicon beside the text. Because the row layout decoupled card height from card
            WIDTH, this is now the only number that moves the band, which makes "bigger cards"
            a one-line change with a predictable cost: +16px of thumbnail is +16px of band.
            96 + 24px of padding = a 120px card, so the band lands ~273px — still inside the 320px
            banner ceiling the guard asserts. */}
        {/* A FIXED SQUARE, never an aspect ratio on a fluid width. That is the whole reason the
            band's height stopped tracking its own column count: 80/96 is 80/96 whether the card
            is 177px wide at 430px or 363px wide at 1920. The `aspect-square w-full` version this
            replaces made every card as tall as it was wide, which is why the 390px phone band
            measured 1,227px. */}
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
        /* 48px square at every width, up from a 44px-tall full-width bar below `sm`. The card is
           a row now, so there is no column for a full-width bar to sit under — and 48 clears the
           44px tap floor `measure-flash` asserts with room rather than exactly. */
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
