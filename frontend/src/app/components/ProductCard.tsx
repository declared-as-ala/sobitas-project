'use client';

import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ShoppingCart, Heart, Flame, Star, BadgeCheck, CircleCheck, Truck, Shield, Mail } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PackCardImage } from '@/app/components/PackCardImage';
import { ProductRequestDialog } from '@/app/components/ProductRequestDialog';
import type { Product as ApiProduct } from '@/types';
import { useCartActions, useCartQty } from '@/app/contexts/CartContext';
import { useFavoritesActions, useIsFavorite } from '@/contexts/FavoritesContext';
import { getStorageUrl } from '@/services/api';
import { toast } from 'sonner';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible, getProductStockStatus } from '@/util/cartStock';
import { getProductImagePresentation } from '@/util/productImagePresentation';
import { buildProductUrlPath } from '@/util/productUrl';
import { buildProductAlt } from '@/util/productAlt';
import { useState, useMemo, memo, useCallback, startTransition } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { localizedField, localizedName } from '@/i18n/content';
type Product = ApiProduct | {
  id: number;
  name?: string;
  designation_fr?: string;
  price?: number | null;
  prix?: number;
  priceText?: string | null;
  image?: string | null;
  cover?: string;
  slug?: string;
  category?: string | null;
  new_product?: number;
  best_seller?: number;
  promo?: number;
  promo_expiration_date?: string;
};

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  badgeText?: string;
  variant?: 'default' | 'compact';
  showDescription?: boolean;
  hideCountdown?: boolean;
  imageContext?: 'default' | 'packs';
  /** Above-the-fold cards: paint immediately (no entrance fade) + eager-load the image for a faster LCP. */
  priority?: boolean;
  /**
   * `sizes` override for the packshot, for a surface whose grid is not ProductGrid's default.
   *
   * /shop renders 3-up at `lg` instead of 4-up, which makes a card 389px at 1280 against a
   * declared 205px — so without this the wider cards would have fetched the SAME small file and
   * rendered it softer. Left undefined everywhere else, which keeps the default string and the
   * current bytes on the homepage rails.
   */
  imageSizes?: string;
  /** Resolved brand name (e.g. "MUSCLETECH"). The grid payload only carries brand_id; the caller
   *  resolves it against the brands list. Omitted when unavailable → the brand row is hidden. */
  brandName?: string;
}

function toFavoriteProduct(product: Product): { id: number; designation_fr: string; slug?: string; cover?: string; prix?: number; promo?: number | null; promo_expiration_date?: string | null; qte?: number; rupture?: number } {
  const p = product as any;
  return {
    id: product.id,
    designation_fr: p.name || product.designation_fr || '',
    slug: product.slug,
    cover: product.cover,
    prix: p.prix ?? p.price ?? product.prix,
    promo: p.promo ?? undefined,
    // Carry expiry + quantity so /favoris shows the correct promo state and real stock (see FavoriteProduct).
    promo_expiration_date: p.promo_expiration_date ?? undefined,
    qte: p.qte,
    rupture: p.rupture,
  };
}

export const ProductCard = memo(function ProductCard({
  product,
  showBadge,
  badgeText,
  variant = 'default',
  showDescription = false,
  hideCountdown = false,
  imageContext = 'default',
  priority = false,
  imageSizes,
  brandName,
}: ProductCardProps) {
  const { locale } = useI18n();
  /*
   * NARROW HOOKS, NOT `useCart()` / `useFavorites()`. This is the INP fix and this component is
   * where it pays, because it is rendered 23 times on the homepage and ~40 on /shop.
   *
   * `useCart()` returns an object that changes on every cart mutation, and `useFavorites()` one
   * that changes on every heart tap. Both re-render EVERY consumer, so a single tap re-rendered
   * the entire grid plus the header — between the tap and the next paint, which is exactly what
   * INP measures. Field CWV said 408 ms and FAILED; lab TBT said 50 ms and "good", because TBT
   * only looks at page load and never presses anything.
   *
   * The actions never change identity, and the two subscriptions return a number and a boolean
   * for THIS product only, so React's Object.is bailout keeps the other 22 cards untouched.
   */
  const { addToCart } = useCartActions();
  const { toggleFavorite } = useFavoritesActions();
  const [isAdding, setIsAdding] = useState(false);
  /* Back-order is the DEFAULT state of this catalogue (10,535 of 10,669), so this state exists
     on almost every card. It stays `false` until the customer taps: the dialog's markup is only
     mounted while open, so a 12-card grid does not carry 12 hidden forms. */
  const [requestOpen, setRequestOpen] = useState(false);
  const favorite = useIsFavorite(product.id);
  // The SAME call the product detail page makes. Card and page now derive their label from one
  // function over the same four columns (qte, rupture, force_out_of_stock, low_stock_threshold),
  // so a product cannot advertise "En stock" in a grid and "Rupture de stock" on its own page.
  const stock = getProductStockStatus(product as any);
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = useCartQty(product.id);
  const canAddMore = stockDisponible > 0 && inCartQty < stockDisponible;

  const productData = useMemo(() => {
    const name = localizedName(product as any, locale);
    const slug = product.slug || '';
    const image = (product as any).image || (product.cover ? getStorageUrl(product.cover) : '');
    const description =
      localizedField(product as any, 'description', locale) || (product as any).description_cover || '';
    const priceDisplay = getPriceDisplay(product as any);
    const discount =
      priceDisplay.hasPromo && priceDisplay.oldPrice != null && priceDisplay.oldPrice > 0
        ? Math.round(((priceDisplay.oldPrice - priceDisplay.finalPrice) / priceDisplay.oldPrice) * 100)
        : 0;
    const isNew = product.new_product === 1;
    const isBestSeller = product.best_seller === 1;
    // Absolute savings (price − promo) for the "Économisez X DT" pill.
    const savings =
      priceDisplay.hasPromo && priceDisplay.oldPrice != null
        ? Math.max(0, priceDisplay.oldPrice - priceDisplay.finalPrice)
        : 0;
    // Rating (0–5). `rating_value` is the average over ATTESTED reviews only — reviews with a
    // verified flag or an order behind them — computed per request by the listing API, which is
    // also what feeds the aggregateRating in JSON-LD, so page and markup cannot disagree.
    // `note` is the legacy products column and is NULL on every row; kept only as a fallback for
    // any endpoint not yet carrying the alias.
    //
    // We NEVER invent a number. Today this is null for every product, because the 203 reviews the
    // site used to show had no purchase behind a single one of them. It fills in on its own as
    // genuine reviews arrive.
    const ratingRaw = Number((product as any).rating_value ?? (product as any).note);
    const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : null;
    const reviewCountRaw = Number(
      (product as any).review_count ?? (product as any).reviews_count ?? (product as any).avis_count,
    );
    const reviewCount = Number.isFinite(reviewCountRaw) && reviewCountRaw > 0 ? reviewCountRaw : 0;
    const imagePresentation = getProductImagePresentation({
      ...(product as any),
      image,
      slug,
      name,
      designation_fr: product.designation_fr,
    }, { visualContext: imageContext });
    return {
      name,
      slug,
      image,
      description,
      priceDisplay,
      discount,
      savings,
      rating,
      reviewCount,
      isNew,
      isBestSeller,
      imagePresentation,
    };
  }, [product, imageContext, locale]);

  const doAddToCart = useCallback((prod: any, selectedAroma: { id: number; designation_fr: string } | null) => {
    const price = prod.prix != null ? getPriceDisplay(prod).finalPrice : productData.priceDisplay.finalPrice;
    const image = prod.cover ? getStorageUrl(prod.cover) : productData.image;
    const cartProduct = {
      ...prod,
      name: prod.name ?? prod.designation_fr,
      price,
      priceText: `${price} DT`,
      image,
      ...(selectedAroma && { selectedAroma }),
    };
    // ORDER MATTERS, and so does what is urgent.
    //
    // `setIsAdding(true)` is the only thing the shopper is waiting to see — the button flips to
    // "Ajouté !". It stays urgent, so it is in the very next frame, which is the frame INP stops
    // the clock on.
    //
    // The toast is not. Mounting a sonner toast into its portal was running inside the tap
    // handler, ahead of the paint, to show a message that says the same thing as the button that
    // just changed and the drawer that is about to open. `startTransition` moves it into a second,
    // interruptible render pass — visually identical, off the critical interaction path.
    setIsAdding(true);
    addToCart(cartProduct, 1);
    startTransition(() => {
      toast.success('Produit ajouté au panier');
    });
    setTimeout(() => setIsAdding(false), 500);
  }, [productData.priceDisplay.finalPrice, productData.image, addToCart]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock.isOutOfStock || stockDisponible <= 0) {
      toast.error('Rupture de stock');
      return;
    }
    if (inCartQty >= stockDisponible) {
      toast.error(`Stock insuffisant. Il reste ${stockDisponible - inCartQty} unité(s).`);
      return;
    }
    const aromesFromProduct = (product as any).aromes;
    const firstAroma = Array.isArray(aromesFromProduct) && aromesFromProduct.length > 0 ? aromesFromProduct[0] : null;
    doAddToCart(product as any, firstAroma);
  }, [stock.isOutOfStock, stockDisponible, inCartQty, product, doAddToCart]);

  void variant;
  void showDescription;
  void hideCountdown;

  // Brand from the explicit prop, else a brandName the caller injected onto the product object.
  const brand = brandName || ((product as any).brandName as string | undefined);
  const inStock = !stock.isOutOfStock && stockDisponible > 0;

  return (
    // The comment block below sits OUTSIDE the fragment on purpose: inside one it would be JSX
    // CHILDREN, where a comment is rendered as literal text rather than stripped. eslint's
    // react/jsx-no-comment-textnodes catches exactly that, and it fired here the moment the
    // fragment was added to host the request dialog.
    // GPT product-card design. Poppins + #FF5A00 accent, scoped to the card (card-first rollout).
    // MUST stay geometrically in lockstep with ProductCardSkeleton or the swap shifts layout.
    /*
      A ROW ON PHONES, A COLUMN FROM `sm`.
      `flex-row sm:flex-col` is the whole mechanism: at one column per row a VERTICAL card is as
      tall as a full-width image (~500px), while a horizontal one is only as tall as its text
      (~180px). Same information, same one-per-row reading order the owner asked for, a third of
      the height. See ProductGrid for the three iterations this went through.

      `relative` is new and load-bearing: the favourite button is positioned against the CARD now,
      not against the image. In the row layout the image is a 124px thumbnail on the left, so a
      heart anchored to it would sit on top of the packshot instead of in the card's corner.
    */
    <>
    <article className="pt-plate group font-poppins relative flex h-full w-full min-w-0 flex-row overflow-hidden rounded-2xl border border-hairline shadow-sm transition-shadow duration-200 ease-out sm:flex-col [@media(hover:hover)]:hover:shadow-lg">
      {/* 124px thumbnail on phones, full-width image from `sm`. `self-stretch` gives the frame's
          `h-full` a height to resolve against (see util/productCardFrame.ts). */}
      <div className="relative w-[124px] shrink-0 self-stretch sm:w-auto sm:self-auto">
        <PackCardImage
          imageSrc={productData.image}
          productName={productData.name}
          imageAlt={buildProductAlt(product as any, { name: productData.name })}
          productId={product.id}
          slug={productData.slug}
          mode={productData.imagePresentation.mode}
          objectPosition={productData.imagePresentation.objectPosition}
          scale={productData.imagePresentation.scale}
          product={product as any}
          priority={priority}
          hoverImageSrc={(product as any).hover_image ?? null}
          sizes={imageSizes}
        />

        {/* Badges — top-left. Discount = the brand accent; Rupture / TOP VENTE = a dark chip.

            THE DARK CHIPS CARRY `.pt-slab`, NOT `bg-ink-1 text-white`. That pairing was a real
            dark-mode defect, found by scripts/audit-contrast.mjs: `--c-ink-1` INVERTS with the
            theme, so in dark mode `bg-ink-1` resolves to #F5F4F2 and the chip rendered white text
            on a near-white pill at 1.10:1. Sixteen of them on the homepage alone.

            The rule this establishes: an element that must stay dark in BOTH themes is a SCOPE
            (`.pt-slab`), never an ink token used as a fill. `bg-ink-1` means "the colour of type",
            and the colour of type is supposed to flip. */}
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start gap-1 sm:left-3 sm:top-3 sm:gap-1.5">
          {!inStock && (
            /* "Sur commande" for the 10,535 imported catalogue items, "Rupture" only for the ones
               the owner has explicitly switched off. They never sold out — they were never stocked
               — and a grid where 98.7% of the cards shout RUPTURE reads like a dead shop. */
            <span className="pt-slab inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-1 shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
              {stock.isBackOrder ? 'Sur commande' : 'Rupture'}
            </span>
          )}
          {inStock && productData.priceDisplay.hasPromo && productData.discount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-brand px-2 py-0.5 text-[10px] font-bold tabular-nums tracking-wide text-on-brand shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
              <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
              -{productData.discount}%
            </span>
          )}
          {/* `showBadge !== false` — an explicit opt-out, not a change of default.
              A "TOP VENDU" pill on every card in a rail headed "LES PLUS VENDUS" (or "FLASH" under
              "VENTES FLASH", or "NEW" under "NOUVEAUX PRODUITS") repeats the heading four times
              and, on the 124px phone thumbnail, covers about 40% of the packshot. A badge only
              carries information when it DIFFERS from what the surrounding band already says.

              It stays on by default, because on /shop, /favoris and search results the products
              are mixed and "Top vente" is genuinely a per-product fact. Only the homepage rails,
              which state it in their own h2, pass `showBadge={false}`.

              The DISCOUNT badge above is untouched: −7% is per-product and no heading states it. */}
          {inStock && showBadge !== false && (productData.isBestSeller || badgeText) && (
            <span className="pt-slab inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-1 shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
              <Star className="h-3 w-3 shrink-0 fill-[#FFB020] text-[#FFB020]" aria-hidden="true" />
              {badgeText || 'Top vente'}
            </span>
          )}
        </div>
      </div>

      {/* Favourite — anchored to the CARD, so it lands in the top-right corner in both layouts.
          36px circle with a 44px tap area via `after:-inset-1`: the visual control can shrink on
          a phone, the TARGET cannot — 44px is the floor. */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(toFavoriteProduct(product)); }}
        className="pointer-events-auto absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-elevated shadow-md ring-1 ring-hairline transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 sm:right-3 sm:top-3"
        aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart className={`h-[18px] w-[18px] ${favorite ? 'fill-brand text-brand' : 'text-ink-3'}`} />
      </button>

      {/*
        Body — SIX stacked rows became FOUR (owner: "the card height is so long").

        Rows are the expensive dimension on a card, because every one of them costs its own height
        PLUS a gap. What changed:
          · savings pill    moved onto the PRICE row (it is a property of the price, not a fact of
                            its own) — removes a 20px row and its 8px gap
          · "Paiement à la livraison"  deleted. It is already stated in the trust strip under the
                            hero and again on the product page, and here it was the chip that
                            wrapped the meta row onto a second line on every narrow column —
                            costing ~20px on cards where it was pure repetition
          · gap-2 → gap-1.5, py-4 → py-3.5 is NOT used (off the 4px lattice); padding stays 16px
        Combined with the 5:4 image frame this takes the desktop card from ~608px to ~465px.
      */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 px-3 py-3 sm:px-4 sm:py-4">
        {/* Brand + verified — only when the name resolved (grid payload carries brand_id only). */}
        {/* `pr-9` on phones ONLY on the two rows that sit in the favourite button's vertical band
            (it is 36px tall at `top-2`, so it overlaps the brand row and the title's first line).
            Padding the whole body instead would cost 36px of width on the price, the meta row and
            the CTA — the rows that need it most in a 234px column. */}
        {brand && (
          <div className="flex min-w-0 items-center gap-1 pr-9 sm:pr-0">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-brand">{brand}</span>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Marque authentique" />
          </div>
        )}

        <LinkWithLoading href={buildProductUrlPath(product as any)} className="block min-w-0 pr-9 sm:pr-0" loadingMessage="Chargement">
          <h3
            title={productData.name}
            /* 13px in a 173px phone column, 15 from `sm`. The `min-h` is the two-line reservation
               that keeps every card in a row the same height — it scales with the size. */
            className="line-clamp-2 min-h-[2.375rem] text-[13px] font-bold leading-snug text-ink-1 transition-colors sm:min-h-[2.75rem] sm:text-[15px] [@media(hover:hover)]:group-hover:text-brand"
          >
            {productData.name}
          </h3>
        </LinkWithLoading>

        {/* Rating. Numeric average only if the backend actually provides `note` (null in the grid
            today) — never fabricated. The review COUNT is real. */}
        {productData.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <Star className="h-3.5 w-3.5 shrink-0 fill-[#FFB020] text-[#FFB020]" aria-hidden="true" />
            {productData.rating != null && (
              <span className="font-semibold text-ink-1">{productData.rating.toFixed(1)}</span>
            )}
            <span>({productData.reviewCount} avis)</span>
          </div>
        )}

        {/* Price · struck · savings — ONE row, wrapping only if it has to.
            The savings pill used to be its own row beneath. It is a restatement of the difference
            between the two numbers beside it, so it belongs on the same line as them; `flex-wrap`
            plus `ml-auto` puts it at the right edge on a wide column and drops it under the price
            only on a genuinely narrow one. */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="whitespace-nowrap text-xl font-bold tabular-nums text-brand sm:text-2xl">
            {Math.round(productData.priceDisplay.finalPrice)} DT
          </span>
          {productData.priceDisplay.hasPromo && productData.priceDisplay.oldPrice != null && (
            <span
              className="whitespace-nowrap text-[13px] text-ink-3 line-through tabular-nums sm:text-sm"
              aria-label={`Prix barré: ${productData.priceDisplay.oldPrice.toFixed(2)} DT`}
            >
              {Math.round(productData.priceDisplay.oldPrice)} DT
            </span>
          )}
          {/* `text-ink-1`, NOT `text-brand`. The accent on a 10% tint of ITSELF composites to
              #D03B04 on #FBEBE6 = 4.07:1 in light theme — an AA failure invisible to review,
              because both values are "the brand colour" and the pill obviously reads as orange.
              (Dark is fine at 6.76:1; only light fails, which is the harder case to notice.)
              Ink on the tint is 17.6:1 / 12:1 and the pill still reads as brand-tinted, because
              the TINT carries the colour and the text does not have to. */}
          {productData.savings > 0 && (
            <span className="ml-auto inline-flex shrink-0 items-center rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-1">
              −{Math.round(productData.savings)} DT
            </span>
          )}
        </div>

        {/* Trust chips. Stock is per-product and comes from getProductStockStatus — the exact
            label the detail page shows, including "Stock faible", which the card previously could
            not display at all because low_stock_threshold was never sent to it.
            When the payload carries no stock columns the chip is omitted entirely rather than
            guessed: a wrong "En stock" breaks a promise to the customer, and a wrong "Rupture"
            kills a sale outright. */}
        {/* ONE line, never two. "Paiement à la livraison" is gone from the card: it is stated in
            the trust strip under the hero and again on the product page, and it was the chip that
            wrapped this row onto a second line in every narrow column — ~20px per card, spent on
            repetition. Stock + delivery window are the two facts that are per-PRODUCT. */}
        <div className="flex flex-nowrap items-center gap-x-2 overflow-hidden text-[10px] font-medium text-ink-3 sm:gap-x-3 sm:text-[11px]">
          {!stock.isUnknown && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <CircleCheck
                className={`h-3.5 w-3.5 shrink-0 ${
                  stock.isOutOfStock ? 'text-ink-3' : stock.isLowStock ? 'text-warn' : 'text-ok'
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{stock.stockLabel}</span>
            </span>
          )}
          {/* NOT on a back-order card. "24-48h" beside "Sur commande" is a delivery promise for
              something nobody has in a warehouse, and it contradicts the product page, which drops
              shippingDetails from its schema for exactly these items (see buildShippingDetails).
              A shipping estimate is a claim; it is only allowed where the stock is real. */}
          {!stock.isBackOrder && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              24–48h
            </span>
          )}
        </div>

        {/* CTA. min-h 44, not 46: 44 is the tap-target floor and 46 was two pixels of nothing. */}
        <div className="mt-auto pt-1">
          {stock.isBackOrder ? (
            /*
              IT ASKS HERE. IT DOES NOT SEND THEM AWAY TO ASK.

              History worth keeping, because the same mistake has now been made twice in opposite
              directions. First this was a DISABLED button reading "Sur commande" — a control that
              names an action and then refuses to perform it. That was replaced by a link to
              `/contact?produit=…`, which was a real improvement: it at least offered a way to ask.

              But it is on 10,535 of 10,669 cards, so it is not an edge case — it is the catalogue's
              DEFAULT call to action, and it spent a navigation, a page load and a blank
              general-purpose form on it. The product context that was on screen at the moment of
              intent got thrown away, and the customer was asked to describe from memory the thing
              they had just been looking at.

              Now it opens `ProductRequestDialog` in place, pre-filled. Still styled as the outline
              variant rather than the brand fill, so it still reads as secondary to a real
              "Ajouter au panier" elsewhere in the grid.

              A `<button>` rather than an anchor: it no longer navigates, and the two guards below
              are what keep a tap on it from also triggering the card's own title link.
            */
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRequestOpen(true);
              }}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand bg-transparent px-3 py-2.5 text-sm font-semibold leading-none whitespace-nowrap text-brand transition-colors duration-150 active:scale-[0.98] hover:bg-brand hover:text-on-brand"
              aria-label={`Demander ${productData.name}`}
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Demander</span>
            </button>
          ) : (
          <Button
            size="sm"
            className={`flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold leading-none whitespace-nowrap transition-colors duration-150 active:scale-[0.98] ${
              inStock && canAddMore
                ? 'bg-brand text-on-brand shadow-md hover:bg-brand-hover hover:shadow-lg'
                : 'cursor-not-allowed bg-sunken text-ink-3'
            }`}
            onClick={handleAddToCart}
            disabled={isAdding || !inStock || !canAddMore}
            aria-label={!canAddMore && inStock ? 'Stock maximum atteint' : `Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="size-4 shrink-0" aria-hidden="true" />
            {!inStock ? (
              <span className="truncate">{stock.isBackOrder ? 'Sur commande' : 'Rupture'}</span>
            ) : !canAddMore ? (
              <span className="truncate">Stock max</span>
            ) : isAdding ? (
              <span className="truncate">Ajouté !</span>
            ) : (
              /* "AJOUTER" ON PHONES, "AJOUTER AU PANIER" FROM `sm` (owner, in DevTools: "add to
                 panier — that's bad; I just put the word 'Ajouter' with the icon, it looks good").
                 On the 1-up mobile card the text column is ~190px wide and the full label at 14px
                 measured ~150px, so the button was almost entirely text with the cart glyph
                 crushed against it. `au panier` is redundant next to a cart icon in the first
                 place — the icon IS the noun. The `aria-label` on the Button above still reads
                 "Ajouter {product} au panier" at every width, so nothing is lost to a screen
                 reader; this is purely what is drawn. */
              <span className="truncate">
                Ajouter<span className="hidden sm:inline"> au panier</span>
              </span>
            )}
          </Button>
          )}
        </div>
      </div>
    </article>

      {/* OUTSIDE the <article>, which is not tidiness: the card frame is `overflow-hidden`, and a
          sheet rendered inside it would be clipped to the card. Radix portals its content to the
          body anyway, but keeping the JSX out of the clipped subtree is what makes that obvious to
          the next reader instead of load-bearing and invisible. */}
      {requestOpen && (
        <ProductRequestDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          productName={productData.name}
          productPath={buildProductUrlPath(product as any)}
          priceText={`${Math.round(productData.priceDisplay.finalPrice)} DT`}
        />
      )}
    </>
  );
});
