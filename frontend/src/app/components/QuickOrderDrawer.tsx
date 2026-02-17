'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/app/components/ui/drawer';
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
import { Loader2, CheckCircle2, Zap } from 'lucide-react';
import { toast } from 'sonner';

const GOUVERNORATS = [
  'ARIANA', 'BÉJA', 'BEN AROUS', 'BIZERTE', 'GABÈS', 'GAFSA', 'JENDOUBA',
  'KAIROUAN', 'KASSERINE', 'KÉBILI', 'LE KEF', 'MAHDIA', 'MANOUBA', 'MÉDENINE',
  'MONASTIR', 'NABEUL', 'SFAX', 'SIDI BOUZID', 'SILIANA', 'SOUSSE', 'TATAOUINE',
  'TOZEUR', 'TUNIS', 'ZAGHOUAN',
];

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
    (window as any).gtag?.('event', name, params);
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
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuickOrderResponse | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const total = unitPrice * quantity;
  const deliveryNote = 0;

  useEffect(() => {
    if (open) {
      setResult(null);
      setErrors({});
      setWebsite('');
      trackEvent('quick_order_open', { product_id: productId });
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open, productId]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!(customerName || '').trim()) e.customerName = 'Nom et prénom requis';
    if (!(phone || '').trim()) e.phone = 'Téléphone requis';
    else {
      const digits = phone.replace(/\s/g, '').replace(/^\+216/, '');
      if (!/^[0-9]{8}$/.test(digits) && !/^2[0-9]{7}$/.test(digits)) {
        e.phone = '8 chiffres (ex: 12 345 678)';
      }
    }
    if (!(city || '').trim()) e.city = 'Ville / Gouvernorat requis';
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
    } catch (err: any) {
      const msg = err?.message || 'Erreur. Réessayez.';
      setErrors({ submit: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
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

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleClose()}>
      <DrawerContent className="max-h-[90vh] flex flex-col rounded-t-2xl" dir="ltr">
        <DrawerHeader className="border-b border-gray-200 dark:border-gray-700">
          <DrawerTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Zap className="h-5 w-5 text-amber-500" />
            Commande rapide
          </DrawerTitle>
          <DrawerDescription className="text-gray-600 dark:text-gray-400">
            {productName} × {quantity} — {total.toFixed(0)} DT
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {result ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-600 dark:text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Commande confirmée</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Référence : <strong className="text-gray-900 dark:text-white">{result.numero ?? `#${result.orderId}`}</strong>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Nous vous contacterons pour confirmer la livraison.
              </p>
              <Button className="mt-6 min-h-[48px] px-6" onClick={handleClose}>
                Fermer
              </Button>
            </div>
          ) : (
            <form id="quick-order-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
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
              <div className="space-y-1.5">
                <Label htmlFor="qo-name" className="text-sm font-medium">Nom & Prénom *</Label>
                <Input
                  id="qo-name"
                  ref={nameInputRef}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ahmed Ben Ali"
                  className="min-h-[48px] text-base"
                  autoComplete="name"
                  aria-invalid={!!errors.customerName}
                />
                {errors.customerName && <p className="text-xs text-red-600 dark:text-red-400">{errors.customerName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qo-phone" className="text-sm font-medium">Téléphone *</Label>
                <Input
                  id="qo-phone"
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="12 345 678"
                  className="min-h-[48px] text-base"
                  autoComplete="tel"
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <p className="text-xs text-red-600 dark:text-red-400">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qo-city" className="text-sm font-medium">Ville / Gouvernorat *</Label>
                <Select value={city || undefined} onValueChange={setCity}>
                  <SelectTrigger id="qo-city" className="min-h-[48px] text-base" aria-invalid={!!errors.city}>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GOUVERNORATS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && <p className="text-xs text-red-600 dark:text-red-400">{errors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qo-address" className="text-sm font-medium">Adresse *</Label>
                <Input
                  id="qo-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rue, numéro, bâtiment..."
                  className="min-h-[48px] text-base"
                  autoComplete="street-address"
                  aria-invalid={!!errors.address}
                />
                {errors.address && <p className="text-xs text-red-600 dark:text-red-400">{errors.address}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qo-note" className="text-sm font-medium text-gray-600 dark:text-gray-400">Note (optionnel)</Label>
                <Textarea
                  id="qo-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Instructions de livraison..."
                  className="min-h-[80px] text-base resize-none"
                  rows={2}
                />
              </div>
              <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3 text-sm">
                <p className="font-semibold text-gray-900 dark:text-white">Total : {total.toFixed(0)} DT</p>
                {deliveryNote > 0 && <p className="text-gray-600 dark:text-gray-400">+ Livraison : {deliveryNote.toFixed(0)} DT</p>}
                <p className="text-gray-500 dark:text-gray-500 mt-1">Paiement à la livraison.</p>
              </div>
              {errors.submit && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              )}
            </form>
          )}
        </div>

        {!result && (
          <DrawerFooter className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              type="submit"
              form="quick-order-form"
              disabled={isSubmitting}
              className="min-h-[52px] w-full text-base font-bold bg-red-600 hover:bg-red-700"
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
            <DrawerClose asChild>
              <Button variant="outline" className="min-h-[44px]">Annuler</Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
