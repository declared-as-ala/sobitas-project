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
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { getStorageUrl } from '@/services/api';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
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
      <DrawerContent className="max-h-[96vh] w-full sm:max-w-md bg-white dark:bg-gray-900 border-0 shadow-none">
        <DrawerHeader className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 pb-4">
          <DrawerTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Panier
          </DrawerTitle>
          <DrawerDescription className="text-sm text-gray-500 dark:text-gray-400">
            {items.length === 0
              ? 'Votre panier est vide'
              : `${items.length} article${items.length > 1 ? 's' : ''} dans votre panier`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 bg-white dark:bg-gray-900">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
                <ShoppingBag className="h-12 w-12 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
                Votre panier est vide
              </p>
              <DrawerClose asChild>
                <Button onClick={() => onOpenChange(false)} className="rounded-xl">
                  Continuer les achats
                </Button>
              </DrawerClose>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {items.map(item => {
                const displayPrice = getEffectivePrice(item.product);

                return (
                  <div
                    key={item.product.id}
                    className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 shadow-sm"
                  >
                    <div className="w-16 h-16 flex-shrink-0 bg-white dark:bg-gray-700 rounded-lg overflow-hidden relative border border-gray-100 dark:border-gray-600">
                      {(item.product as any).image || (item.product as any).cover ? (
                        <Image
                          src={(item.product as any).image || ((item.product as any).cover ? getStorageUrl((item.product as any).cover) : '')}
                          alt={(item.product as any).name || (item.product as any).designation_fr || 'Product'}
                          fill
                          className="object-contain p-1.5"
                          sizes="64px"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-0.5 leading-tight">
                        {(item.product as any).name || (item.product as any).designation_fr}
                      </h3>
                      <p className="text-red-600 dark:text-red-400 font-bold text-sm mb-2">
                        {displayPrice} DT
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md border-gray-200 dark:border-gray-600"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md border-gray-200 dark:border-gray-600"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md ml-0.5"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {(displayPrice * item.quantity).toFixed(0)} DT
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/80 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-semibold text-gray-900 dark:text-white">Totale</span>
              <span className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                {totalPrice.toFixed(3)} DT
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              <DrawerClose asChild>
                <Link href="/checkout" className="block">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-12 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    Passer commande
                  </Button>
                </Link>
              </DrawerClose>
              <DrawerClose asChild>
                <Link href="/cart" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:border-red-500 dark:text-red-400 h-11 rounded-xl font-medium"
                  >
                    Voir le panier
                  </Button>
                </Link>
              </DrawerClose>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  className="w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 h-11 rounded-xl font-medium"
                >
                  Continuer mes achats
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
