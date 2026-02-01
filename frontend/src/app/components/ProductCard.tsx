'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import type { Product as ApiProduct } from '@/types';
import { useCart } from '@/app/contexts/CartContext';
import { getStorageUrl } from '@/services/api';
import { toast } from 'sonner';
import { hasValidPromo } from '@/util/productPrice';
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
  note?: number;
};

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  badgeText?: string;
  variant?: 'default' | 'compact';
  showDescription?: boolean;
}

export const ProductCard = memo(function ProductCard({ product, showBadge, badgeText, variant = 'default', showDescription = false }: ProductCardProps) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const productData = useMemo(() => {
    const name = (product as any).name || product.designation_fr || '';
    const slug = product.slug || '';
    const image = (product as any).image || (product.cover ? getStorageUrl(product.cover) : '');
    const description = (product as any).description_cover || (product as any).description_fr || '';
    const oldPrice = product.prix ?? (product as any).price ?? 0;
    const validPromo = hasValidPromo(product as any);
    const promoPrice = validPromo && product.promo != null ? product.promo : null;
    const newPrice = promoPrice ?? oldPrice;
    const discount = promoPrice != null && oldPrice > 0 ? Math.round(((oldPrice - promoPrice) / oldPrice) * 100) : 0;
    const isNew = product.new_product === 1;
    const isBestSeller = product.best_seller === 1;
    const rating = product.note || 0;
    const reviews = (product as any).reviews?.filter((r: any) => r.publier === 1) || [];
    const reviewCount = reviews.length;
    const isInStock = (product as any).rupture === 1 || (product as any).rupture === undefined;
    return {
      name,
      slug,
      image,
      description,
      oldPrice,
      promoPrice,
      newPrice,
      discount,
      isNew,
      isBestSeller,
      rating,
      reviewCount,
      isInStock,
    };
  }, [product]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productData.isInStock) {
      toast.error('Rupture de stock');
      return;
    }
    setIsAdding(true);
    addToCart(product as any);
    toast.success('Produit ajouté au panier');
    setTimeout(() => setIsAdding(false), 500);
  }, [productData.isInStock, addToCart, product]);

  const isCompact = variant === 'compact';

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '20px' }}
      transition={{ duration: 0.2 }}
      className={[
        'group flex flex-col h-full w-full overflow-hidden',
        'rounded-[14px] sm:rounded-xl lg:rounded-2xl',
        'bg-white dark:bg-gray-800',
        'border border-gray-200/90 dark:border-gray-700/80',
        'shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
        'sm:shadow-md lg:shadow-lg',
        'transition-[box-shadow,border-color] duration-200',
        '[@media(hover:hover)]:lg:hover:shadow-xl [@media(hover:hover)]:lg:hover:border-red-500/30 [@media(hover:hover)]:lg:dark:hover:border-red-500/30',
      ].join(' ')}
    >
      {/* Image + badges */}
      <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-t-[14px] sm:rounded-t-xl lg:rounded-t-2xl">
        <Link href={`/products/${productData.slug || product.id}`} className="block size-full" aria-label={`Voir ${productData.name}`}>
          {productData.image ? (
            <Image
              src={productData.image}
              alt={productData.name}
              width={400}
              height={400}
              className={`size-full object-contain transition-transform duration-300 ${isCompact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-4'} [@media(hover:hover)]:lg:group-hover:scale-105`}
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={70}
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
            <div className="size-full flex items-center justify-center bg-gray-200 dark:bg-gray-700" aria-hidden="true">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </Link>

        {/* Badges – top-left, small and clean */}
        <div className={`absolute top-2 left-2 z-10 flex flex-col gap-1 ${isCompact ? 'gap-0.5' : 'gap-1'}`}>
          {!productData.isInStock && (
            <Badge className="bg-gray-900 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5 sm:text-xs sm:px-2 sm:py-0.5">
              Rupture
            </Badge>
          )}
          {productData.isInStock && productData.discount > 0 && (
            <Badge className="bg-red-600 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5 sm:text-xs sm:px-2 sm:py-0.5">
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
              {productData.isInStock && productData.promoPrice == null && !showBadge && productData.isNew && (
                <Badge className="bg-blue-600 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5">
                  New
                </Badge>
              )}
              {productData.isInStock && productData.promoPrice == null && !showBadge && productData.isBestSeller && (
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
            disabled={isAdding || !productData.isInStock}
            aria-label={`Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
            {!productData.isInStock ? 'Rupture de stock' : isAdding ? 'Ajouté !' : 'Ajouter au panier'}
          </Button>
        </div>
      </div>

      {/* Content – flex-1 so CTA stays at bottom */}
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-3 lg:p-4">
        <Link href={`/products/${productData.slug || product.id}`} className="block mb-1">
          <h3
            className={`font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug ${isCompact ? 'text-[13px] sm:text-xs min-h-[2.25rem]' : 'text-sm sm:text-base min-h-[2.5rem] sm:min-h-0'}`}
          >
            {productData.name}
          </h3>
        </Link>

        {showDescription && productData.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 mb-2">
            {productData.description}
          </p>
        )}

        {!isCompact && productData.rating > 0 && (
          <div className="flex items-center gap-1 sm:gap-1.5 mb-2" aria-label={`Note: ${productData.rating.toFixed(1)} sur 5`}>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`size-3.5 sm:size-4 ${i < Math.floor(productData.rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600'}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">
              {productData.rating.toFixed(1)}
              {productData.reviewCount > 0 && (
                <span className="text-gray-500 dark:text-gray-400 ml-0.5">({productData.reviewCount})</span>
              )}
            </span>
          </div>
        )}

        {/* Price */}
        <div className={`flex flex-wrap items-baseline gap-1.5 sm:gap-2 mt-auto ${isCompact ? 'mb-0' : 'mb-0'}`}>
          {productData.promoPrice != null && productData.oldPrice !== productData.newPrice ? (
            <>
              <span className={`font-bold text-red-600 dark:text-red-400 tabular-nums ${isCompact ? 'text-sm' : 'text-base sm:text-lg'}`}>
                {productData.newPrice} DT
              </span>
              <span
                className="text-gray-500 dark:text-gray-400 line-through tabular-nums text-[11px] sm:text-xs"
                style={{ textDecorationThickness: '1.5px' }}
                aria-label={`Prix barré: ${productData.oldPrice} DT`}
              >
                {productData.oldPrice} DT
              </span>
              {!isCompact && productData.discount > 0 && (
                <span className="rounded bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-red-700 dark:text-red-400">
                  -{productData.discount}%
                </span>
              )}
            </>
          ) : (
            <span className={`font-bold text-gray-900 dark:text-white tabular-nums ${isCompact ? 'text-sm' : 'text-base sm:text-lg'}`}>
              {productData.newPrice || productData.oldPrice} DT
            </span>
          )}
        </div>

        {/* CTA – always visible on mobile, overlay on desktop hover */}
        <div className="flex-shrink-0 pt-3 mt-2 border-t border-gray-100 dark:border-gray-700/60 lg:hidden block">
          <Button
            size="sm"
            className={`w-full min-h-[44px] rounded-xl font-semibold text-[11px] sm:text-sm active:scale-[0.98] transition-transform duration-150 select-none px-2 ${productData.isInStock ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_2px_8px_rgba(220,38,38,0.35)]' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'}`}
            onClick={handleAddToCart}
            disabled={isAdding || !productData.isInStock}
            aria-label={`Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className={`size-3.5 sm:size-4 shrink-0 mr-1.5 sm:mr-2 ${isCompact ? 'sm:mr-1.5' : ''}`} aria-hidden="true" />
            {!productData.isInStock ? 'Rupture de stock' : isAdding ? 'Ajouté !' : 'Ajouter au panier'}
          </Button>
        </div>
      </div>
    </motion.article>
  );
});
