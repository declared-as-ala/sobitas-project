'use client';

import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Shield, Truck, Loader2, Phone, MessageCircle } from 'lucide-react';
import { getStorageUrl } from '@/services/api';

export const CHECKOUT_CTA_HEIGHT_REM = 12; // 12rem = 192px, reserved as padding-bottom for form container on mobile

interface CheckoutFooterCTAProps {
  isSubmitting: boolean;
  finalTotal: number;
  totalPrice: number;
  shippingCost: number;
  items: Array<{ product: any; quantity: number }>;
  getEffectivePrice: (product: any) => number;
  mobileSummaryOpen: boolean;
  onMobileSummaryOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export function CheckoutFooterCTA({
  isSubmitting,
  finalTotal,
  totalPrice,
  shippingCost,
  items,
  getEffectivePrice,
  mobileSummaryOpen,
  onMobileSummaryOpenChange,
  onSubmit,
}: CheckoutFooterCTAProps) {
  return (
    <footer
      className="checkout-cta-footer lg:hidden fixed inset-x-0 bottom-0 z-[60] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        bottom: 'var(--keyboard-offset, 0)',
      }}
      aria-label="Passer la commande"
    >
      <div className="max-w-[1160px] mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[13px] text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{finalTotal.toFixed(0)} DT</p>
          </div>
          <Sheet open={mobileSummaryOpen} onOpenChange={onMobileSummaryOpenChange}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="text-[13px] shrink-0 min-h-[44px]">
                Voir le récapitulatif
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-hidden flex flex-col bg-white dark:bg-gray-900">
              <SheetHeader className="sr-only">
                <SheetTitle>Récapitulatif de la commande</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4 pb-8">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Récapitulatif</h3>
                <div className="space-y-3 mb-6">
                  {items.map((item) => {
                    const price = getEffectivePrice(item.product);
                    const productName = (item.product as any).designation_fr || (item.product as any).name;
                    const productImage = (item.product as any).cover ? getStorageUrl((item.product as any).cover) : null;
                    return (
                      <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        {productImage && (
                          <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                            <Image src={productImage} alt={productName} fill className="object-contain p-1" sizes="48px" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{productName}</p>
                          <p className="text-xs text-gray-500">Qté: {item.quantity} · {(price * item.quantity).toFixed(0)} DT</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                    <span className="font-medium text-gray-900 dark:text-white">{totalPrice.toFixed(0)} DT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Expédition</span>
                    <span className={shippingCost === 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'font-medium text-gray-900 dark:text-white'}>
                      {shippingCost === 0 ? 'Gratuite' : `${shippingCost} DT`}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-red-600 dark:text-red-400">{finalTotal.toFixed(0)} DT</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="checkout-cta-button w-full min-h-[56px] text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.3)] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
              <span>Traitement...</span>
            </>
          ) : (
            <>
              <Shield className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Passer la commande</span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 text-center flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3 shrink-0" /> Paiement sécurisé</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3 shrink-0" /> Livraison</span>
          <span aria-hidden>·</span>
          <a href="tel:+21627612500" className="inline-flex items-center gap-1 hover:text-red-600 dark:hover:text-red-400">
            <Phone className="h-3 w-3 shrink-0" /> 27 612 500
          </a>
          <span aria-hidden>·</span>
          <a href="https://wa.me/21627612500" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-green-600 dark:hover:text-green-400">
            <MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp
          </a>
        </p>
      </div>
    </footer>
  );
}
