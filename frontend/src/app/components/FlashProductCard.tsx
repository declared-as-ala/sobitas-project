'use client';

import Image from 'next/image';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ShoppingCart, Flame, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { getStorageUrl } from '@/services/api';
import { useCart } from '@/app/contexts/CartContext';
import { toast } from 'sonner';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible, isInStock } from '@/util/cartStock';
import { buildProductUrlPath } from '@/util/productUrl';
import { buildProductAlt } from '@/util/productAlt';
import { useState, useMemo, memo, useCallback } from 'react';

type FlashProduct = {
  id: number;
  name?: string;
  designation_fr?: string;
  price?: number | null;
  prix?: number;
  image?: string | null;
  cover?: string;
  slug?: string;
  promo?: number;
  promo_expiration_date?: string;
  rupture?: number;
  [key: string]: unknown;
};

interface FlashProductCardProps {
  product: FlashProduct;
}

export const FlashProductCard = memo(function FlashProductCard({ product }: FlashProductCardProps) {
  const { addToCart, getCartQty } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [hasError, setHasError] = useState(false);
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = getCartQty(product.id);
  const canAddMore = stockDisponible > 0 && inCartQty < stockDisponible;

  const productData = useMemo(() => {
    const name = product.name || product.designation_fr || '';
    const slug = product.slug || '';
    const image = product.image || (product.cover ? getStorageUrl(product.cover) : '');
    const priceDisplay = getPriceDisplay(product);
    const discount =
      priceDisplay.hasPromo && priceDisplay.oldPrice != null && priceDisplay.oldPrice > 0
        ? Math.round(((priceDisplay.oldPrice - priceDisplay.finalPrice) / priceDisplay.oldPrice) * 100)
        : 0;
    return {
      name,
      slug,
      image,
      priceDisplay,
      discount,
      isInStock: isInStock(product as any),
    };
  }, [product]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productData.isInStock || stockDisponible <= 0) {
      toast.error('Rupture de stock');
      return;
    }
    if (inCartQty >= stockDisponible) {
      toast.error(`Stock insuffisant. Il reste ${Math.max(0, stockDisponible - inCartQty)} unité(s).`);
      return;
    }
    setIsAdding(true);
    addToCart(product as any, 1);
    toast.success('Produit ajouté au panier');
    setTimeout(() => setIsAdding(false), 500);
  }, [productData.isInStock, stockDisponible, inCartQty, addToCart, product]);

  // Determine which badges to show – only the red promo discount (one-accent discipline).
  const badges = useMemo(() => {
    const badgeList: Array<{ text: string }> = [];
    if (productData.priceDisplay.hasPromo && productData.discount > 0) {
      badgeList.push({ text: `-${productData.discount}%` });
    }
    return badgeList;
  }, [productData.priceDisplay.hasPromo, productData.discount]);

  return (
    <article className="group relative flex flex-col h-full w-full overflow-hidden rounded-xl lg:rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm transition-shadow duration-300 [@media(hover:hover)]:hover:shadow-xl">
      {/* Image Container - Fixed height to prevent layout shift */}
      <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden bg-gray-50 dark:bg-gray-900 rounded-t-xl lg:rounded-t-2xl">
        <LinkWithLoading
          href={buildProductUrlPath(product as any)}
          className="block size-full"
          aria-label={`Voir ${productData.name}`}
          loadingMessage="Chargement"
        >
          {productData.image && !hasError ? (
            <Image
              src={productData.image}
              alt={buildProductAlt(product as any, { name: productData.name })}
              width={500}
              height={500}
              className="size-full object-contain p-3 sm:p-4 md:p-5 lg:p-6 transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105"
              loading="lazy"
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 46vw, (max-width: 1280px) 32vw, 24vw"
              quality={75}
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-gray-200 dark:bg-gray-700" aria-hidden="true">
              <ShoppingCart className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </LinkWithLoading>

        {/* Badges - Top-left. One-accent: red = promo; meta = clean white chip with red icon. */}
        {!productData.isInStock && (
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10">
            <span className="inline-flex items-center rounded-md bg-gray-900 text-white font-display font-semibold uppercase tracking-wide text-[10px] sm:text-xs px-2 py-0.5 shadow-sm">
              Rupture
            </span>
          </div>
        )}

        {productData.isInStock && badges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 flex flex-col items-start gap-1 sm:gap-1.5 max-w-[calc(100%-1.5rem)]">
            {badges.map((badge, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white font-display font-bold uppercase tabular-nums tracking-wide text-[10px] sm:text-xs px-2 py-0.5 shadow-sm"
              >
                <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{badge.text}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Section – flexible layout for very small screens */}
      <div className="relative flex flex-col flex-1 min-h-0 min-w-0 p-2 max-[320px]:p-1.5 max-[360px]:p-2 sm:p-4 md:p-5 overflow-hidden">
        {/* Product Name – 2 lines on very small, 3 on larger mobile; full name in title for tooltip */}
        <LinkWithLoading
          href={buildProductUrlPath(product as any)}
          className="block mb-1.5 sm:mb-2.5 min-w-0 flex-shrink-0"
          loadingMessage="Chargement"
        >
          <h3
            title={productData.name}
            className="font-bold text-gray-900 dark:text-white leading-snug overflow-hidden transition-colors [@media(hover:hover)]:group-hover:text-red-600 dark:[@media(hover:hover)]:group-hover:text-red-400 text-sm max-[360px]:text-xs sm:text-base md:text-lg line-clamp-4 min-[361px]:line-clamp-3"
          >
            {productData.name}
          </h3>
        </LinkWithLoading>

        {/* No rating/avis on listing cards – only on product detail page */}
        {/* Pricing – promo + old price only when hasPromo (active promo, not expired) */}
        <div className="flex flex-wrap items-baseline gap-2 mb-3 sm:mb-4 mt-auto">
          {productData.priceDisplay.hasPromo && productData.priceDisplay.oldPrice != null ? (
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <span className="font-display font-bold tracking-tight text-red-600 dark:text-red-400 tabular-nums text-xl sm:text-2xl md:text-3xl">
                  {productData.priceDisplay.finalPrice.toFixed(2)} DT
                </span>
                {productData.discount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-display font-bold tabular-nums text-[10px] sm:text-xs whitespace-nowrap">
                    -{productData.discount}%
                  </span>
                )}
              </div>
              <span
                className="font-display text-gray-400 dark:text-gray-500 line-through tabular-nums text-sm sm:text-base"
                style={{ textDecorationThickness: '2px' }}
                aria-label={`Prix barré: ${productData.priceDisplay.oldPrice.toFixed(2)} DT`}
              >
                {productData.priceDisplay.oldPrice.toFixed(2)} DT
              </span>
            </div>
          ) : (
            <span className="font-display font-bold tracking-tight text-gray-900 dark:text-white tabular-nums text-xl sm:text-2xl md:text-3xl">
              {productData.priceDisplay.finalPrice.toFixed(2)} DT
            </span>
          )}
        </div>

        {/* CTA Button – "Ajouter" on mobile (one line), longer label on desktop */}
        <div className="mt-auto pt-1.5 max-[360px]:pt-1 sm:pt-2.5">
          <Button
            size="lg"
            className={`w-full min-h-[44px] sm:min-h-[46px] md:min-h-[48px] rounded-xl font-display uppercase tracking-wide font-semibold text-xs max-[360px]:text-[11px] leading-snug sm:text-sm sm:leading-normal transition-all duration-200 whitespace-nowrap ${productData.isInStock && canAddMore ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'}`}
            onClick={handleAddToCart}
            disabled={isAdding || !productData.isInStock || !canAddMore}
            aria-label={!canAddMore && productData.isInStock ? 'Stock maximum atteint' : `Ajouter ${productData.name} au panier`}
          >
            {isAdding ? (
              <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0" aria-hidden="true" />
            ) : (
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">
              {!productData.isInStock || stockDisponible <= 0
                ? 'Rupture'
                : !canAddMore
                ? 'Stock max'
                : isAdding
                ? 'Ajouté !'
                : (
                  <>
                    <span className="sm:hidden">Ajouter</span>
                    <span className="hidden sm:inline">Acheter maintenant</span>
                  </>
                )}
            </span>
          </Button>
        </div>
      </div>
    </article>
  );
});
