'use client';

import Image from 'next/image';
import { useCart } from '@/app/contexts/CartContext';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, Truck } from 'lucide-react';
import Link from 'next/link';
import { getStorageUrl } from '@/services/api';
import { getStockDisponible } from '@/util/cartStock';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/I18nProvider';
import { localizedName } from '@/i18n/content';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { locale, formatCurrency } = useI18n();
  const {
    items,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    getEffectivePrice,
  } = useCart();

  const totalPrice = getTotalPrice();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="max-h-[96dvh] w-full border-0 bg-elevated shadow-none sm:max-w-md">
        <DrawerHeader className="shrink-0 border-b border-hairline bg-elevated px-5 pb-4 pt-5">
          <DrawerTitle className="font-display font-compressed text-2xl font-extrabold uppercase tracking-tight text-ink-1">
            Panier
          </DrawerTitle>
          {/* "Votre panier est vide" was printed TWICE on an empty cart — once here and once in
              the empty state a few lines below, one directly under the other, in a drawer that
              had nothing else in it. The empty state is the better home for it: it has the icon,
              the explanation and the way out.

              The element stays for screen readers. Radix warns when a titled dialog has no
              description, and more importantly a blind user needs the count announced on open.
              Sighted users see it only when it says something the rest of the drawer does not. */}
          <DrawerDescription className={items.length === 0 ? 'sr-only' : 'text-sm text-ink-3'}>
            {items.length === 0
              ? 'Votre panier est vide'
              : `${items.length} article${items.length > 1 ? 's' : ''} dans votre panier`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-elevated px-5">
          {items.length === 0 ? (
            /* An empty drawer is a dead end unless it points somewhere. This one showed a box,
               one flat sentence, and a button — and that sentence was already in the header
               immediately above it. It now carries a headline in the display face, one line
               saying what to do, and the free-delivery threshold, which is the most persuasive
               fact this shop has and the actual reason to start adding things. */
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-hairline bg-sunken">
                <ShoppingBag className="h-9 w-9 text-brand" aria-hidden="true" />
              </div>
              <p className="font-display font-compressed text-xl font-extrabold uppercase tracking-tight text-ink-1">
                Votre panier est vide
              </p>
              <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-3">
                Ajoutez vos produits et profitez de la livraison gratuite dès 300 DT partout en Tunisie.
              </p>
              <DrawerClose asChild>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="mt-6 h-12 w-full max-w-xs rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-white hover:bg-brand-hover"
                >
                  Continuer les achats
                </Button>
              </DrawerClose>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {items.map(item => {
                const displayPrice = getEffectivePrice(item.product);
                const stockDisponible = getStockDisponible(item.product as any);
                const maxQty = Math.max(1, stockDisponible);

                const handleIncrease = () => {
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
                    className="flex gap-3 rounded-xl border border-hairline bg-sunken p-3"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-hairline bg-elevated">
                      {(item.product as any).image || (item.product as any).cover ? (
                        <Image
                          src={(item.product as any).image || ((item.product as any).cover ? getStorageUrl((item.product as any).cover) : '')}
                          alt={localizedName(item.product as any, locale, 'Product')}
                          fill
                          className="object-contain p-1.5"
                          sizes="64px"
                          loading="lazy"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-ink-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-1">
                          {localizedName(item.product as any, locale)}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-1 -mt-1 h-9 w-9 shrink-0 rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-brand"
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label="Retirer du panier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-0.5 font-display text-sm font-bold tabular-nums tracking-tight text-brand">
                        {formatCurrency(displayPrice)}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center overflow-hidden rounded-lg border border-hairline bg-elevated">
                          <button
                            type="button"
                            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center text-ink-2 transition-colors hover:bg-sunken disabled:pointer-events-none disabled:opacity-50"
                            onClick={() =>
                              updateQuantity(item.product.id, Math.max(1, item.quantity - 1))
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center text-ink-2 transition-colors hover:bg-sunken disabled:pointer-events-none disabled:opacity-50"
                            onClick={handleIncrease}
                            disabled={item.quantity >= maxQty}
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="font-display text-sm font-bold tabular-nums tracking-tight text-ink-1 sm:text-base">
                          {formatCurrency(displayPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="shrink-0 border-t border-hairline bg-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {/* Free-shipping nudge — surfaces the 300 DT threshold at the highest-intent moment
                (right after add-to-cart) to lift average order value. */}
            {totalPrice < 300 ? (
              <div className="mb-4 rounded-xl border border-hairline bg-sunken p-3">
                <p className="mb-2 flex items-center gap-2 text-sm text-ink-2">
                  <Truck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <span>
                    Plus que{' '}
                    <span className="font-bold tabular-nums text-ink-1">{formatCurrency(300 - totalPrice)}</span>
                    {' '}pour la <span className="font-semibold text-brand">livraison gratuite</span>
                  </span>
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                  <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${Math.min(100, (totalPrice / 300) * 100)}%` }} />
                </div>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-950/30 p-3 text-sm font-medium text-green-700 dark:text-green-400">
                <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                Vous bénéficiez de la livraison gratuite !
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <span className="font-display text-base font-semibold uppercase tracking-wide text-ink-1">Total</span>
              <span className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-brand">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <DrawerClose asChild>
                <Link href="/checkout" className="block">
                  <Button className="h-12 w-full rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-hover">
                    Passer commande
                  </Button>
                </Link>
              </DrawerClose>
              <div className="text-center">
                <DrawerClose asChild>
                  <Link
                    href="/cart"
                    className="inline-block py-2.5 text-sm font-medium text-ink-2 transition-colors hover:text-brand"
                  >
                    Voir le panier
                  </Link>
                </DrawerClose>
              </div>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
