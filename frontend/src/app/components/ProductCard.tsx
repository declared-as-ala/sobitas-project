'use client';

import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ShoppingCart, Heart, Flame, Star, BadgeCheck, CircleCheck, Truck, Shield } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PackCardImage } from '@/app/components/PackCardImage';
import type { Product as ApiProduct } from '@/types';
import { useCart } from '@/app/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { getStorageUrl } from '@/services/api';
import { toast } from 'sonner';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible, isInStock } from '@/util/cartStock';
import { getProductImagePresentation } from '@/util/productImagePresentation';
import { buildProductUrlPath } from '@/util/productUrl';
import { buildProductAlt } from '@/util/productAlt';
import { useState, useMemo, memo, useCallback } from 'react';
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
  brandName,
}: ProductCardProps) {
  const { locale } = useI18n();
  const { addToCart, getCartQty } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isAdding, setIsAdding] = useState(false);
  const favorite = isFavorite(product.id);
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = getCartQty(product.id);
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
      isInStock: isInStock(product as any),
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
    setIsAdding(true);
    addToCart(cartProduct, 1);
    toast.success('Produit ajouté au panier');
    setTimeout(() => setIsAdding(false), 500);
  }, [productData.priceDisplay.finalPrice, productData.image, addToCart]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productData.isInStock || stockDisponible <= 0) {
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
  }, [productData.isInStock, stockDisponible, inCartQty, product, doAddToCart]);

  void variant;
  void showDescription;
  void hideCountdown;

  // Brand from the explicit prop, else a brandName the caller injected onto the product object.
  const brand = brandName || ((product as any).brandName as string | undefined);
  const inStock = productData.isInStock && stockDisponible > 0;

  return (
    // GPT product-card design. Poppins + #FF5A00 accent, scoped to the card (card-first rollout).
    // MUST stay geometrically in lockstep with ProductCardSkeleton or the swap shifts layout.
    <article className="group font-poppins flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow duration-200 ease-out [@media(hover:hover)]:hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="relative">
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
        />

        {/* Favourite — white circle, top-right */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(toFavoriteProduct(product)); }}
          className="pointer-events-auto absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 dark:bg-gray-800 dark:ring-white/10"
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-[18px] w-[18px] ${favorite ? 'fill-[#FF5A00] text-[#FF5A00]' : 'text-[#6B7280] dark:text-gray-300'}`} />
        </button>

        {/* Badges — top-left. Discount = the #FF5A00 accent; "TOP VENTE" = dark ink chip. */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          {!inStock && (
            <span className="inline-flex items-center rounded-lg bg-[#111827] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              Rupture
            </span>
          )}
          {inStock && productData.priceDisplay.hasPromo && productData.discount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#FF5A00] px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-wide text-white shadow-sm">
              <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
              -{productData.discount}%
            </span>
          )}
          {inStock && (productData.isBestSeller || (showBadge && badgeText)) && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#111827] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <Star className="h-3 w-3 shrink-0 fill-[#FFB020] text-[#FFB020]" aria-hidden="true" />
              {badgeText || 'Top vente'}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-4 py-4">
        {/* Brand + verified — only when the name resolved (grid payload carries brand_id only). */}
        {brand && (
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#FF5A00]">{brand}</span>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#FF5A00]" aria-label="Marque authentique" />
          </div>
        )}

        <LinkWithLoading href={buildProductUrlPath(product as any)} className="block min-w-0" loadingMessage="Chargement">
          <h3
            title={productData.name}
            className="line-clamp-2 min-h-[2.75rem] text-[15px] font-bold leading-snug text-[#111827] transition-colors [@media(hover:hover)]:group-hover:text-[#FF5A00] dark:text-white"
          >
            {productData.name}
          </h3>
        </LinkWithLoading>

        {/* Rating. Numeric average only if the backend actually provides `note` (null in the grid
            today) — never fabricated. The review COUNT is real. */}
        {productData.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
            <Star className="h-3.5 w-3.5 shrink-0 fill-[#FFB020] text-[#FFB020]" aria-hidden="true" />
            {productData.rating != null && (
              <span className="font-semibold text-[#111827] dark:text-white">{productData.rating.toFixed(1)}</span>
            )}
            <span>({productData.reviewCount} avis)</span>
          </div>
        )}

        {/* Price + struck + savings */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-nowrap items-baseline gap-2">
            <span className="whitespace-nowrap text-2xl font-bold tabular-nums text-[#FF5A00]">
              {Math.round(productData.priceDisplay.finalPrice)} DT
            </span>
            {productData.priceDisplay.hasPromo && productData.priceDisplay.oldPrice != null && (
              <span
                className="whitespace-nowrap text-sm text-[#6B7280] line-through tabular-nums"
                aria-label={`Prix barré: ${productData.priceDisplay.oldPrice.toFixed(2)} DT`}
              >
                {Math.round(productData.priceDisplay.oldPrice)} DT
              </span>
            )}
          </div>
          {productData.savings > 0 && (
            <span className="inline-flex w-fit items-center rounded-md bg-[#FF5A00]/10 px-2 py-0.5 text-[11px] font-semibold text-[#FF5A00]">
              Économisez {Math.round(productData.savings)} DT
            </span>
          )}
        </div>

        {/* Trust chips — En stock is per-product; delivery + payment are site-wide constants. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-[#6B7280]">
          <span className="inline-flex items-center gap-1">
            <CircleCheck className={`h-3.5 w-3.5 shrink-0 ${inStock ? 'text-[#22C55E]' : 'text-[#6B7280]'}`} aria-hidden="true" />
            {inStock ? 'En stock' : 'Rupture'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            24–48h
          </span>
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Paiement à la livraison
          </span>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-1">
          <Button
            size="sm"
            className={`flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold leading-none whitespace-nowrap transition-all duration-150 active:scale-[0.98] ${
              inStock && canAddMore
                ? 'bg-[#FF5A00] text-white shadow-md hover:bg-[#E85200] hover:shadow-lg'
                : 'cursor-not-allowed bg-[#E5E7EB] text-[#6B7280] dark:bg-gray-700 dark:text-gray-400'
            }`}
            onClick={handleAddToCart}
            disabled={isAdding || !inStock || !canAddMore}
            aria-label={!canAddMore && inStock ? 'Stock maximum atteint' : `Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="size-4 shrink-0" aria-hidden="true" />
            {!inStock ? (
              <span className="truncate">Rupture de stock</span>
            ) : !canAddMore ? (
              <span className="truncate">Stock max</span>
            ) : isAdding ? (
              <span className="truncate">Ajouté !</span>
            ) : (
              <span className="truncate">Ajouter au panier</span>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
});
