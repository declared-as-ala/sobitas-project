'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { motion } from 'motion/react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import type { Product as ApiProduct } from '@/types';
import { useCart } from '@/app/contexts/CartContext';
import { getStorageUrl } from '@/services/api';
import { toast } from 'sonner';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import { useState, useMemo, memo, useCallback } from 'react';

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
}

export const ProductCard = memo(function ProductCard({ product, showBadge, badgeText, variant = 'default', showDescription = false, hideCountdown = false }: ProductCardProps) {
  const { addToCart, getCartQty } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = getCartQty(product.id);
  const canAddMore = stockDisponible > 0 && inCartQty < stockDisponible;

  const productData = useMemo(() => {
    const name = (product as any).name || product.designation_fr || '';
    const slug = product.slug || '';
    const image = (product as any).image || (product.cover ? getStorageUrl(product.cover) : '');
    const description = (product as any).description_cover || (product as any).description_fr || '';
    const priceDisplay = getPriceDisplay(product as any);
    const discount =
      priceDisplay.hasPromo && priceDisplay.oldPrice != null && priceDisplay.oldPrice > 0
        ? Math.round(((priceDisplay.oldPrice - priceDisplay.finalPrice) / priceDisplay.oldPrice) * 100)
        : 0;
    const isNew = product.new_product === 1;
    const isBestSeller = product.best_seller === 1;
    const isInStock = (product as any).rupture === 1 || (product as any).rupture === undefined;
    return {
      name,
      slug,
      image,
      description,
      priceDisplay,
      discount,
      isNew,
      isBestSeller,
      isInStock,
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
      toast.error(`Stock insuffisant. Il reste ${stockDisponible - inCartQty} unité(s).`);
      return;
    }
    setIsAdding(true);
    addToCart(product as any, 1);
    toast.success('Produit ajouté au panier');
    setTimeout(() => setIsAdding(false), 500);
  }, [productData.isInStock, stockDisponible, inCartQty, addToCart, product]);

  const isCompact = variant === 'compact';

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '20px' }}
      transition={{ duration: 0.2 }}
      className={[
        'group flex flex-col h-full w-full min-w-0 overflow-hidden',
        'rounded-[14px] sm:rounded-xl lg:rounded-2xl',
        'bg-white dark:bg-gray-800',
        'border border-gray-200/90 dark:border-gray-700/80',
        'shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
        'sm:shadow-md lg:shadow-lg',
        'transition-[box-shadow,border-color,transform] duration-300',
        '[@media(hover:hover)]:lg:hover:shadow-2xl [@media(hover:hover)]:lg:hover:border-red-500/40 [@media(hover:hover)]:lg:dark:hover:border-red-500/40 [@media(hover:hover)]:lg:hover:-translate-y-1',
      ].join(' ')}
    >
      {/* Image area: square aspect, subtle bg, contained centered image */}
      <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden rounded-t-[14px] sm:rounded-t-xl lg:rounded-t-2xl bg-gray-50 dark:bg-gray-100/80 flex items-center justify-center">

        <LinkWithLoading 
          href={`/shop/${encodeURIComponent(productData.slug || String(product.id))}`} 
          className={`block size-full flex items-center justify-center ${isCompact ? 'p-2 md:p-3' : 'p-3 md:p-4 lg:p-5'}`}
          aria-label={`Voir ${productData.name}`}
          loadingMessage={`Chargement de ${productData.name}...`}
        >
          {productData.image ? (
            <Image
              src={productData.image}
              alt={productData.name}
              width={400}
              height={400}
              className="size-full object-contain transition-transform duration-300 [@media(hover:hover)]:lg:group-hover:scale-105 [@media(hover:hover)]:lg:transition-transform [@media(hover:hover)]:lg:duration-500"
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              quality={75}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.error-placeholder')) {
                  const ph = document.createElement('div');
                  ph.className = 'error-placeholder size-full flex items-center justify-center bg-gray-200 dark:bg-gray-700';
                  ph.innerHTML = '<svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>';
                  parent.appendChild(ph);
                }
              }}
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-gray-200/50 dark:bg-gray-700/50" aria-hidden="true">
              <ShoppingCart className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
            </div>
          )}
        </LinkWithLoading>

        {/* Badges – top-left, fixed position, no layout shift */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
          {!productData.isInStock && (
            <Badge className="w-fit bg-gray-800 text-white border-0 font-semibold text-[10px] px-2 py-0.5 sm:text-xs shadow-sm">
              Rupture
            </Badge>
          )}
          {productData.isInStock && productData.priceDisplay.hasPromo && productData.discount > 0 && (
            <Badge className="w-fit bg-red-600 text-white border-0 font-semibold text-[10px] px-2 py-0.5 sm:text-xs shadow-sm">
              -{productData.discount}%
            </Badge>
          )}
          {!isCompact && (
            <>
              {productData.isInStock && showBadge && badgeText && (
                <Badge className="bg-green-600 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5">
                  {badgeText}
                </Badge>
              )}
              {productData.isInStock && !productData.priceDisplay.hasPromo && !showBadge && productData.isNew && (
                <Badge className="bg-blue-600 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5">
                  New
                </Badge>
              )}
              {productData.isInStock && !productData.priceDisplay.hasPromo && !showBadge && productData.isBestSeller && (
                <Badge className="bg-amber-600 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5">
                  Top Vendu
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Desktop only: hover overlay CTA (no hover on touch) */}
        <div
          className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent hidden opacity-0 transition-opacity duration-200 [@media(hover:hover)]:lg:block [@media(hover:hover)]:lg:group-hover:opacity-100 pointer-events-none [@media(hover:hover)]:lg:group-hover:pointer-events-auto"
          aria-hidden="true"
        >
          <Button
            size="sm"
            className="w-full min-h-[44px] bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
            onClick={handleAddToCart}
            disabled={isAdding || !productData.isInStock || !canAddMore}
            aria-label={!canAddMore && productData.isInStock ? 'Stock maximum atteint' : `Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
            {!productData.isInStock || stockDisponible <= 0 ? 'Rupture de stock' : !canAddMore ? 'Stock max' : isAdding ? 'Ajouté !' : 'Ajouter au panier'}
          </Button>
        </div>
      </div>

      {/* Content – reduced padding, typography tuned for md */}
      <div className="flex flex-col flex-1 min-h-0 p-2.5 sm:p-3 md:p-3 lg:p-4">
        <LinkWithLoading 
          href={`/shop/${encodeURIComponent(productData.slug || String(product.id))}`} 
          className="block mb-0.5 md:mb-1"
          loadingMessage={`Chargement de ${productData.name}...`}
        >
          <h3
            className={`font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight md:leading-snug transition-colors group-hover:text-red-600 dark:group-hover:text-red-400 ${isCompact ? 'text-[13px] sm:text-sm md:text-[15px] lg:text-base' : 'text-sm sm:text-base md:text-[15px] lg:text-base'}`}
          >
            {productData.name}
          </h3>
        </LinkWithLoading>

        {showDescription && productData.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 mb-2">
            {productData.description}
          </p>
        )}

        {/* No rating/avis on listing cards – only on product detail page */}
        {/* Price – promo + old price only when hasPromo (active promo, not expired) */}
        <div className={`flex flex-wrap items-baseline gap-1 sm:gap-1.5 md:gap-2 mt-auto ${isCompact ? 'mb-0' : 'mb-0'}`}>
          {productData.priceDisplay.hasPromo && productData.priceDisplay.oldPrice != null ? (
            <>
              <span className={`font-bold text-red-600 dark:text-red-400 tabular-nums ${isCompact ? 'text-sm' : 'text-base sm:text-lg md:text-xl'}`}>
                {productData.priceDisplay.finalPrice} DT
              </span>
              <span
                className="text-gray-500 dark:text-gray-400 line-through tabular-nums text-[10px] sm:text-[11px] md:text-xs"
                style={{ textDecorationThickness: '1.5px' }}
                aria-label={`Prix barré: ${productData.priceDisplay.oldPrice} DT`}
              >
                {productData.priceDisplay.oldPrice} DT
              </span>
              {!isCompact && productData.discount > 0 && (
                <span className="rounded bg-red-100 dark:bg-red-950/50 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] md:text-xs font-semibold text-red-700 dark:text-red-400 ml-0.5 sm:ml-0">
                  -{productData.discount}%
                </span>
              )}
            </>
          ) : (
            <span className={`font-bold text-gray-900 dark:text-white tabular-nums ${isCompact ? 'text-sm' : 'text-base sm:text-lg md:text-xl'}`}>
              {productData.priceDisplay.finalPrice} DT
            </span>
          )}
        </div>

        {/* CTA – always visible on mobile/tablet, overlay on desktop hover */}
        <div className="flex-shrink-0 pt-2 md:pt-3 mt-1.5 md:mt-2 border-t border-gray-100 dark:border-gray-700/60 lg:hidden block">
          <Button
            size="sm"
            className={`w-full min-h-[44px] rounded-xl font-semibold text-[10px] xs:text-[11px] sm:text-sm active:scale-[0.98] transition-transform duration-150 select-none px-1.5 sm:px-2 ${productData.isInStock && canAddMore ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_2px_8px_rgba(220,38,38,0.35)]' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'}`}
            onClick={handleAddToCart}
            disabled={isAdding || !productData.isInStock || !canAddMore}
            aria-label={`Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className={`size-3.5 sm:size-4 shrink-0 mr-1 sm:mr-1.5 md:mr-2 ${isCompact ? 'sm:mr-1.5' : ''}`} aria-hidden="true" />
            <span className="truncate max-w-full">
              {!productData.isInStock || stockDisponible <= 0 ? (
                <><span className="hidden min-[360px]:inline">Rupture de stock</span><span className="min-[360px]:hidden">Rupture</span></>
              ) : !canAddMore ? (
                <><span className="hidden min-[360px]:inline">Stock max</span><span className="min-[360px]:hidden">Max</span></>
              ) : isAdding ? (
                'Ajouté !'
              ) : (
                <><span className="hidden min-[360px]:inline">Ajouter au panier</span><span className="min-[360px]:hidden">Panier</span></>
              )}
            </span>
          </Button>
        </div>
      </div>
    </motion.article>
  );
});
