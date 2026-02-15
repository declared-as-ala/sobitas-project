'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { motion } from 'motion/react';
import { ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { getStorageUrl } from '@/services/api';
import { useCart } from '@/app/contexts/CartContext';
import { toast } from 'sonner';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
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
  note?: number;
  reviews_count?: number;
  reviews?: Array<{ publier?: number }>;
  rupture?: number;
  [key: string]: unknown;
};

interface FlashProductCardProps {
  product: FlashProduct;
}

export const FlashProductCard = memo(function FlashProductCard({ product }: FlashProductCardProps) {
  const { addToCart, getCartQty } = useCart();
  const [isAdding, setIsAdding] = useState(false);
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
    const rating = product.note || 0;
    const reviewsCountValue = product.reviews_count;
    const reviewsArrayCount = (product.reviews?.filter((r) => r.publier === 1) || []).length;
    let reviewCount = 0;
    if (reviewsCountValue != null && reviewsCountValue !== undefined) {
      reviewCount = Number(reviewsCountValue) || 0;
    } else if (reviewsArrayCount > 0) {
      reviewCount = reviewsArrayCount;
    }
    const isInStock = (product as any).rupture === 1 || (product as any).rupture === undefined;
    return {
      name,
      slug,
      image,
      priceDisplay,
      discount,
      rating,
      reviewCount,
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
      toast.error(`Stock insuffisant. Il reste ${Math.max(0, stockDisponible - inCartQty)} unité(s).`);
      return;
    }
    setIsAdding(true);
    addToCart(product as any, 1);
    toast.success('Produit ajouté au panier');
    setTimeout(() => setIsAdding(false), 500);
  }, [productData.isInStock, stockDisponible, inCartQty, addToCart, product]);

  // Determine which badges to show (max 2) – only when promo is active
  const badges = useMemo(() => {
    const badgeList: Array<{ text: string; color: 'red' | 'green' }> = [];
    if (productData.priceDisplay.hasPromo && productData.discount > 0) {
      badgeList.push({ text: `-${productData.discount}%`, color: 'red' });
    }
    if (productData.priceDisplay.hasPromo && productData.isInStock) {
      badgeList.push({ text: 'Promo', color: 'green' });
    }
    return badgeList.slice(0, 2);
  }, [productData.priceDisplay.hasPromo, productData.discount, productData.isInStock]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '20px' }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col h-full w-full overflow-hidden rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:scale-[1.03] hover:border-red-300 dark:hover:border-red-700"
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/0 to-orange-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
        initial={false}
      />
      
      {/* Urgency indicator bar */}
      {productData.discount > 0 && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 z-20"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      )}
      {/* Image Container - Fixed height to prevent layout shift */}
      <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-t-3xl">
        <LinkWithLoading 
          href={`/product/${encodeURIComponent(productData.slug || String(product.id))}`} 
          className="block size-full" 
          aria-label={`Voir ${productData.name}`}
          loadingMessage={`Chargement de ${productData.name}...`}
        >
          {productData.image ? (
            <Image
              src={productData.image}
              alt={productData.name}
              width={500}
              height={500}
              className="size-full object-contain p-3 sm:p-4 md:p-5 lg:p-6 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              quality={80}
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
              <ShoppingCart className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </LinkWithLoading>

        {/* Badges - Top-left, stacked cleanly with animations */}
        {!productData.isInStock && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10"
          >
            <span className="inline-flex items-center justify-center rounded-lg bg-gray-900 text-white border-0 font-bold text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 shadow-xl backdrop-blur-sm">
              Rupture
            </span>
          </motion.div>
        )}
        
        {productData.isInStock && badges.length > 0 && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 flex flex-col gap-1 sm:gap-1.5 max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-1.5rem)]">
            {badges.map((badge, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                className={`inline-flex items-center justify-center rounded-lg text-white border-0 font-black text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 shadow-2xl backdrop-blur-sm whitespace-nowrap ${
                  badge.color === 'red' 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 border-2 border-red-400/50' 
                    : 'bg-gradient-to-r from-green-600 to-green-700 border-2 border-green-400/50'
                }`}
              >
                {badge.color === 'red' && (
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                    className="mr-0.5 sm:mr-1 flex-shrink-0"
                  >
                    ⚡
                  </motion.span>
                )}
                <span className="truncate">{badge.text}</span>
              </motion.span>
            ))}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="relative flex flex-col flex-1 min-h-0 p-3 sm:p-4 md:p-5 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 overflow-hidden">
        {/* Product Name */}
        <LinkWithLoading 
          href={`/product/${encodeURIComponent(productData.slug || String(product.id))}`} 
          className="block mb-2 sm:mb-2.5"
          loadingMessage={`Chargement de ${productData.name}...`}
        >
          <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug transition-colors group-hover:text-red-600 dark:group-hover:text-red-400 text-sm sm:text-base md:text-lg min-h-[2.5rem] sm:min-h-[2.75rem]">
            {productData.name}
          </h3>
        </LinkWithLoading>

        {/* Ratings & Reviews */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-3 flex-wrap">
          {productData.rating > 0 ? (
            <div className="flex gap-0.5 items-center" aria-label={`Note: ${productData.rating.toFixed(1)} sur 5`}>
              {[...Array(5)].map((_, i) => {
                const isFilled = productData.rating >= (i + 1);
                return (
                  <Star
                    key={i}
                    className={`size-3.5 sm:size-4 flex-shrink-0 ${isFilled ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600'}`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex gap-0.5 items-center flex-shrink-0" aria-label="Aucune note">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="size-3.5 sm:size-4 fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
          
          {productData.reviewCount > 0 ? (
            <LinkWithLoading
              href={`/product/${encodeURIComponent(productData.slug || String(product.id))}#reviews`}
              className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors whitespace-nowrap"
            >
              ({productData.reviewCount} avis{productData.reviewCount > 1 ? 's' : ''})
            </LinkWithLoading>
          ) : (
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">
              {productData.rating > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <span className="whitespace-nowrap">Soyez le premier à noter</span>
                  <span className="text-amber-400">⭐</span>
                </span>
              ) : (
                'Nouveau produit'
              )}
            </span>
          )}
        </div>

        {/* Pricing – promo + old price only when hasPromo (active promo, not expired) */}
        <div className="flex flex-wrap items-baseline gap-2 mb-3 sm:mb-4 mt-auto">
          {productData.priceDisplay.hasPromo && productData.priceDisplay.oldPrice != null ? (
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <motion.span
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="font-black text-red-600 dark:text-red-400 tabular-nums text-xl sm:text-2xl md:text-3xl"
                >
                  {productData.priceDisplay.finalPrice} DT
                </motion.span>
                {productData.discount > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold text-[10px] sm:text-xs whitespace-nowrap"
                  >
                    -{productData.discount}%
                  </motion.span>
                )}
              </div>
              <span
                className="text-gray-400 dark:text-gray-500 line-through tabular-nums text-sm sm:text-base font-semibold"
                style={{ textDecorationThickness: '2px' }}
                aria-label={`Prix barré: ${productData.priceDisplay.oldPrice} DT`}
              >
                {productData.priceDisplay.oldPrice} DT
              </span>
            </div>
          ) : (
            <span className="font-black text-gray-900 dark:text-white tabular-nums text-xl sm:text-2xl md:text-3xl">
              {productData.priceDisplay.finalPrice} DT
            </span>
          )}
        </div>

        {/* CTA Button - Always visible with enhanced design, constrained to card */}
        <div className="mt-auto pt-2 sm:pt-2.5">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full"
          >
            <Button
              size="lg"
              className="w-full min-h-[44px] sm:min-h-[48px] rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-red-600 via-red-600 to-orange-600 hover:from-red-700 hover:via-red-700 hover:to-orange-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group/btn"
              onClick={handleAddToCart}
              disabled={isAdding || !productData.isInStock || !canAddMore}
              aria-label={!canAddMore && productData.isInStock ? 'Stock maximum atteint' : `${productData.isInStock ? 'Acheter' : 'Rupture de stock'} ${productData.name}`}
            >
              {/* Shine effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full"
                transition={{ duration: 0.6 }}
              />
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 relative z-10 flex-shrink-0" aria-hidden="true" />
              <span className="relative z-10 truncate">
                {!productData.isInStock || stockDisponible <= 0
                  ? 'Rupture de stock'
                  : !canAddMore
                  ? 'Stock max' 
                  : isAdding 
                  ? 'Ajouté ! ✓' 
                  : 'Acheter maintenant'}
              </span>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
});
