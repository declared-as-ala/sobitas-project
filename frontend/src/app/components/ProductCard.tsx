'use client';

import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { motion } from 'motion/react';
import { ShoppingCart, Heart } from 'lucide-react';
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
  imageContext?: 'default' | 'packs';
}

function toFavoriteProduct(product: Product): { id: number; designation_fr: string; slug?: string; cover?: string; prix?: number; promo?: number | null; rupture?: number } {
  const p = product as any;
  return {
    id: product.id,
    designation_fr: p.name || product.designation_fr || '',
    slug: product.slug,
    cover: product.cover,
    prix: p.prix ?? p.price ?? product.prix,
    promo: p.promo ?? undefined,
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
}: ProductCardProps) {
  const { addToCart, getCartQty } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isAdding, setIsAdding] = useState(false);
  const favorite = isFavorite(product.id);
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
  }, [product, imageContext]);

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
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '20px' }}
      transition={{ duration: 0.2 }}
      className={[
        'group flex flex-col h-full w-full min-w-0 overflow-hidden',
        'rounded-xl lg:rounded-2xl',
        'bg-white dark:bg-gray-800',
        'border-0',
        'shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]',
        'transition-all duration-300 ease-out',
        '[@media(hover:hover)]:hover:shadow-[0_8px_30px_rgba(0,0,0,0.16)] [@media(hover:hover)]:dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] [@media(hover:hover)]:hover:-translate-y-1',
      ].join(' ')}
    >
      <div className="relative">
        <PackCardImage
          imageSrc={productData.image}
          productName={productData.name}
          productId={product.id}
          slug={productData.slug}
          mode={productData.imagePresentation.mode}
          objectPosition={productData.imagePresentation.objectPosition}
          scale={productData.imagePresentation.scale}
        />

        {/* Favoris – top-right */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(toFavoriteProduct(product)); }}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 dark:bg-gray-700/95 shadow-sm backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-all hover:scale-110 pointer-events-auto"
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${favorite ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
        </button>

        {/* Badges – top-left */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
          {!productData.isInStock && (
            <span className="inline-flex items-center rounded-md bg-gray-900/90 dark:bg-gray-900 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 shadow-md backdrop-blur-sm">
              Rupture
            </span>
          )}
          {productData.isInStock && productData.priceDisplay.hasPromo && productData.discount > 0 && (
            <span className="inline-flex items-center rounded-md bg-red-600 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 shadow-md">
              -{productData.discount}%
            </span>
          )}
          {!isCompact && (
            <>
              {productData.isInStock && showBadge && badgeText && (
                <span className="inline-flex items-center rounded-md bg-green-600 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 shadow-md">
                  {badgeText}
                </span>
              )}
              {productData.isInStock && !productData.priceDisplay.hasPromo && !showBadge && productData.isNew && (
                <span className="inline-flex items-center rounded-md bg-blue-600 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 shadow-md">
                  New
                </span>
              )}
              {productData.isInStock && !productData.priceDisplay.hasPromo && !showBadge && productData.isBestSeller && (
                <span className="inline-flex items-center rounded-md bg-amber-500 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 shadow-md">
                  Top Vendu
                </span>
              )}
            </>
          )}
        </div>

        {/* Desktop only: hover overlay CTA (Ajouter au panier) */}
        <div
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent hidden opacity-0 transition-opacity duration-300 [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:opacity-100 pointer-events-none [@media(hover:hover)]:group-hover:pointer-events-auto"
          aria-hidden="true"
        >
          <Button
            size="sm"
            className="w-full min-h-[44px] bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            onClick={handleAddToCart}
            disabled={isAdding || !productData.isInStock || !canAddMore}
            aria-label={!canAddMore && productData.isInStock ? 'Stock maximum atteint' : `Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
            {!productData.isInStock || stockDisponible <= 0 ? 'Rupture' : !canAddMore ? 'Stock max' : isAdding ? 'Ajouté !' : 'Ajouter au panier'}
          </Button>
        </div>
      </div>

      {/* Content – clean padding, no top gap since image is flush */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 px-4 py-4 gap-2.5">
        <LinkWithLoading
          href={`/shop/${encodeURIComponent(productData.slug || String(product.id))}`}
          className="block min-w-0"
          loadingMessage="Chargement"
        >
          <h3
            title={productData.name}
            className={`font-bold text-gray-900 dark:text-white leading-snug overflow-hidden transition-colors [@media(hover:hover)]:hover:text-red-600 dark:[@media(hover:hover)]:hover:text-red-400 line-clamp-2
              ${isCompact ? 'text-sm sm:text-base' : 'text-sm sm:text-base lg:text-[15px]'}`}
          >
            {productData.name}
          </h3>
        </LinkWithLoading>

        {showDescription && productData.description && (
          <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {productData.description}
          </p>
        )}

        {/* Price – clean layout with prominent current price and subtle old price */}
        <div className="flex flex-wrap items-center gap-2 mt-auto">
          {productData.priceDisplay.hasPromo && productData.priceDisplay.oldPrice != null ? (
            <>
              <span className={`font-extrabold text-red-600 dark:text-red-400 tabular-nums ${isCompact ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl'}`}>
                {productData.priceDisplay.finalPrice} DT
              </span>
              <span
                className="text-gray-400 dark:text-gray-500 line-through tabular-nums text-xs sm:text-sm"
                style={{ textDecorationThickness: '1.5px' }}
                aria-label={`Prix barré: ${productData.priceDisplay.oldPrice} DT`}
              >
                {productData.priceDisplay.oldPrice} DT
              </span>
            </>
          ) : (
            <span className={`font-extrabold text-gray-900 dark:text-white tabular-nums ${isCompact ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl'}`}>
              {productData.priceDisplay.finalPrice} DT
            </span>
          )}
        </div>

        {/* CTA – mobile/tablet visible, desktop hidden (overlay is used) */}
        <div className="flex-shrink-0 pt-3 mt-1 border-t border-gray-100 dark:border-gray-700 lg:hidden block">
          <Button
            size="sm"
            className={`w-full min-h-[44px] rounded-xl font-semibold text-sm active:scale-[0.98] transition-all duration-150 select-none ${productData.isInStock && canAddMore ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'}`}
            onClick={handleAddToCart}
            disabled={isAdding || !productData.isInStock || !canAddMore}
            aria-label={`Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="size-4 shrink-0 mr-2" aria-hidden="true" />
            <span className="truncate">
              {!productData.isInStock || stockDisponible <= 0 ? 'Rupture de stock' : !canAddMore ? 'Stock max' : isAdding ? 'Ajouté !' : 'Ajouter au panier'}
            </span>
          </Button>
        </div>
      </div>
    </motion.article>
  );
});
