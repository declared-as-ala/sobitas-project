'use client';

import { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { submitQuickOrder } from '@/services/api';
import type { QuickOrderPayload, QuickOrderResponse } from '@/types';
import { Loader2, CheckCircle2, Zap, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

const GOUVERNORATS = [
  'ARIANA', 'BÉJA', 'BEN AROUS', 'BIZERTE', 'GABÈS', 'GAFSA', 'JENDOUBA',
  'KAIROUAN', 'KASSERINE', 'KÉBILI', 'LE KEF', 'MAHDIA', 'MANOUBA', 'MÉDENINE',
  'MONASTIR', 'NABEUL', 'SFAX', 'SIDI BOUZID', 'SILIANA', 'SOUSSE', 'TATAOUINE',
  'TOZEUR', 'TUNIS', 'ZAGHOUAN',
];

const WHATSAPP_NUMBER = '21627612500';
const WHATSAPP_BASE = `https://wa.me/${WHATSAPP_NUMBER}`;

export interface QuickOrderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  variantId?: number;
  onSuccess?: (result: QuickOrderResponse) => void;
}

function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    (window as Window & { gtag?: (cmd: string, name: string, params?: Record<string, unknown>) => void }).gtag?.('event', name, params);
  } catch {
    // no-op
  }
}

export function QuickOrderDrawer({
  open,
  onOpenChange,
  productId,
  productName,
  quantity,
  unitPrice,
  variantId,
  onSuccess,
}: QuickOrderDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuickOrderResponse | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const total = unitPrice * quantity;
  const deliveryNote = 0;

  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  useEffect(() => {
    if (open) {
      setResult(null);
      setErrors({});
      setWebsite('');
      trackEvent('quick_order_open', { product_id: productId });
      document.body.style.overflow = 'hidden';
      setTimeout(() => phoneInputRef.current?.focus(), 150);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, productId]);

  const hasFormData = () =>
    [phone, customerName, city, address, note].some((v) => (v || '').trim() !== '');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!(phone || '').trim()) e.phone = 'Téléphone requis';
    else {
      const digits = phone.replace(/\s/g, '').replace(/^\+216/, '');
      if (!/^[0-9]{8}$/.test(digits) && !/^2[0-9]{7}$/.test(digits)) {
        e.phone = '8 chiffres';
      }
    }
    if (!(city || '').trim()) e.city = 'Gouvernorat requis';
    if (!(address || '').trim()) e.address = 'Adresse requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || result) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});
    trackEvent('quick_order_submit', { product_id: productId });

    const payload: QuickOrderPayload = {
      productId,
      variantId,
      qty: quantity,
      customerName: customerName.trim(),
      phone: phone.trim().replace(/\s/g, ''),
      city: city.trim(),
      address: address.trim(),
      note: note.trim() || undefined,
      priceSnapshot: unitPrice,
      deliveryFeeSnapshot: deliveryNote,
      website: website || undefined,
    };

    try {
      const res = await submitQuickOrder(payload);
      setResult(res);
      trackEvent('quick_order_success', { order_id: res.orderId, product_id: productId });
      onSuccess?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur. Réessayez.';
      setErrors({ submit: msg });
      toast.error(msg);
      trackEvent('quick_order_fail', { product_id: productId, error: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setInternalOpen(false);
    onOpenChange(false);
    setTimeout(() => {
      setResult(null);
      setCustomerName('');
      setPhone('');
      setCity('');
      setAddress('');
      setNote('');
      setErrors({});
    }, 200);
  };

  const handleOpenChange = (next: boolean) => {
    if (next === false) {
      if (hasFormData()) {
        if (!window.confirm('Abandonner la commande ? Les informations saisies seront perdues.')) {
          return;
        }
      }
      handleClose();
    } else {
      setInternalOpen(next);
      onOpenChange(next);
    }
  };

  const summaryLine = `${productName} × ${quantity} — ${total.toFixed(0)} DT · Livraison 24–72h`;

  return (
    <DialogPrimitive.Root open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay: opaque dark + optional blur */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[100]',
            'bg-black/55 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Modal/Drawer container: fully opaque, responsive */}
        <DialogPrimitive.Content
          className={cn(
            'fixed z-[101] flex flex-col',
            'bg-white dark:bg-gray-900 shadow-2xl',
            'outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            // Mobile: bottom sheet
            'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-gray-200 dark:border-gray-800',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: centered modal
            'md:inset-auto md:left-1/2 md:top-1/2 md:bottom-auto md:right-auto md:max-h-[85vh] md:w-full md:max-w-[520px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-gray-200 md:dark:border-gray-800',
            'md:data-[state=closed]:slide-out-to-bottom md:data-[state=open]:zoom-in-95 md:data-[state=open]:fade-in-0'
          )}
        >
          {/* Header: title + summary + close X */}
          <div className="shrink-0 flex items-start justify-between gap-4 p-4 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div className="min-w-0">
              <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                <Zap className="h-5 w-5 shrink-0 text-amber-500" />
                Commande rapide
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                {summaryLine}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="shrink-0 rounded-lg p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Body: scrollable form or success */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            <div className="p-4 pt-2">
              {result ? (
                <div className="py-4 text-center">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-green-600 dark:text-green-400 mb-4" aria-hidden />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Commande confirmée</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">
                    Référence : <strong className="text-gray-900 dark:text-white">{result.numero ?? `#${result.orderId}`}</strong>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    Nous vous contacterons pour confirmer la livraison.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Si vous préférez, confirmez sur WhatsApp :</p>
                  <Button
                    asChild
                    className="min-h-[48px] w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold mb-3"
                  >
                    <a
                      href={`${WHATSAPP_BASE}?text=${encodeURIComponent(
                        `Bonjour, je viens de passer une commande rapide.\nRéf: ${result.numero ?? result.orderId}\nProduit: ${productName}\nQté: ${quantity}\nTél: ${phone}\nVille: ${city}\nAdresse: ${address}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Confirmer sur WhatsApp
                    </a>
                  </Button>
                  <Button variant="outline" className="min-h-[44px] px-6" onClick={handleClose}>
                    Fermer
                  </Button>
                </div>
              ) : (
                <form id="quick-order-form" onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="absolute opacity-0 pointer-events-none h-0 w-0"
                    aria-hidden
                  />

                  {/* Phone + Name: stack on mobile, 2 cols on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qo-phone" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Téléphone *
                      </Label>
                      <Input
                        id="qo-phone"
                        ref={phoneInputRef}
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="12 345 678"
                        className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                        autoComplete="tel"
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && <p className="text-xs text-red-600 dark:text-red-400">{errors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qo-name" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Nom & Prénom (optionnel)
                      </Label>
                      <Input
                        id="qo-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ahmed Ben Ali"
                        className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  {/* Gouvernorat */}
                  <div className="space-y-2">
                    <Label htmlFor="qo-city" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Gouvernorat *
                    </Label>
                    <Select value={city || undefined} onValueChange={setCity}>
                      <SelectTrigger
                        id="qo-city"
                        className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 data-[placeholder]:text-gray-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-0 w-full"
                        aria-invalid={!!errors.city}
                      >
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent className="z-[200] max-h-[min(280px,60vh)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
                        {GOUVERNORATS.map((g) => (
                          <SelectItem key={g} value={g} className="py-2.5 px-3">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city && <p className="text-xs text-red-600 dark:text-red-400">{errors.city}</p>}
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="qo-address" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Adresse *
                    </Label>
                    <Input
                      id="qo-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rue, numéro, bâtiment..."
                      className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                      autoComplete="street-address"
                      aria-invalid={!!errors.address}
                    />
                    {errors.address && <p className="text-xs text-red-600 dark:text-red-400">{errors.address}</p>}
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <Label htmlFor="qo-note" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Note (optionnel)
                    </Label>
                    <Textarea
                      id="qo-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Instructions de livraison..."
                      className="min-h-[88px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0 resize-none"
                      rows={2}
                    />
                  </div>

                  {errors.submit && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Sticky footer: total + trust + primary button (only when form visible) */}
          {!result && (
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 rounded-b-2xl md:rounded-b-2xl">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Total : {total.toFixed(0)} DT</span>
                {deliveryNote > 0 && <span className="text-sm text-gray-600 dark:text-gray-400">+ Livraison : {deliveryNote.toFixed(0)} DT</span>}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                Paiement à la livraison · Livraison 24–72h · Produits authentiques
              </p>
              <Button
                type="submit"
                form="quick-order-form"
                disabled={isSubmitting}
                className="w-full h-12 rounded-lg text-base font-bold bg-red-600 hover:bg-red-700 text-white focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Confirmer la commande'
                )}
              </Button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
