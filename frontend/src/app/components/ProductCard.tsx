'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { motion } from 'motion/react';
import { ShoppingCart, Zap, Heart } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useQuickOrder } from '@/contexts/QuickOrderContext';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import { Badge } from '@/app/components/ui/badge';
import type { Product as ApiProduct } from '@/types';
import { useCart } from '@/app/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { getStorageUrl, getProductDetails } from '@/services/api';
import { toast } from 'sonner';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import { useState, useMemo, memo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { cn } from '@/app/components/ui/utils';

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

function toQuickOrderProduct(product: Product): QuickOrderProduct {
  const p = product as any;
  return {
    id: product.id,
    designation_fr: p.name || product.designation_fr || '',
    slug: product.slug,
    cover: product.cover,
    prix: p.prix ?? p.price ?? 0,
    promo: p.promo ?? undefined,
    promo_expiration_date: p.promo_expiration_date ?? undefined,
    rupture: p.rupture,
    aromes: p.aromes,
  };
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

export const ProductCard = memo(function ProductCard({ product, showBadge, badgeText, variant = 'default', showDescription = false, hideCountdown = false }: ProductCardProps) {
  const { addToCart, getCartQty } = useCart();
  const { openQuickOrder } = useQuickOrder();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isAdding, setIsAdding] = useState(false);
  const [aromaDialogOpen, setAromaDialogOpen] = useState(false);
  const [cardSelectedAromaId, setCardSelectedAromaId] = useState<number | null>(null);
  /** When API didn't return aromes, we fetch product details; this holds the fetched product for the dialog */
  const [fetchedProductForDialog, setFetchedProductForDialog] = useState<any>(null);
  const [isFetchingAromes, setIsFetchingAromes] = useState(false);
  const favorite = isFavorite(product.id);
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = getCartQty(product.id);
  const canAddMore = stockDisponible > 0 && inCartQty < stockDisponible;
  const aromes = (product as any).aromes as { id: number; designation_fr: string }[] | undefined;
  /** Aromes to show in dialog: from API or from fetched product when API had none */
  const aromesForDialog = fetchedProductForDialog?.aromes ?? aromes;
  const hasMultipleAromes = aromesForDialog && aromesForDialog.length > 1;

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

  const handleCommanderMaintenant = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productData.isInStock || stockDisponible <= 0) return;
    openQuickOrder(toQuickOrderProduct(product));
  }, [openQuickOrder, product, productData.isInStock, stockDisponible]);

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
    setAromaDialogOpen(false);
    setCardSelectedAromaId(null);
    setFetchedProductForDialog(null);
  }, [productData.priceDisplay.finalPrice, productData.image, addToCart]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
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
    const slug = productData.slug || String(product.id);
    const aromesFromProduct = (product as any).aromes;
    const hasAromesFromApi = Array.isArray(aromesFromProduct) && aromesFromProduct.length > 0;
    if (hasAromesFromApi) {
      if (aromesFromProduct.length > 1) {
        setFetchedProductForDialog(null);
        setCardSelectedAromaId(null);
        setAromaDialogOpen(true);
        return;
      }
      const singleAroma = aromesFromProduct.length === 1 ? aromesFromProduct[0] : null;
      doAddToCart(product as any, singleAroma);
      return;
    }
    if (isFetchingAromes) return;
    setIsFetchingAromes(true);
    try {
      const fullProduct = await getProductDetails(slug, true);
      const fullAromes = (fullProduct as any).aromes;
      if (Array.isArray(fullAromes) && fullAromes.length > 1) {
        setFetchedProductForDialog(fullProduct);
        setCardSelectedAromaId(null);
        setAromaDialogOpen(true);
      } else {
        const singleAroma = fullAromes?.length === 1 ? fullAromes[0] : null;
        doAddToCart(fullProduct as any, singleAroma);
      }
    } catch {
      toast.error('Impossible de charger le produit. Réessayez.');
    } finally {
      setIsFetchingAromes(false);
    }
  }, [productData.isInStock, stockDisponible, inCartQty, productData.slug, product, productData.name, doAddToCart, isFetchingAromes]);

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

        {/* Favoris – top-right */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(toFavoriteProduct(product)); }}
          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-sm border border-gray-200/80 dark:border-gray-700/80 hover:bg-white dark:hover:bg-gray-800 transition-colors pointer-events-auto"
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${favorite ? 'fill-red-600 text-red-600' : 'text-gray-500 dark:text-gray-400'}`} />
        </button>
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

        {/* Desktop only: hover overlay CTAs (Commander maintenant + Ajouter au panier) */}
        <div
          className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent hidden opacity-0 transition-opacity duration-200 [@media(hover:hover)]:lg:block [@media(hover:hover)]:lg:group-hover:opacity-100 pointer-events-none [@media(hover:hover)]:lg:group-hover:pointer-events-auto space-y-2"
          aria-hidden="true"
        >
          <Button
            size="sm"
            className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl"
            onClick={handleCommanderMaintenant}
            disabled={!productData.isInStock || stockDisponible <= 0}
            aria-label="Commander maintenant"
          >
            <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
            Commander maintenant
          </Button>
          <Button
            size="sm"
            className="w-full min-h-[40px] bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"
            onClick={handleAddToCart}
            disabled={isAdding || isFetchingAromes || !productData.isInStock || !canAddMore}
            aria-label={!canAddMore && productData.isInStock ? 'Stock maximum atteint' : `Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {!productData.isInStock || stockDisponible <= 0 ? 'Rupture' : !canAddMore ? 'Stock max' : isFetchingAromes ? 'Chargement...' : isAdding ? 'Ajouté !' : 'Ajouter au panier'}
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

        {/* CTAs – Commander maintenant (primary) + Ajouter au panier; always visible on mobile/tablet */}
        <div className="flex-shrink-0 pt-2 md:pt-3 mt-1.5 md:mt-2 border-t border-gray-100 dark:border-gray-700/60 lg:hidden block space-y-2">
          <Button
            size="sm"
            className={`w-full min-h-[44px] rounded-xl font-semibold text-[10px] xs:text-[11px] sm:text-sm active:scale-[0.98] transition-transform duration-150 select-none px-1.5 sm:px-2 ${productData.isInStock && stockDisponible > 0 ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_2px_8px_rgba(245,158,11,0.35)]' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'}`}
            onClick={handleCommanderMaintenant}
            disabled={!productData.isInStock || stockDisponible <= 0}
            aria-label="Commander maintenant"
          >
            <Zap className={`size-3.5 sm:size-4 shrink-0 mr-1 sm:mr-1.5 ${isCompact ? 'sm:mr-1.5' : ''}`} aria-hidden="true" />
            <span className="truncate max-w-full">Commander maintenant</span>
          </Button>
          <Button
            size="sm"
            className={`w-full min-h-[40px] rounded-xl font-semibold text-[10px] xs:text-[11px] sm:text-sm active:scale-[0.98] transition-transform duration-150 select-none px-1.5 sm:px-2 ${productData.isInStock && canAddMore && !isFetchingAromes ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-white border border-gray-200 dark:border-gray-600'}`}
            onClick={handleAddToCart}
            disabled={isAdding || isFetchingAromes || !productData.isInStock || !canAddMore}
            aria-label={`Ajouter ${productData.name} au panier`}
          >
            <ShoppingCart className={`size-3.5 sm:size-4 shrink-0 mr-1 sm:mr-1.5 ${isCompact ? 'sm:mr-1.5' : ''}`} aria-hidden="true" />
            <span className="truncate max-w-full">
              {!productData.isInStock || stockDisponible <= 0 ? 'Rupture' : !canAddMore ? 'Stock max' : isFetchingAromes ? 'Chargement...' : isAdding ? 'Ajouté !' : 'Ajouter au panier'}
            </span>
          </Button>
        </div>
      </div>

      {/* Aroma selection dialog – solid panel, clear in light and dark mode */}
      <Dialog open={aromaDialogOpen} onOpenChange={(open) => { setAromaDialogOpen(open); if (!open) { setCardSelectedAromaId(null); setFetchedProductForDialog(null); } }}>
        <DialogContent
          className={cn(
            'sm:max-w-md p-6 sm:p-6',
            'bg-white dark:bg-gray-900',
            'border-2 border-gray-200 dark:border-gray-700',
            'shadow-2xl shadow-black/20 dark:shadow-black/50',
            'ring-2 ring-gray-900/5 dark:ring-white/10',
            '[&>button]:text-gray-700 [&>button]:dark:text-gray-300 [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-gray-800 [&>button]:rounded-full [&>button]:p-2'
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Choisir un arôme
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{productData.name}</p>
          <div className="flex flex-wrap gap-3 py-3">
            {aromesForDialog?.map((arome: { id: number; designation_fr: string }) => {
              const isSelected = cardSelectedAromaId === arome.id;
              return (
                <Button
                  key={arome.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="default"
                  className={cn(
                    'min-h-[48px] px-5 py-3 text-base font-medium rounded-xl',
                    'border-2 dark:border-gray-600',
                    isSelected && 'bg-red-600 hover:bg-red-700 text-white border-red-600 dark:border-red-600'
                  )}
                  onClick={() => setCardSelectedAromaId(arome.id)}
                >
                  {arome.designation_fr}
                </Button>
              );
            })}
          </div>
          <Button
            size="lg"
            className="w-full min-h-[48px] bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl border-0"
            onClick={(e) => {
              e.preventDefault();
              if (cardSelectedAromaId == null) {
                toast.error('Veuillez choisir un arôme');
                return;
              }
              const selectedAroma = aromesForDialog?.find((a: { id: number }) => a.id === cardSelectedAromaId) ?? null;
              const productToAdd = fetchedProductForDialog ?? product;
              doAddToCart(productToAdd as any, selectedAroma);
            }}
            disabled={cardSelectedAromaId == null}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Ajouter au panier
          </Button>
        </DialogContent>
      </Dialog>
    </motion.article>
  );
});
