'use client';

import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { ChevronUp, Loader2, Shield } from 'lucide-react';
import { getStorageUrl } from '@/services/api';
import { Container } from '@/app/components/layout/Container';

export const CHECKOUT_CTA_HEIGHT_REM = 6.25;

interface CheckoutFooterCTAProps {
  keyboardOpen?: boolean;
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
  keyboardOpen = false,
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
      className={`checkout-cta-footer fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-elevated shadow-card transition-transform duration-200 ease-out lg:hidden ${keyboardOpen ? 'checkout-cta-footer--keyboard-open' : ''}`}
      style={{
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Passer la commande"
      aria-hidden={keyboardOpen}
    >
      <Container className="flex items-center gap-2.5 py-2">
        <Sheet open={mobileSummaryOpen} onOpenChange={onMobileSummaryOpenChange}>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" className="h-auto min-w-0 flex-[0_1_44%] justify-between rounded-xl px-2.5 py-1.5 text-start hover:bg-brand-50 focus-visible:ring-focus">
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Total</span>
                  <span className="block truncate font-display text-lg font-extrabold leading-tight tracking-tight tabular-nums text-ink-1">{finalTotal.toFixed(2)} DT</span>
                </span>
                <ChevronUp className="ms-1 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-hairline bg-elevated">
              <SheetHeader className="sr-only">
                <SheetTitle>Récapitulatif de la commande</SheetTitle>
                <SheetDescription>Articles, expédition et total de votre commande.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 pb-8">
                <h3 className="mb-4 font-display text-xl font-extrabold uppercase tracking-tight text-ink-1">Votre commande</h3>
                <div className="space-y-3 mb-6">
                  {items.map((item) => {
                    const price = getEffectivePrice(item.product);
                    const productName = (item.product as any).designation_fr || (item.product as any).name;
                    const productImage = (item.product as any).cover ? getStorageUrl((item.product as any).cover) : null;
                    return (
                      <div key={item.product.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-sunken p-3">
                        {productImage && (
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-elevated">
                            <Image src={productImage} alt={productName} fill className="object-contain p-1" sizes="48px" unoptimized />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink-1">{productName}</p>
                          <p className="text-xs text-ink-3">Qté&nbsp;: {item.quantity} · {(price * item.quantity).toFixed(2)} DT</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2 border-t border-rule pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-2">Sous-total</span>
                    <span className="font-semibold text-ink-1">{totalPrice.toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-2">Expédition</span>
                    <span className={shippingCost === 0 ? 'font-semibold text-ok' : 'font-semibold text-ink-1'}>
                      {shippingCost === 0 ? 'Gratuite' : `${shippingCost} DT`}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-rule pt-3">
                    <span className="font-display text-lg font-extrabold uppercase tracking-tight text-ink-1">Total</span>
                    <span className="font-display text-xl font-extrabold tracking-tight tabular-nums text-brand">{finalTotal.toFixed(2)} DT</span>
                  </div>
                </div>
              </div>
            </SheetContent>
        </Sheet>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="checkout-cta-button flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-3 font-display text-sm font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:ring-focus focus-visible:ring-offset-elevated disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
              <span>Traitement...</span>
            </>
          ) : (
            <>
              <Shield className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Commander</span>
            </>
          )}
        </Button>

      </Container>
    </footer>
  );
}
