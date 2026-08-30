'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PageHeader } from '@/app/components/PageHeader';
import { useCart } from '@/app/contexts/CartContext';
import { Button } from '@/app/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Shield, Truck } from 'lucide-react';
import { LoyaltyEarnLine } from '@/app/components/loyalty/LoyaltyEarnLine';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getStorageUrl } from '@/services/api';
import { getStockDisponible } from '@/util/cartStock';
import { notify as toast } from '@/lib/notify';

const FREE_SHIPPING_THRESHOLD = 300;

/** Layout-matching placeholder shown until the cart rehydrates from localStorage (no flash of empty). */
function CartSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12">
        <div className="mb-4 sm:mb-6 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                    <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-20" />
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-10 w-28 rounded-lg" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <aside className="lg:w-[380px] xl:w-[400px] flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-100 dark:border-gray-800">
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="p-4 sm:p-5 lg:p-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="p-4 sm:p-5 lg:p-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function CartPage() {
  const {
    items,
    isLoaded,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getEffectivePrice,
  } = useCart();

  const hasClampedRef = useRef(false);

  // Clamp cart quantities to current stock when product stock dropped below cart qty
  useEffect(() => {
    if (items.length === 0) return;
    let didClamp = false;
    items.forEach((item) => {
      const stock = getStockDisponible(item.product as any);
      if (stock >= 0 && item.quantity > stock) {
        const newQty = Math.max(0, stock);
        updateQuantity(item.product.id, newQty);
        didClamp = true;
      }
    });
    if (didClamp && !hasClampedRef.current) {
      hasClampedRef.current = true;
      toast.info('Quantité ajustée au stock disponible.');
    }
  }, [items]);

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : 10;
  const finalTotal = totalPrice + shippingCost;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice);
  const freeShippingProgress = Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100);

  // Gate on rehydration so returning users never see a flash of the empty state.
  if (!isLoaded) {
    return <CartSkeleton />;
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 mb-4 sm:mb-6">
              <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <h1 className="font-display uppercase tracking-tight text-2xl sm:text-4xl text-gray-900 dark:text-white mb-3 sm:mb-4">
              Votre panier est vide
            </h1>
            <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-sm mx-auto">
              Découvrez nos produits premium pour atteindre vos objectifs
            </p>
            <Button
              asChild
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide rounded-xl h-12 sm:h-14 min-h-[44px] px-6"
            >
              <Link href="/shop">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" aria-hidden="true" />
                Découvrir nos produits
              </Link>
            </Button>
          </div>
        </main>
        <ScrollToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 sm:pb-12 lg:pb-12"
        style={{ paddingBottom: 'max(7rem, env(safe-area-inset-bottom) + 6rem)' }}
      >
        {/* Page header - compact on mobile */}
        <div className="mb-4 sm:mb-6">
          <Link
            href="/shop"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 mb-2 sm:mb-3 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
            Retour aux produits
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <PageHeader
              kicker="Votre panier"
              title="Mon Panier"
              subtitle={`${totalItems} article${totalItems > 1 ? 's' : ''}`}
            />
            <button
              type="button"
              onClick={clearCart}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline min-h-[44px] flex items-center px-2 -mx-2"
            >
              <Trash2 className="h-4 w-4 mr-1.5 shrink-0" aria-hidden="true" />
              Vider le panier
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: Cart items - single column on all small screens */}
          <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-display uppercase tracking-tight text-base sm:text-lg text-gray-900 dark:text-white">
                  Articles ({totalItems})
                </h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => {
                  const displayPrice = getEffectivePrice(item.product);
                  const productName = (item.product as any).name || (item.product as any).designation_fr || 'Produit';
                  const productImage = (item.product as any).image || ((item.product as any).cover ? getStorageUrl((item.product as any).cover) : null);
                  const stockDisponible = getStockDisponible(item.product as any);
                  const maxQty = Math.max(1, stockDisponible);

                  const handleIncreaseQty = () => {
                    const next = item.quantity + 1;
                    if (next > stockDisponible) {
                      updateQuantity(item.product.id, maxQty);
                      toast.info('Quantité ajustée au stock disponible.');
                    } else {
                      updateQuantity(item.product.id, next);
                    }
                  };

                  return (
                    <div
                      key={item.product.id}
                      className="flex gap-3 sm:gap-4 p-3 sm:p-4 min-w-0"
                    >
                      {/* Product image - small, left */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {productImage ? (
                          <Image
                            src={productImage}
                            alt={productName}
                            fill
                            className="object-contain p-1"
                            sizes="96px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-gray-400" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      {/* Content - title, quantity, price */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                            {productName}
                          </h3>
                          <p className="text-sm text-red-600 dark:text-red-400 font-display font-bold tracking-tight tabular-nums mt-1">
                            {displayPrice.toFixed(2)} DT
                            {item.quantity > 1 && (
                              <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                                × {item.quantity}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-2">
                          {/* Quantity - touch-friendly, clamped to stock */}
                          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                              className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 min-h-[44px] min-w-[44px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                              aria-label="Diminuer la quantité"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <span className="w-10 sm:w-12 text-center font-semibold text-sm tabular-nums" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={handleIncreaseQty}
                              className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 min-h-[44px] min-w-[44px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                              aria-label="Augmenter la quantité"
                              disabled={item.quantity >= maxQty}
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-sm sm:text-base font-display font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
                              {(displayPrice * item.quantity).toFixed(2)} DT
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                              aria-label="Retirer du panier"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Order summary - below on mobile, sticky sidebar on desktop */}
          <aside className="lg:w-[380px] xl:w-[400px] flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Summary header - always visible */}
              <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-display uppercase tracking-tight text-lg sm:text-xl text-gray-900 dark:text-white">
                  Résumé de la commande
                </h2>
              </div>

              {/* Collapsible details on mobile/tablet; always visible on lg */}
              <div className="lg:block">
                {totalPrice < FREE_SHIPPING_THRESHOLD && (
                  <div className="px-4 sm:px-5 lg:px-6 pt-2 lg:pt-4">
                    <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                          Livraison gratuite à 300 DT
                        </span>
                        <span className="text-xs sm:text-sm font-display font-bold tabular-nums text-red-600 dark:text-red-400">
                          {remainingForFreeShipping.toFixed(2)} DT restants
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full transition-[width] duration-500 ease-out"
                          style={{ width: `${freeShippingProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 sm:p-5 lg:p-6 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Sous-total</span>
                    <span className="font-display font-semibold text-gray-900 dark:text-white tabular-nums">{totalPrice.toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Livraison</span>
                    <span className={shippingCost === 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'font-display font-semibold text-gray-900 dark:text-white tabular-nums'}>
                      {shippingCost === 0 ? 'Gratuite' : `${shippingCost} DT`}
                    </span>
                  </div>
                </div>

                {/* Trust row - desktop only */}
                <div className="hidden lg:grid grid-cols-2 gap-2 px-4 sm:px-5 lg:px-6 pb-4">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Shield className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Paiement sécurisé</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Truck className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Livraison rapide</span>
                  </div>
                </div>
              </div>

              {/* Total + CTA - prominent */}
              <div className="p-4 sm:p-5 lg:p-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-display uppercase tracking-tight text-base text-gray-900 dark:text-white">Total</span>
                  <span className="font-display font-bold tracking-tight text-xl sm:text-2xl text-red-600 dark:text-red-400 tabular-nums">
                    {finalTotal.toFixed(2)} DT
                  </span>
                </div>

                {/* `totalPrice`, NOT `finalTotal` — delivery never earns points. The backend's earn
                    base is `prix_ttc - frais_livraison`, so quoting the figure that still contains
                    the 10 DT delivery fee would over-promise on every order under 300 DT, which is
                    most of them. See util/loyaltyPoints.ts. */}
                <LoyaltyEarnLine amountDt={totalPrice} variant="summary" />

                <Button
                  size="lg"
                  className="hidden lg:flex w-full bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide h-12 sm:h-14 min-h-[44px] text-base sm:text-lg rounded-xl"
                  asChild
                >
                  <Link href="/checkout">
                    Passer la commande
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full h-11 min-h-[44px] rounded-xl" asChild>
                  <Link href="/shop">Continuer vos achats</Link>
                </Button>
              </div>
            </div>

            {/* Delivery note - compact, desktop only in sidebar */}
            <div className="hidden lg:block mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-start gap-2">
                <Truck className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Livraison</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {shippingCost === 0 ? 'Gratuite en 2-3 jours' : 'Standard 3-5 jours'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Sticky bottom bar - mobile/tablet only: Total + CTA */}
        <div
          // Was z-40 — a TIE with the tab bar, so which one won depended on DOM order rather
          // than intent. Now explicitly below it.
          className="fixed bottom-tabbar left-0 right-0 z-sticky-cta lg:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
          style={{ paddingBottom: 'calc(var(--tabbar-raise) + 0.75rem)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="font-display font-bold tracking-tight text-lg text-red-600 dark:text-red-400 tabular-nums">{finalTotal.toFixed(2)} DT</p>
            </div>
            <Button
              size="lg"
              className="flex-1 sm:flex-none sm:min-w-[200px] bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide h-12 min-h-[44px] rounded-xl"
              asChild
            >
              <Link href="/checkout">Passer la commande</Link>
            </Button>
          </div>
        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}
