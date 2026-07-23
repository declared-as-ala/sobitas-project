'use client';

import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ShoppingCart, Heart, Flame, Sparkles, TrendingUp } from 'lucide-react';
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

  const isCompact = variant === 'compact';

  return (
    <article
      /* Editorial Minimal surface: a hairline border + restrained shadow, replacing the arbitrary
         shadow stack (DESIGN_SYSTEM §3 asks for exactly this and the old values predated it).
         MUST stay identical to ProductCardSkeleton's root or the swap shifts layout. */
      className={[
        'group flex flex-col h-full w-full min-w-0 overflow-hidden',
        'rounded-xl lg:rounded-2xl',
        'bg-white dark:bg-gray-900',
        'border border-gray-100 dark:border-gray-800',
        'shadow-sm',
        'transition-shadow duration-200 ease-out',
        '[@media(hover:hover)]:hover:shadow-md',
      ].join(' ')}
    >
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

        {/* Favoris – top-right */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(toFavoriteProduct(product)); }}
          /* Dropped `backdrop-blur-sm` and `hover:scale-110`: DESIGN_SYSTEM §3 bans decorative
             backdrop-blur and §4 asks for quiet hovers. A blur here also forces an extra
             compositing layer on every card in the grid, for no visual gain over a solid chip. */
          /* 36px (was 44px, ~25% of a 173px card) so the chip stops dominating the packshot.
             Aligned to the same top-2.5/right-2.5 inset as the badges on the left. */
          className="absolute top-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 dark:bg-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10 hover:bg-white dark:hover:bg-gray-700 transition-colors pointer-events-auto"
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-[18px] w-[18px] ${favorite ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
        </button>

        {/* Badges – top-left. One-accent discipline: red = promo only; meta badges are clean
            white chips with a small red icon. All in the Archivo display face, uppercase. */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 flex flex-col items-start gap-1 sm:gap-1.5 pointer-events-none">
          {!productData.isInStock && (
            <span className="inline-flex items-center rounded-md bg-gray-900 text-white font-display font-semibold uppercase tracking-wide text-[10px] sm:text-xs px-2 py-0.5 shadow-sm">
              Rupture
            </span>
          )}
          {productData.isInStock && productData.priceDisplay.hasPromo && productData.discount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white font-display font-bold tabular-nums tracking-wide text-[10px] sm:text-xs px-2 py-0.5 shadow-sm">
              <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
              -{productData.discount}%
            </span>
          )}
          {!isCompact && (
            <>
              {productData.isInStock && showBadge && badgeText && (
                <span className="inline-flex items-center rounded-md bg-white/95 dark:bg-gray-900/90 text-gray-900 dark:text-white font-display font-semibold uppercase tracking-wide text-[10px] sm:text-xs px-2 py-0.5 shadow-sm ring-1 ring-gray-900/10 dark:ring-white/10">
                  {badgeText}
                </span>
              )}
              {productData.isInStock && !productData.priceDisplay.hasPromo && !showBadge && productData.isNew && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white/95 dark:bg-gray-900/90 text-gray-900 dark:text-white font-display font-semibold uppercase tracking-wide text-[10px] sm:text-xs px-2 py-0.5 shadow-sm ring-1 ring-gray-900/10 dark:ring-white/10">
                  <Sparkles className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                  Nouveau
                </span>
              )}
              {productData.isInStock && !productData.priceDisplay.hasPromo && !showBadge && productData.isBestSeller && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white/95 dark:bg-gray-900/90 text-gray-900 dark:text-white font-display font-semibold uppercase tracking-wide text-[10px] sm:text-xs px-2 py-0.5 shadow-sm ring-1 ring-gray-900/10 dark:ring-white/10">
                  <TrendingUp className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                  Top vendu
                </span>
              )}
            </>
          )}
        </div>

      </div>

      {/* Content – clean padding, no top gap since image is flush */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 px-3 py-3 sm:px-4 sm:py-4 gap-2 sm:gap-2.5">
        <LinkWithLoading
          href={buildProductUrlPath(product as any)}
          className="block min-w-0"
          loadingMessage="Chargement"
        >
          <h3
            title={productData.name}
            /* text-[13px] (was text-xs/12px, the "squeezed" size) and a reserved 2-line height so
               1-line and 2-line names occupy the same box — no jitter vs the skeleton, no ragged
               grid rows. */
            className={`font-bold text-gray-900 dark:text-white leading-snug overflow-hidden transition-colors [@media(hover:hover)]:hover:text-red-600 dark:[@media(hover:hover)]:hover:text-red-400 line-clamp-2
              ${isCompact ? 'text-[13px] sm:text-base' : 'text-[13px] sm:text-sm lg:text-[15px] min-h-[2.5rem] sm:min-h-[2.6rem]'}`}
          >
            {productData.name}
          </h3>
        </LinkWithLoading>

        {showDescription && productData.description && (
          <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {productData.description}
          </p>
        )}

        {/* Price. flex-NOWRAP + baseline: at ~150px content width the struck old price used to
            wrap to a second line on every promo card (a jagged 2-line block). Current price is
            slightly smaller on mobile (text-base) and the old price is text-[11px] so both sit on
            one line. */}
        <div className="mt-auto flex flex-nowrap items-baseline gap-1.5 min-w-0">
          {productData.priceDisplay.hasPromo && productData.priceDisplay.oldPrice != null ? (
            <>
              <span className={`font-display font-bold tracking-tight text-red-600 dark:text-red-400 tabular-nums whitespace-nowrap ${isCompact ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl lg:text-2xl'}`}>
                {productData.priceDisplay.finalPrice.toFixed(2)} DT
              </span>
              <span
                className="font-display text-gray-400 dark:text-gray-500 line-through tabular-nums whitespace-nowrap text-[11px] leading-none sm:text-sm"
                style={{ textDecorationThickness: '1.5px' }}
                aria-label={`Prix barré: ${productData.priceDisplay.oldPrice.toFixed(2)} DT`}
              >
                {productData.priceDisplay.oldPrice.toFixed(2)} DT
              </span>
            </>
          ) : (
            <span className={`font-display font-bold tracking-tight text-gray-900 dark:text-white tabular-nums whitespace-nowrap ${isCompact ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl lg:text-2xl'}`}>
              {productData.priceDisplay.finalPrice.toFixed(2)} DT
            </span>
          )}
        </div>

        {/* CTA – single responsive add-to-cart button */}
        <div className="flex-shrink-0 pt-2.5 sm:pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
          <Button
            size="sm"
            /* whitespace-nowrap: the label used to wrap to "Ajouter au / panier" (two lines) on
               narrow cards, which also grew the button taller than the skeleton reserved. One line
               now; the mobile label is shortened to "Ajouter" so it always fits ~2-col width. */
            className={`flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2.5 font-semibold text-xs sm:text-sm leading-none whitespace-nowrap active:scale-[0.98] transition-all duration-150 select-none ${productData.isInStock && canAddMore ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'}`}
            onClick={handleAddToCart}
            disabled={isAdding || !productData.isInStock || !canAddMore}
            aria-label={!canAddMore && productData.isInStock ? 'Stock maximum atteint' : `Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="size-4 shrink-0" aria-hidden="true" />
            {!productData.isInStock || stockDisponible <= 0 ? (
              <span className="truncate">Rupture de stock</span>
            ) : !canAddMore ? (
              <span className="truncate">Stock max</span>
            ) : isAdding ? (
              <span className="truncate">Ajouté !</span>
            ) : (
              <>
                <span className="truncate sm:hidden">Ajouter</span>
                <span className="hidden truncate sm:inline">Ajouter au panier</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
});
