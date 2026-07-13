'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { PageHeader } from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/button';
import { EmptyState } from '@/app/components/EmptyState';
import { useCart } from '@/app/contexts/CartContext';
import { packQuote, getStorageUrl, isStorageImageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import type { Product, PackQuote } from '@/types';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, ShoppingCart, Percent, Loader2, Package, TrendingUp } from 'lucide-react';

export interface PackBuilderGroup {
  slug: string;
  label: string;
  products: Product[];
}

interface PackBuilderClientProps {
  groups: PackBuilderGroup[];
}

/** Display-only mirror of the backend PackDiscountService tiers (authoritative amount comes from /pack/quote). */
const PACK_TIERS: { min: number; percent: number }[] = [
  { min: 200, percent: 5 },
  { min: 350, percent: 8 },
  { min: 500, percent: 12 },
];

export function PackBuilderClient({ groups }: PackBuilderClientProps) {
  const router = useRouter();
  const { addToCart, setPackDiscount } = useCart();

  // Selected quantities keyed by product id.
  const [pack, setPack] = useState<Record<number, number>>({});
  const [quote, setQuote] = useState<PackQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Flat product lookup so we can resolve ids → product without re-scanning groups each time.
  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    groups.forEach((g) => g.products.forEach((p) => map.set(p.id, p)));
    return map;
  }, [groups]);

  const entries = useMemo(
    () =>
      Object.entries(pack)
        .map(([id, qty]) => ({ product: productById.get(Number(id)), qty }))
        .filter((e): e is { product: Product; qty: number } => !!e.product && e.qty > 0),
    [pack, productById]
  );

  const subtotal = useMemo(
    () => entries.reduce((sum, { product, qty }) => sum + getEffectivePrice(product as never) * qty, 0),
    [entries]
  );

  const itemCount = useMemo(() => entries.reduce((n, e) => n + e.qty, 0), [entries]);

  const setQty = useCallback((product: Product, qty: number) => {
    setPack((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[product.id];
      } else {
        const stock = getStockDisponible(product as never);
        next[product.id] = stock > 0 ? Math.min(qty, stock) : qty;
      }
      return next;
    });
  }, []);

  const addOne = useCallback(
    (product: Product) => {
      const stock = getStockDisponible(product as never);
      if (stock <= 0) {
        toast.error('Rupture de stock');
        return;
      }
      setQty(product, (pack[product.id] ?? 0) + 1);
    },
    [pack, setQty]
  );

  // Debounced authoritative quote: the server recomputes the subtotal + tier from real prices.
  const quoteTokenRef = useRef(0);
  useEffect(() => {
    const items = entries.map(({ product, qty }) => ({ produit_id: product.id, quantite: qty }));
    if (items.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    const token = ++quoteTokenRef.current;
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      packQuote(items)
        .then((q) => {
          if (token === quoteTokenRef.current) setQuote(q);
        })
        .catch(() => {
          if (token === quoteTokenRef.current) setQuote(null);
        })
        .finally(() => {
          if (token === quoteTokenRef.current) setQuoteLoading(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [entries]);

  const discountPercent = quote?.discount_percent ?? 0;
  const discountAmount = quote?.discount_amount ?? 0;
  const total = quote ? quote.total : subtotal;
  const nextTier = quote?.next_tier ?? null;

  const handleAddPackToCart = useCallback(() => {
    if (entries.length === 0) {
      toast.error('Ajoutez au moins un produit à votre pack');
      return;
    }
    entries.forEach(({ product, qty }) => addToCart(product, qty));
    setPackDiscount(true);
    toast.success('Pack ajouté au panier — la remise sera appliquée au paiement');
    router.push('/cart');
  }, [entries, addToCart, setPackDiscount, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <PageHeader
          kicker="Pack sur mesure"
          title="Composez votre pack"
          subtitle="Sélectionnez vos produits et profitez d'une remise groupée automatique : plus votre pack est important, plus vous économisez."
        />

        {/* Tiers explainer */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PACK_TIERS.map((tier) => (
            <div
              key={tier.min}
              className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <Percent className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display font-bold tracking-tight text-lg text-gray-900 dark:text-white">
                  -{tier.percent}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  dès {tier.min} DT d&apos;achat
                </p>
              </div>
            </div>
          ))}
        </div>

        {groups.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Aucun produit disponible"
              description="Les produits du composeur de pack ne sont pas disponibles pour le moment. Revenez bientôt."
              showShopLink
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            {/* Product picker */}
            <div className="space-y-10 min-w-0">
              {groups.map((group) => (
                <section key={group.slug} aria-labelledby={`group-${group.slug}`}>
                  <h2
                    id={`group-${group.slug}`}
                    className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4"
                  >
                    {group.label}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {group.products.map((product) => {
                      const qty = pack[product.id] ?? 0;
                      const price = getEffectivePrice(product as never);
                      const stock = getStockDisponible(product as never);
                      const outOfStock = stock <= 0;
                      const image = product.cover ? getStorageUrl(product.cover) : '';
                      return (
                        <div
                          key={product.id}
                          className={`flex flex-col rounded-xl border p-3 transition-colors ${
                            qty > 0
                              ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/10'
                              : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                          }`}
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 mb-2">
                            {image ? (
                              <Image
                                src={image}
                                alt={product.designation_fr}
                                fill
                                className="object-contain p-2"
                                sizes="(max-width: 640px) 45vw, 200px"
                                unoptimized={isStorageImageUrl(image)}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-700">
                                <Package className="h-8 w-8" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <h3
                            title={product.designation_fr}
                            className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 min-h-[2.25rem]"
                          >
                            {product.designation_fr}
                          </h3>
                          <p className="mt-1 font-display font-bold tracking-tight tabular-nums text-red-600 dark:text-red-400">
                            {price} DT
                          </p>
                          <div className="mt-2">
                            {qty > 0 ? (
                              <div className="flex items-center justify-between gap-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                <button
                                  type="button"
                                  onClick={() => setQty(product, qty - 1)}
                                  className="flex h-9 w-9 items-center justify-center text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                                  aria-label="Diminuer la quantité"
                                >
                                  {qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                </button>
                                <span className="font-display font-bold tabular-nums text-gray-900 dark:text-white">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addOne(product)}
                                  disabled={stock > 0 && qty >= stock}
                                  className="flex h-9 w-9 items-center justify-center text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                  aria-label="Augmenter la quantité"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => addOne(product)}
                                disabled={outOfStock}
                                className={`w-full min-h-[44px] rounded-lg font-semibold text-xs sm:text-sm ${
                                  outOfStock
                                    ? 'bg-gray-300 dark:bg-gray-700 text-white cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                              >
                                <Plus className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
                                {outOfStock ? 'Rupture' : 'Ajouter'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Sticky summary */}
            <aside className="lg:sticky lg:top-24 h-fit">
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 dark:border-gray-800 px-4 sm:px-5 py-4">
                  <h2 className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">
                    <ShoppingCart className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                    Votre pack
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {itemCount} article{itemCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {entries.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                      Aucun produit sélectionné. Ajoutez des produits pour composer votre pack.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {entries.map(({ product, qty }) => (
                        <li key={product.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">
                            <span className="tabular-nums text-gray-400">{qty}×</span> {product.designation_fr}
                          </span>
                          <span className="shrink-0 font-display font-semibold tabular-nums text-gray-900 dark:text-white">
                            {(getEffectivePrice(product as never) * qty).toFixed(0)} DT
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                      <span className="font-display font-semibold tabular-nums text-gray-900 dark:text-white">
                        {subtotal.toFixed(0)} DT
                      </span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <Percent className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                          Remise pack{quote?.tier_label ? ` (${quote.tier_label})` : ` (-${discountPercent}%)`}
                        </span>
                        <span className="font-display font-semibold tabular-nums text-green-600 dark:text-green-400">
                          -{discountAmount.toFixed(2)} DT
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex justify-between items-baseline">
                      <span className="font-display uppercase tracking-tight text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                        Total
                        {quoteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden="true" />}
                      </span>
                      <span className="font-display font-bold tracking-tight tabular-nums text-2xl text-red-600 dark:text-red-400">
                        {total.toFixed(0)} DT
                      </span>
                    </div>
                  </div>

                  {/* Next-tier nudge */}
                  {nextTier && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                      <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Ajoutez {nextTier.remaining.toFixed(0)} DT pour obtenir -{nextTier.percent}%
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="lg"
                    onClick={handleAddPackToCart}
                    disabled={entries.length === 0}
                    className="w-full min-h-[52px] rounded-xl font-display uppercase tracking-wide bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" aria-hidden="true" />
                    Ajouter le pack au panier
                  </Button>
                  <p className="text-[11px] leading-snug text-gray-400 dark:text-gray-500 text-center">
                    La remise groupée est recalculée et appliquée automatiquement lors du paiement.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
