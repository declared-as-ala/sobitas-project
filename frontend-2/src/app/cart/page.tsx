'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useCart } from '@/app/contexts/CartContext';
import { Button } from '@/app/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Sparkles, Shield, Truck, X } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { motion, AnimatePresence } from 'motion/react';
import { productsData } from '@/data/products';
import { getStorageUrl } from '@/services/api';
import { getStockDisponible } from '@/util/cartStock';
import { toast } from 'sonner';

const FREE_SHIPPING_THRESHOLD = 300;

export default function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getEffectivePrice,
    addToCart,
  } = useCart();

  const [showUpsells, setShowUpsells] = useState(true);
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

  const upsellProducts = useMemo(() => {
    const cartProductIds = new Set(items.map(item => item.product.id));
    return productsData
      .filter(p => !cartProductIds.has(p.id))
      .slice(0, 6);
  }, [items]);

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 sm:py-16"
          >
            <ShoppingBag className="h-16 w-16 sm:h-24 sm:w-24 mx-auto text-gray-300 dark:text-gray-700 mb-4 sm:mb-6" />
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Votre panier est vide
            </h1>
            <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-sm mx-auto">
              Découvrez nos produits premium pour atteindre vos objectifs
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-12 sm:h-14 min-h-[44px] px-6"
            >
              <Link href="/shop">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Découvrir nos produits
              </Link>
            </Button>
          </motion.div>
        </main>
        <Footer />
        <ScrollToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 sm:pb-12 lg:pb-12"
        style={{ paddingBottom: 'max(7rem, env(safe-area-inset-bottom) + 6rem)' }}
      >
        {/* Page header - compact on mobile */}
        <div className="mb-4 sm:mb-6">
          <Link
            href="/shop"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 mb-2 sm:mb-3 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
            Retour aux produits
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Mon Panier
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-0.5">
                {totalItems} article{totalItems > 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-700 hover:underline min-h-[44px] flex items-center px-2 -mx-2"
            >
              <Trash2 className="h-4 w-4 mr-1.5 shrink-0" />
              Vider le panier
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: Cart items - single column on all small screens */}
          <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Articles ({totalItems})
                </h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <AnimatePresence>
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
                      <motion.div
                        key={item.product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -16 }}
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
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Content - title, quantity, price */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                              {productName}
                            </h3>
                            <p className="text-sm text-red-600 dark:text-red-400 font-semibold mt-1">
                              {displayPrice} DT
                              {item.quantity > 1 && (
                                <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                                  × {item.quantity}
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2">
                            {/* Quantity - touch-friendly, clamped to stock */}
                            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                                className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 min-h-[44px] min-w-[44px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                aria-label="Diminuer la quantité"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-4 w-4" />
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
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tabular-nums">
                                {(displayPrice * item.quantity).toFixed(0)} DT
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.id)}
                                className="flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                                aria-label="Retirer du panier"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Recommended - horizontal scroll on mobile */}
            {showUpsells && upsellProducts.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-3 py-3 sm:px-4 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      Recommandé pour vous
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUpsells(false)}
                    className="p-2 -m-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Masquer les recommandations"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3 sm:p-4 overflow-x-auto overflow-y-hidden scrollbar-hide">
                  <div className="flex gap-3 sm:gap-4 pb-2 -mx-1" style={{ scrollSnapType: 'x mandatory' }}>
                    {upsellProducts.map((product) => {
                      const price = product.price || 0;
                      const priceText = product.priceText;
                      const newPriceMatch = priceText?.match(/(\d+)\s*DT$/);
                      const displayPrice = newPriceMatch ? parseInt(newPriceMatch[1]) : price;
                      return (
                        <div
                          key={product.id}
                          className="flex-shrink-0 w-[140px] sm:w-[160px] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/50 hover:border-red-300 dark:hover:border-red-800 transition-colors cursor-pointer group"
                          style={{ scrollSnapAlign: 'start' }}
                          onClick={() => addToCart(product)}
                        >
                          {product.image && (
                            <div className="relative w-full aspect-square bg-white dark:bg-gray-800">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-contain p-2 group-hover:scale-105 transition-transform"
                                sizes="160px"
                              />
                            </div>
                          )}
                          <div className="p-2 sm:p-3">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1">
                              {product.name}
                            </h4>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">
                              {displayPrice} DT
                            </p>
                            <span className="inline-block text-xs font-medium text-red-600 dark:text-red-400 group-hover:underline">
                              Ajouter
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order summary - below on mobile, sticky sidebar on desktop */}
          <aside className="lg:w-[380px] xl:w-[400px] flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Summary header - always visible */}
              <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Résumé de la commande
                </h2>
              </div>

              {/* Collapsible details on mobile/tablet; always visible on lg */}
              <div className="lg:block">
                {totalPrice < FREE_SHIPPING_THRESHOLD && (
                  <div className="px-4 sm:px-5 lg:px-6 pt-2 lg:pt-4">
                    <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                          Livraison gratuite à 300 DT
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
                          {remainingForFreeShipping.toFixed(0)} DT restants
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-amber-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${freeShippingProgress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 sm:p-5 lg:p-6 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Sous-total</span>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{totalPrice.toFixed(0)} DT</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Livraison</span>
                    <span className={shippingCost === 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'font-semibold text-gray-900 dark:text-white tabular-nums'}>
                      {shippingCost === 0 ? 'Gratuite' : `${shippingCost} DT`}
                    </span>
                  </div>
                </div>

                {/* Mobile: collapsible "Voir détails" for extra info - we show details by default; on mobile we could hide trust badges */}
                <div className="hidden lg:grid grid-cols-2 gap-2 px-4 sm:px-5 lg:px-6 pb-4">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Shield className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Paiement sécurisé</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Livraison rapide</span>
                  </div>
                </div>
              </div>

              {/* Total + CTA - prominent */}
              <div className="p-4 sm:p-5 lg:p-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                    {finalTotal.toFixed(0)} DT
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12 sm:h-14 min-h-[44px] text-base sm:text-lg font-bold rounded-xl"
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
            <div className="hidden lg:block mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50">
              <div className="flex items-start gap-2">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
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
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{finalTotal.toFixed(0)} DT</p>
            </div>
            <Button
              size="lg"
              className="flex-1 sm:flex-none sm:min-w-[200px] bg-red-600 hover:bg-red-700 text-white h-12 min-h-[44px] font-bold rounded-xl"
              asChild
            >
              <Link href="/checkout">Passer la commande</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
