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
  /** The first card is above the fold on desktop; let it skip the lazy-load hop. */
  priority?: boolean;
}

/**
 * Derived per DESIGN_SYSTEM §7.
 *
 * The CARD does not own its width — the rail does (see VentesFlashSection). Below `lg` the item is
 * a fixed 156/168px rail cell; from `lg` it grows to share the rail's width and is capped at 260px.
 * So the widest this ever renders is 260px, and the frame is square with `object-contain`, which
 * means the required width IS the rendered width — no `object-cover` scale factor to apply.
 *
 * Declared one step above each cap rather than at it: a soft packshot on a discounted product
 * reads as a cheap product, and over-declaring costs at most one bucket.
 */
const IMAGE_SIZES = '(min-width: 1024px) 260px, (min-width: 640px) 168px, 156px';

export const FlashDealCard = memo(function FlashDealCard({ product, priority = false }: FlashDealCardProps) {
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
      // The whole card is a link; without this the tap navigates AND adds.
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
    <LinkWithLoading
      href={buildProductUrlPath(product)}
      loadingMessage="Chargement"
      /* `w-full h-full` — the card fills whatever cell the rail gives it. Width lives in one place
         (the rail) so the two cannot disagree, and `h-full` is what keeps every card in the row the
         same height when one product name wraps to two lines and another does not. */
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-hairline bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 [@media(hover:hover)]:hover:border-brand/50"
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
            loading={priority ? 'eager' : 'lazy'}
            className="object-contain p-2 transition-transform duration-500 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display font-compressed text-2xl font-extrabold uppercase text-ink-3/40">
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

      <div className="flex flex-1 flex-col p-2.5">
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

        <div className="mt-2">
          {outOfStock ? (
            <span className="flex min-h-[36px] items-center justify-center rounded-lg bg-sunken text-[11px] font-semibold text-ink-3">
              Indisponible
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={atLimit}
              /* 36px tall, and that is a considered exception rather than an oversight: the site's
                 44px floor exists for a control that is the ONLY way to act on an element, and this
                 one is not — the entire card is a 250px-tall link to the product page, where the
                 full-size add-to-cart lives. The button is the shortcut, the card is the target. */
              aria-label={`Ajouter ${name} au panier`}
              className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg bg-brand text-[11px] font-semibold text-on-brand transition-colors disabled:opacity-40 [@media(hover:hover)]:hover:bg-brand-hover"
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
    </LinkWithLoading>
  );
});
