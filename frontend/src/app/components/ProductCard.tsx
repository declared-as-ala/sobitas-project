'use client';

import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ShoppingCart, Heart, Flame, Star, BadgeCheck, CircleCheck, Truck, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PackCardImage } from '@/app/components/PackCardImage';
import { ProductRequestDialog } from '@/app/components/ProductRequestDialog';
import type { Product as ApiProduct } from '@/types';
import { useCartActions, useCartQty } from '@/app/contexts/CartContext';
import { useFavoritesActions, useIsFavorite } from '@/contexts/FavoritesContext';
import { getStorageUrl } from '@/services/api';
import { notify as toast } from '@/lib/notify';
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

function toFavoriteProduct(product: Product): { id: number; designation_fr: string; slug?: string; cover?: string; prix?: number; promo?: number | null; promo_expiration_date?: string | null; qte?: number; rupture?: number; sous_categorie_id?: number; brand_id?: number } {
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
    // The aisle, so /favoris can ask for "more like these" without a request per favourite —
    // see FavoriteProduct. Both are already on every listing payload; nothing extra is fetched.
    sous_categorie_id: p.sous_categorie_id,
    brand_id: p.brand_id,
  };
}

function scheduleAfterPaint(task: () => void) {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    setTimeout(task, 0);
    return;
  }
  window.requestAnimationFrame(() => window.requestAnimationFrame(task));
}

const ProductFavoriteButton = memo(function ProductFavoriteButton({ product }: { product: Product }) {
  const { toggleFavorite } = useFavoritesActions();
  const favorite = useIsFavorite(product.id);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(toFavoriteProduct(product));
      }}
      className={`pointer-events-auto z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hairline bg-elevated transition-transform hover:scale-105 sm:absolute sm:right-3 sm:top-3 sm:h-9 sm:w-9 sm:rounded-full sm:border-0 sm:shadow-md sm:ring-1 sm:ring-hairline ${
        favorite ? 'border-brand/40' : ''
      }`}
      aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart className={`h-[18px] w-[18px] ${favorite ? 'fill-brand text-brand' : 'text-ink-3'}`} />
    </button>
  );
});

const ProductAddToCartButton = memo(function ProductAddToCartButton({
  product,
  productName,
  fallbackImage,
  fallbackPrice,
  inStock,
  stockDisponible,
}: {
  product: Product;
  productName: string;
  fallbackImage: string;
  fallbackPrice: number;
  inStock: boolean;
  stockDisponible: number;
}) {
  const { addToCart } = useCartActions();
  const inCartQty = useCartQty(product.id);
  const [isAdding, setIsAdding] = useState(false);
  const canAddMore = stockDisponible > 0 && inCartQty < stockDisponible;

  const handleAddToCart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!inStock || stockDisponible <= 0) {
      toast.error('Rupture de stock');
      return;
    }
    if (!canAddMore) {
      toast.error('Stock maximum atteint.');
      return;
    }

    const rawProduct = product as any;
    const price = rawProduct.prix != null ? getPriceDisplay(rawProduct).finalPrice : fallbackPrice;
    const image = rawProduct.cover ? getStorageUrl(rawProduct.cover) : fallbackImage;
    const aromas = rawProduct.aromes;
    const selectedAroma = Array.isArray(aromas) && aromas.length > 0 ? aromas[0] : null;
    const cartProduct = {
      ...rawProduct,
      name: rawProduct.name ?? rawProduct.designation_fr,
      price,
      priceText: `${price} DT`,
      image,
      ...(selectedAroma && { selectedAroma }),
    };

    // Paint the local confirmation first. Cart state, drawer and toast follow one frame later;
    // the mutation is unchanged, but it no longer sits between the tap and visible feedback.
    setIsAdding(true);
    scheduleAfterPaint(() => {
      addToCart(cartProduct, 1);
      startTransition(() => {
        toast.success('Produit ajouté au panier');
      });
    });
    setTimeout(() => setIsAdding(false), 500);
  }, [addToCart, canAddMore, fallbackImage, fallbackPrice, inStock, product, stockDisponible]);

  return (
    <Button
      size="sm"
      className={`flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold leading-none transition-colors duration-150 active:scale-[0.98] ${
        inStock && canAddMore
          ? 'bg-brand text-on-brand shadow-md hover:bg-brand-hover hover:shadow-lg'
          : 'cursor-not-allowed bg-sunken text-ink-3'
      }`}
      onClick={handleAddToCart}
      disabled={isAdding || !inStock || !canAddMore}
      aria-label={!canAddMore && inStock ? 'Stock maximum atteint' : `Ajouter ${productName} au panier`}
    >
      <ShoppingCart className="size-4 shrink-0" aria-hidden="true" />
      {!inStock ? (
        <span className="truncate">Rupture</span>
      ) : !canAddMore ? (
        <span className="truncate">Stock max</span>
      ) : isAdding ? (
        <span className="truncate">Ajouté !</span>
      ) : (
        <span className="truncate">
          Ajouter<span className="hidden sm:inline"> au panier</span>
        </span>
      )}
    </Button>
  );
});

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
  /* Back-order is the DEFAULT state of this catalogue (10,535 of 10,669), so this state exists
     on almost every card. It stays `false` until the customer taps: the dialog's markup is only
     mounted while open, so a 12-card grid does not carry 12 hidden forms. */
  const [requestOpen, setRequestOpen] = useState(false);
  // The SAME call the product detail page makes. Card and page now derive their label from one
  // function over the same four columns (qte, rupture, force_out_of_stock, low_stock_threshold),
  // so a product cannot advertise "En stock" in a grid and "Rupture de stock" on its own page.
  const stock = getProductStockStatus(product as any);
  const stockDisponible = getStockDisponible(product as any);

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
      {/* ── 104px UNDER 400px, 124 ABOVE IT (owner, 18/08/2026) ──────────────────────────
          *"on my iPhone 13 the cards are super good, but on smaller screens the text gets squeezed
          and trimmed."* An iPhone 13 is 390 CSS px. The phones under it in real traffic are 375,
          360 and 320 — and 320 is also what a 360px Android reports at the largest display-size
          setting, i.e. a person who has asked the system for BIGGER text.

          The arithmetic at 320, before: 288px card − 124 thumbnail − 24 padding = 140px of column,
          minus 36 reserved for the heart on the two rows that carry the brand and the name = 104.
          A 41-character product name in 104px at 13px clamps mid-word every time, which is exactly
          what `measure-card.mjs` reports at 320, 360, 375 AND 390.

          20px off the thumbnail and 4px off the body padding, plus the 36 the heart gives back,
          takes that column from 104 to 168px.

          THE BREAKPOINT IS 360, NOT 400, AND THAT IS A MEASUREMENT. With the heart out of the way
          a 390px iPhone has a 210px text column at the FULL 124px thumbnail — it never needed the
          smaller one, and the owner's note was explicit that 390 already looked right. Re-measured
          at 360 and 375 with 124px: no clipping either. Only 320 — where the column would be 164 —
          actually needs the narrower thumbnail, so only 320-359 gets it. `self-stretch` gives the frame's `h-full` a height to resolve against
          (see util/productCardFrame.ts). */}
      <div className="relative w-[104px] shrink-0 self-stretch min-[360px]:w-[124px] sm:w-auto sm:self-auto">
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
            <span className="pt-slab inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-1 shadow-sm sm:px-2.5 sm:py-1">
              {stock.isBackOrder ? 'Sur commande' : 'Rupture'}
            </span>
          )}
          {inStock && productData.priceDisplay.hasPromo && productData.discount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-brand px-2 py-0.5 text-[11px] font-bold tabular-nums tracking-wide text-on-brand shadow-sm sm:px-2.5 sm:py-1">
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
            <span className="pt-slab inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-1 shadow-sm sm:px-2.5 sm:py-1">
              <Star className="h-3 w-3 shrink-0 fill-[#FFB020] text-[#FFB020]" aria-hidden="true" />
              {badgeText || 'Top vente'}
            </span>
          )}
        </div>

        {/* ── REVIEWS ARE A STICKER ON THE PHOTOGRAPH, NOT A ROW OF THE CARD ────────────────
            Owner, 20/08/2026: *"on mobile and on desktop try to make the avis or stars in a
            better place — position absolute maybe, a tag or something, for a better look, and use
            a good icon."*

            It was the fifth row of the text column: a gold star, then `(1 avis)`, on its own
            baseline between the title and the price. Two things wrong with that, and the second
            is not cosmetic.

            THE ROW. Every row on this card costs its own height plus a gap, and the whole
            history of this component is rows being removed (savings pill folded onto the price,
            "Paiement à la livraison" deleted, six rows to four). A fact that is one glyph and
            three words does not earn a line of its own between the two things a shopper actually
            reads. As a chip on the packshot it costs ZERO height and the card comes down another
            ~26px, on every card, on every listing.

            THE STAR. `rating` is null for every product in this catalogue right now — the 203
            reviews the site used to carry had no purchase behind a single one and were removed —
            so what actually rendered was a filled gold star with NO NUMBER beside `(1 avis)`.
            That does not read as "one review". It reads as ONE STAR: the worst rating a product
            can have, printed in gold on the photograph, on a product nobody has rated badly. The
            owner's screenshot is exactly that, and it is the reason this is a correctness fix and
            not a styling one.

            So the icon now follows the DATA:
              · a real average (4,8)  ->  filled star, the number, the count. A rating.
              · a count and no average ->  a speech bubble and "N avis". A COUNT of opinions, which
                                           is all we know, said in the one glyph that cannot be
                                           misread as a score.

            It fills in on its own: as attested reviews arrive `rating_value` stops being null and
            the same chip becomes a star rating without anyone touching this file.

            `pointer-events-none` because the whole frame is one link to the product — a chip that
            swallowed the tap would be a dead 60px hole in the middle of the card's own target. */}
        {productData.reviewCount > 0 && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 sm:bottom-3 sm:left-3">
            <span
              className="inline-flex items-center gap-1 rounded-full border border-hairline bg-elevated/95 px-1.5 py-1 text-[11px] font-semibold leading-none text-ink-1 shadow-sm sm:px-2"
              aria-label={
                productData.rating != null
                  ? `Note ${productData.rating.toFixed(1)} sur 5, ${productData.reviewCount} avis`
                  : `${productData.reviewCount} avis`
              }
            >
              {productData.rating != null ? (
                <>
                  <Star className="h-3 w-3 shrink-0 fill-[#FFB020] text-[#FFB020]" aria-hidden="true" />
                  <span className="tabular-nums">{productData.rating.toFixed(1)}</span>
                  <span className="font-medium tabular-nums text-ink-3">({productData.reviewCount})</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-3 w-3 shrink-0 text-ink-3" aria-hidden="true" />
                  <span className="tabular-nums">{productData.reviewCount}</span>
                  <span className="font-medium text-ink-3">avis</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 px-2.5 py-2.5 min-[360px]:px-3 min-[360px]:py-3 sm:px-4 sm:py-4">
        {/* Brand + verified — only when the name resolved (grid payload carries brand_id only). */}
        {/* ── `pr-9` IS GONE, AND IT WAS 26% OF THE COLUMN ─────────────────────────────────
            It reserved 36px on the brand row and the title for a favourite button overlaying the
            card's top-right corner. On a 320px phone the text column is 140px wide, so those two
            rows — the brand and the product name, the two things a shopper reads — were being run
            in 104px while the price and the CTA below them had the full 140.

            The button now joins the action row on phones (see the CTA block below), so nothing
            overlays the text at any width and the reservation has nothing left to reserve. */}
        {brand && (
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-brand">{brand}</span>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Marque authentique" />
          </div>
        )}

        <LinkWithLoading href={buildProductUrlPath(product as any)} className="block min-w-0" loadingMessage="Chargement">
          <h3
            title={productData.name}
            /* 13px in a 173px phone column, 15 from `sm`. The `min-h` is the two-line reservation
               that keeps every card in a row the same height — it scales with the size. */
            /* ── 14px THROUGH THE TABLET COLUMNS ──────────────────────────────────────────
               `measure-card.mjs` clips this name at 768 and 1024 as well as on phones, and for the
               same reason: ProductGrid puts three columns at `md` (card 229px) and four at `lg`
               (222px), which are the NARROWEST cards the desktop layout ever renders — narrower
               than the 286px it gets back at `xl`. 15px type in a 222px column is ~25 characters
               a line; the catalogue's names run past 40.

               14px between `md` and `xl` buys the fourth line's worth of characters inside the two
               lines that are already reserved, so nothing grows and nothing clips. It returns to
               15px at `xl`, where the column can carry it. */
            /* ── AND A THIRD LINE WHERE TWO STILL DO NOT FIT ──────────────────────────────
               Re-measured after the 14px step: 768 came clean, 320 and 1024 did not. Those are the
               two narrowest columns the layout produces — a 164px text column on a small phone and
               a 222px card in the `lg` four-up grid — and at those widths a 41-character catalogue
               name genuinely needs three lines. The owner's ask was that names stop being trimmed,
               so they get the line rather than the type getting smaller: 13px is already the floor
               on a phone, and shrinking it further to protect a clamp is solving the wrong half.

               Scoped to exactly those two ranges. Everywhere else the reserved two-line box is
               correct and unchanged, so no card grows anywhere it was already fine. */
            className="line-clamp-2 min-h-[2.375rem] text-[13px] font-bold leading-snug text-ink-1 transition-colors max-[399px]:line-clamp-3 sm:min-h-[2.75rem] sm:text-[15px] md:text-[14px] lg:line-clamp-3 xl:line-clamp-2 xl:text-[15px] [@media(hover:hover)]:group-hover:text-brand"
          >
            {productData.name}
          </h3>
        </LinkWithLoading>

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
          {/* ── THE SAVING IS GREEN NOW, AND THE TEXT IS STILL INK ────────────────────────
              A tint of the BRAND said "this is our colour"; a tint of `ok` says "this is money you
              are not spending", which is what the number is — and it is the same language the cart
              drawer uses for the same figure two clicks later.

              The ink stays. `text-ok` on `bg-ok/10` composites to #15803D on #E8F2EC = 4.38:1 in
              light theme — under AA for 11px text, and a failure nobody would ever spot because a
              green number on a green chip looks obviously correct. Measured before writing it.
              Same trap, same answer as the brand pill this replaces: the TINT carries the colour,
              the TEXT carries the contrast (ink on that tint is ~17:1). */}
          {productData.savings > 0 && (
            <span className="ml-auto inline-flex shrink-0 items-center rounded-md bg-ok/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-1">
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
      {/* ── 11px AT EVERY WIDTH (owner, 18/08/2026: "on mobile … measured spaces and colors and
          font sizes") ────────────────────────────────────────────────────────────────────────
          A sweep of the rendered homepage at 390px found FIFTY-THREE text nodes set at 10px, and
          every one of them was on this card: the discount badge, the stock chip, the delivery
          chip. All four were written `text-[10px] sm:text-[11px]` — the PHONE got the smaller of
          the two sizes, which is backwards. A phone is held further from the eye than a laptop is,
          and it is 81% of this site's traffic.

          11px at every width, so the step disappears rather than inverting. Measured against the
          space it has: this meta row is 222px wide on a 390px phone (390 − 32 gutter − 124
          thumbnail − 12 gap) and "En stock · 24–48h" sets at ~108px. It was never tight. */}
        <div className="flex flex-nowrap items-center gap-x-2 overflow-hidden text-[11px] font-medium text-ink-3 sm:gap-x-3">
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
        {/*
          ── THE ACTION ROW, AND WHERE THE HEART LIVES NOW ────────────────────────────────────
          ONE button, two positions, no duplicate node: on a phone it is a flex item beside the
          cart button; from `sm` it is `absolute` and anchors to the <article> (which is
          `relative`), landing back in the card's top-right corner over the packshot exactly as
          before. An absolutely-positioned element ignores its DOM parent for layout, so the same
          element can sit in the row here and float there — rendering it twice would have meant two
          controls with the same `aria-label`, both announced.

          Why it moved at all: overlaying the card's top-right corner cost `pr-9` on the brand row
          and the title, which on a 320px phone is 36 of the 140px those rows had. The corner is
          free real estate on a 350px vertical card and is the most expensive strip on the card on
          a 288px row.

          It also reads better on a phone: favourite and add-to-cart are the two things you can do
          with a card, and they now sit together instead of one being a floating overlay.
        */}
        <div className="mt-auto flex items-center gap-2 pt-1 sm:block">
          <ProductFavoriteButton product={product} />
          <div className="min-w-0 flex-1 sm:flex-none">
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
          <ProductAddToCartButton
            product={product}
            productName={productData.name}
            fallbackImage={productData.image}
            fallbackPrice={productData.priceDisplay.finalPrice}
            inStock={inStock}
            stockDisponible={stockDisponible}
          />
          )}
          </div>
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
