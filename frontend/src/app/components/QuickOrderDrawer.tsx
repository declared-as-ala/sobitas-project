'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { AddressSelector } from '@/app/components/AddressSelector';
import { Badge } from '@/app/components/ui/badge';
import { submitQuickOrder } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import type { QuickOrderPayload, QuickOrderResponse } from '@/types';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import { getPriceDisplay } from '@/util/productPrice';
import { Loader2, CheckCircle2, Zap, X, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

const WHATSAPP_NUMBER = '21627612500';
const WHATSAPP_BASE = `https://wa.me/${WHATSAPP_NUMBER}`;

export interface QuickOrderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: QuickOrderProduct;
  initialQty?: number;
  initialVariantId?: number;
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
  product,
  initialQty = 1,
  initialVariantId,
  onSuccess,
}: QuickOrderDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [quantity, setQuantity] = useState(Math.max(1, initialQty));
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(initialVariantId ?? product.aromes?.[0]?.id);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('');
  const [gouvernorat, setGouvernorat] = useState('');
  const [delegation, setDelegation] = useState('');
  const [localite, setLocalite] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuickOrderResponse | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const priceDisplay = getPriceDisplay(product);
  const unitPrice = priceDisplay.finalPrice;
  const total = unitPrice * quantity;
  const deliveryNote = 0;
  const inStock = product.rupture === 1 || product.rupture === undefined;
  const discount = priceDisplay.hasPromo && priceDisplay.oldPrice != null && priceDisplay.oldPrice > 0
    ? Math.round(((priceDisplay.oldPrice - unitPrice) / priceDisplay.oldPrice) * 100)
    : 0;
  const productImage = product.cover ? getStorageUrl(product.cover) : '';

  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  useEffect(() => {
    if (open && product) {
      setQuantity(Math.max(1, initialQty));
      setSelectedVariantId(initialVariantId ?? product.aromes?.[0]?.id);
      setResult(null);
      setErrors({});
      setWebsite('');
      trackEvent('quick_order_open', { product_id: product.id });
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('qo-nom')?.focus(), 150);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, product?.id, initialQty, initialVariantId, product?.aromes]);

  const hasFormData = () =>
    [nom, prenom, phone, gouvernorat, delegation, localite].some((v) => (v || '').trim() !== '');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!(nom || '').trim()) e.nom = 'Nom requis';
    if (!(prenom || '').trim()) e.prenom = 'Prénom requis';
    if (!(phone || '').trim()) e.phone = 'Téléphone requis';
    else {
      const digits = phone.replace(/\s/g, '').replace(/^\+216/, '');
      if (!/^[0-9]{8}$/.test(digits) && !/^2[0-9]{7}$/.test(digits)) {
        e.phone = '8 chiffres';
      }
    }
    if (!(gouvernorat || '').trim()) e.gouvernorat = 'Gouvernorat requis';
    if (!(delegation || '').trim()) e.delegation = 'Délégation requise';
    if (!(localite || '').trim()) e.localite = 'Localité requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || result) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});
    trackEvent('quick_order_submit', { product_id: product.id });

    const payload: QuickOrderPayload = {
      productId: product.id,
      variantId: selectedVariantId,
      qty: quantity,
      nom: nom.trim(),
      prenom: prenom.trim(),
      phone: phone.trim().replace(/\s/g, ''),
      gouvernorat: gouvernorat.trim(),
      delegation: delegation.trim(),
      localite: localite.trim(),
      codePostal: codePostal.trim() || undefined,
      priceSnapshot: unitPrice,
      deliveryFeeSnapshot: deliveryNote,
      website: website || undefined,
    };

    try {
      const res = await submitQuickOrder(payload);
      setResult(res);
      trackEvent('quick_order_success', { order_id: res.orderId, product_id: product.id });
      onSuccess?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur. Réessayez.';
      setErrors({ submit: msg });
      toast.error(msg);
      trackEvent('quick_order_fail', { product_id: product.id, error: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setInternalOpen(false);
    onOpenChange(false);
    setTimeout(() => {
      setResult(null);
      setNom('');
      setPrenom('');
      setPhone('');
      setGouvernorat('');
      setDelegation('');
      setLocalite('');
      setCodePostal('');
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

  const summaryLine = `${product.designation_fr} × ${quantity} — ${total.toFixed(0)} DT · Livraison 24–72h`;

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
                Commander maintenant
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

                  {/* Product summary: image + name + price + discount + stock */}
                  <div className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    {productImage ? (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                        <Image
                          src={productImage}
                          alt={product.designation_fr}
                          fill
                          className="object-contain"
                          sizes="80px"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2">
                        {product.designation_fr}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-bold text-red-600 dark:text-red-400 text-sm">{unitPrice} DT</span>
                        {priceDisplay.hasPromo && priceDisplay.oldPrice != null && (
                          <span className="text-gray-500 dark:text-gray-400 line-through text-xs">{priceDisplay.oldPrice} DT</span>
                        )}
                        {discount > 0 && (
                          <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">-{discount}%</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {inStock ? 'En stock' : 'Rupture de stock'}
                      </p>
                    </div>
                  </div>

                  {/* Quantité (stepper) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Quantité *
                    </Label>
                    <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2 w-fit">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setQuantity((q) => q + 1)}
                        disabled={!inStock}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Variant (arômes) when product has variants */}
                  {product.aromes && product.aromes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Arôme / Variante *
                      </Label>
                      <Select
                        value={selectedVariantId != null ? String(selectedVariantId) : ''}
                        onValueChange={(v) => setSelectedVariantId(v ? Number(v) : undefined)}
                      >
                        <SelectTrigger className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 w-full">
                          <SelectValue placeholder="Choisir..." />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {product.aromes.map((ar) => (
                            <SelectItem key={ar.id} value={String(ar.id)}>{ar.designation_fr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Nom, Prénom, Téléphone (required) – order: Nom & Prénom before Téléphone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qo-nom" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Nom *
                      </Label>
                      <Input
                        id="qo-nom"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        placeholder="Ben Ali"
                        className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                        autoComplete="family-name"
                        aria-invalid={!!errors.nom}
                      />
                      {errors.nom && <p className="text-xs text-red-600 dark:text-red-400">{errors.nom}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qo-prenom" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Prénom *
                      </Label>
                      <Input
                        id="qo-prenom"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        placeholder="Ahmed"
                        className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                        autoComplete="given-name"
                        aria-invalid={!!errors.prenom}
                      />
                      {errors.prenom && <p className="text-xs text-red-600 dark:text-red-400">{errors.prenom}</p>}
                    </div>
                  </div>
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

                  {/* Adresse de livraison: Gouvernorat → Délégation → Localité (like checkout) */}
                  <AddressSelector
                    gouvernorat={gouvernorat}
                    delegation={delegation}
                    localite={localite}
                    codePostal={codePostal}
                    onGouvernoratChange={(v) => {
                      setGouvernorat(v);
                      setDelegation('');
                      setLocalite('');
                      setCodePostal('');
                    }}
                    onDelegationChange={(v) => {
                      setDelegation(v);
                      setLocalite('');
                      setCodePostal('');
                    }}
                    onLocaliteChange={(v, postal) => {
                      setLocalite(v);
                      setCodePostal(postal);
                    }}
                    label="Adresse de livraison"
                    required
                  />
                  {errors.gouvernorat && <p className="text-xs text-red-600 dark:text-red-400">{errors.gouvernorat}</p>}
                  {errors.delegation && <p className="text-xs text-red-600 dark:text-red-400">{errors.delegation}</p>}
                  {errors.localite && <p className="text-xs text-red-600 dark:text-red-400">{errors.localite}</p>}

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
