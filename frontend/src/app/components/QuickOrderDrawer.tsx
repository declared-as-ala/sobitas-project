'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { AddressSelector } from '@/app/components/AddressSelector';
import { Badge } from '@/app/components/ui/badge';
import { submitQuickOrder, getProductDetails, getStorageUrl, applyCoupon, removeCoupon } from '@/services/api';
import type { QuickOrderPayload, QuickOrderResponse } from '@/types';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import { getPriceDisplay } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { Loader2, CheckCircle2, Zap, X, Minus, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

const WHATSAPP_NUMBER = '21627612500';
const WHATSAPP_BASE = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Same as checkout: free shipping from 300 TND, else 10 TND */
const FREE_SHIPPING_THRESHOLD = 300;
const SHIPPING_FEE = 10;

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
  /** When API didn't return aromes, we fetch full product so the drawer can show aroma selector */
  const [productWithAromes, setProductWithAromes] = useState<QuickOrderProduct>(product);
  const [isLoadingAromes, setIsLoadingAromes] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
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
  const orderAttemptRef = useRef<{ payload: string; key: string } | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_ht: number;
    discount_ttc: number;
    free_shipping?: boolean;
    totals: { subtotal_ht: number; discount_ht: number; net_ht: number; tva: number; timbre: number; frais_livraison: number; total_ttc: number };
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponMessageType, setCouponMessageType] = useState<'success' | 'error' | null>(null);

  const priceDisplay = getPriceDisplay(product);
  const unitPrice = priceDisplay.finalPrice;
  const subtotal = unitPrice * quantity;
  const fraisLivraison = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = appliedCoupon?.totals ? appliedCoupon.totals.total_ttc : subtotal + fraisLivraison;
  const inStock = isInStock(product);
  // Cap quantity at the KNOWN available stock. We only cap when qte is a real positive number —
  // when the API doesn't return qte we leave it unbounded (getStockDisponible would wrongly clamp
  // an in-stock product to 1). The backend re-validates stock on submit regardless.
  const rawStock = (product as { qte?: number }).qte;
  const maxQty =
    typeof rawStock === 'number' && Number.isFinite(rawStock) && rawStock > 0
      ? Math.floor(rawStock)
      : Infinity;
  const discount = priceDisplay.hasPromo && priceDisplay.oldPrice != null && priceDisplay.oldPrice > 0
    ? Math.round(((priceDisplay.oldPrice - unitPrice) / priceDisplay.oldPrice) * 100)
    : 0;
  const productImage = product.cover ? getStorageUrl(product.cover) : '';

  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  useEffect(() => {
    if (open && product) {
      const stockQte = (product as { qte?: number }).qte;
      const stock =
        typeof stockQte === 'number' && Number.isFinite(stockQte) && stockQte > 0
          ? Math.floor(stockQte)
          : Infinity;
      setQuantity(Math.min(stock, Math.max(1, initialQty)));
      setProductWithAromes(product);
      setSelectedVariantId(initialVariantId ?? product.aromes?.[0]?.id);
      setResult(null);
      setErrors({});
      setWebsite('');
      trackEvent('quick_order_open', { product_id: product.id });
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('qo-nom')?.focus(), 150);
      const hasAromes = product.aromes && product.aromes.length > 0;
      if (!hasAromes && product.slug) {
        setIsLoadingAromes(true);
        getProductDetails(product.slug, true)
          .then((full) => {
            const aromes = (full as any).aromes;
            if (aromes && aromes.length > 0) {
              setProductWithAromes({ ...product, aromes } as QuickOrderProduct);
              setSelectedVariantId(initialVariantId ?? aromes[0]?.id);
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingAromes(false));
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, product?.id, product?.slug, initialQty, initialVariantId, product?.aromes]);

  const hasFormData = () =>
    [nom, prenom, email, phone, gouvernorat, delegation, localite].some((v) => (v || '').trim() !== '');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!(nom || '').trim()) e.nom = 'Nom requis';
    if (!(prenom || '').trim()) e.prenom = 'Prénom requis';
    if (!(email || '').trim()) e.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Email invalide';
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
    const aromes = productWithAromes.aromes;
    if (aromes && aromes.length > 1 && selectedVariantId == null) {
      e.arome = 'Veuillez choisir un arôme';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const needsAromaSelection = (productWithAromes.aromes?.length ?? 0) > 1 && selectedVariantId == null;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    setCouponMessage(null);
    setCouponMessageType(null);
    if (!code) {
      setCouponMessage('Veuillez saisir un code promo.');
      setCouponMessageType('error');
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const result = await applyCoupon({
        code,
        subtotal_ht: subtotal,
        frais_livraison: fraisLivraison,
        ...(phone.trim() && { phone: phone.trim().replace(/\s/g, '') }),
      });
      if (result.success && result.totals != null) {
        setAppliedCoupon({
          code: result.coupon?.code ?? code,
          discount_ht: result.discount_ht ?? 0,
          discount_ttc: result.discount_ttc ?? 0,
          free_shipping: result.free_shipping,
          totals: result.totals,
        });
        setCouponMessage(result.message || 'Code promo appliqué');
        setCouponMessageType('success');
        toast.success(result.message || 'Code promo appliqué');
      } else {
        const msg = result.message || 'Code promo invalide ou expiré';
        setCouponMessage(msg);
        setCouponMessageType('error');
        toast.error(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'application du code.';
      setCouponMessage(msg);
      setCouponMessageType('error');
      toast.error(msg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon({ subtotal_ht: subtotal, frais_livraison: fraisLivraison });
      setAppliedCoupon(null);
      setCouponInput('');
      setCouponMessage('Code promo retiré');
      setCouponMessageType('success');
      toast.success('Code promo retiré');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || result) return;
    if (!inStock) {
      toast.error('Produit en rupture de stock.');
      return;
    }
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
      email: email.trim(),
      phone: phone.trim().replace(/\s/g, ''),
      gouvernorat: gouvernorat.trim(),
      delegation: delegation.trim(),
      localite: localite.trim(),
      codePostal: codePostal.trim() || undefined,
      priceSnapshot: unitPrice,
      deliveryFeeSnapshot: fraisLivraison,
      website: website || undefined,
      ...(appliedCoupon?.code && { couponCode: appliedCoupon.code }),
    };

    try {
      const serializedPayload = JSON.stringify(payload);
      if (orderAttemptRef.current?.payload !== serializedPayload) {
        orderAttemptRef.current = {
          payload: serializedPayload,
          key: crypto.randomUUID?.() ?? `quick-order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
      }
      const res = await submitQuickOrder(payload, orderAttemptRef.current.key);
      orderAttemptRef.current = null;
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
      setCouponInput('');
      setAppliedCoupon(null);
      setCouponMessage(null);
      setCouponMessageType(null);
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

  const summaryLine = `${product.designation_fr} × ${quantity} — ${total.toFixed(2)} DT · Livraison 24–72h`;

  return (
    <DialogPrimitive.Root open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay: opaque dark dim */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[100]',
            'bg-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Modal/Drawer container: fully opaque, responsive */}
        <DialogPrimitive.Content
          className={cn(
            'fixed z-[101] flex flex-col',
            'bg-white dark:bg-gray-900 shadow-xl',
            'outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            // Mobile: bottom sheet
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-gray-200 dark:border-gray-800',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: centered modal
            'md:inset-auto md:left-1/2 md:top-1/2 md:bottom-auto md:right-auto md:max-h-[85vh] md:w-full md:max-w-[520px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-gray-200 md:dark:border-gray-800',
            'md:data-[state=closed]:slide-out-to-bottom md:data-[state=open]:zoom-in-95 md:data-[state=open]:fade-in-0'
          )}
        >
          {/* Header: title + summary + close X */}
          <div className="shrink-0 flex items-start justify-between gap-4 p-4 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div className="min-w-0">
              <DialogPrimitive.Title className="flex items-center gap-2 font-display uppercase tracking-tight text-lg font-bold text-gray-900 dark:text-white">
                <Zap className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                Commander maintenant
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {summaryLine}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2">
                        {product.designation_fr}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-display font-bold tracking-tight tabular-nums text-red-600 dark:text-red-400 text-sm">{unitPrice} DT</span>
                        {priceDisplay.hasPromo && priceDisplay.oldPrice != null && (
                          <span className="text-gray-500 dark:text-gray-400 line-through text-xs">{priceDisplay.oldPrice} DT</span>
                        )}
                        {discount > 0 && (
                          <Badge className="bg-red-600 text-white text-caption px-1.5 py-0 leading-none">-{discount}%</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {inStock ? 'En stock' : 'Rupture de stock'}
                      </p>
                    </div>
                  </div>

                  {/* Quantité & Arôme – side by side, same prominence */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quantité */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Quantité *
                      </Label>
                      <div className="flex items-center gap-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-2 w-full sm:w-fit bg-white dark:bg-gray-800">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0 rounded-lg"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="flex-1 sm:w-10 text-center font-bold text-lg tabular-nums" aria-live="polite">{quantity}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0 rounded-lg"
                          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                          disabled={!inStock || quantity >= maxQty}
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {Number.isFinite(maxQty) && inStock && quantity >= maxQty && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Stock maximum disponible atteint ({maxQty}).
                        </p>
                      )}
                    </div>

                    {/* Arôme / Variante – same level as quantity; big buttons when multiple */}
                    {productWithAromes.aromes && productWithAromes.aromes.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Arôme *
                        </Label>
                        {isLoadingAromes ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Chargement des arômes...</p>
                        ) : productWithAromes.aromes.length === 1 ? (
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2 border border-gray-200 dark:border-gray-700 rounded-xl px-3 h-12 flex items-center bg-white dark:bg-gray-800">
                            {productWithAromes.aromes[0].designation_fr}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {productWithAromes.aromes.map((ar) => {
                              const isSelected = selectedVariantId === ar.id;
                              return (
                                <Button
                                  key={ar.id}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="default"
                                  className={cn(
                                    'min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border-2',
                                    isSelected && 'bg-red-600 hover:bg-red-700 text-white border-red-600 dark:border-red-600'
                                  )}
                                  onClick={() => setSelectedVariantId(ar.id)}
                                >
                                  {ar.designation_fr}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                        {errors.arome && <p className="text-xs text-red-600 dark:text-red-400">{errors.arome}</p>}
                      </div>
                    )}
                  </div>

                  {/* Nom, Prénom, Email, Téléphone (required) – order: Nom & Prénom, then Email, then Téléphone */}
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
                    <Label htmlFor="qo-email" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Email *
                    </Label>
                    <Input
                      id="qo-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemple@email.com"
                      className="h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
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

                  {/* Code promo */}
                  <section className="pt-2 border-t border-gray-200 dark:border-gray-800" aria-labelledby="qo-coupon-title">
                    <h3 id="qo-coupon-title" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-red-600" aria-hidden="true" />
                      Code promo
                    </h3>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                        <span className="font-medium text-green-800 dark:text-green-200 text-sm">
                          {appliedCoupon.code} appliqué
                          {appliedCoupon.discount_ht > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">(-{appliedCoupon.discount_ttc.toFixed(2)} DT)</span>
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 text-sm"
                          onClick={handleRemoveCoupon}
                        >
                          <X className="h-4 w-4 mr-1" aria-hidden="true" /> Retirer
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="qo-coupon_code" className="sr-only">Code promo</Label>
                        <div className="flex gap-2">
                          <Input
                            id="qo-coupon_code"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            placeholder="Ex: SOBI10"
                            className="flex-1 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 min-h-[44px] px-4 rounded-lg border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={handleApplyCoupon}
                            disabled={isApplyingCoupon || !couponInput.trim()}
                          >
                            {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
                          </Button>
                        </div>
                        {couponMessage && (
                          <p className={cn('text-xs', couponMessageType === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-300')}>
                            {couponMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </section>

                  {errors.submit && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Sticky footer: recap like checkout (Sous-total, Expédition, Total) + trust + primary button */}
          {!result && (
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] rounded-b-2xl md:rounded-b-2xl">
              <div className="space-y-2 mb-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                  <span className="font-medium text-gray-900 dark:text-white">{subtotal.toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Expédition</span>
                  <span className={(appliedCoupon?.free_shipping ? 0 : fraisLivraison) === 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'font-medium text-gray-900 dark:text-white'}>
                    {(appliedCoupon?.free_shipping ? 0 : fraisLivraison) === 0 ? 'Gratuite' : `${(appliedCoupon?.free_shipping ? 0 : fraisLivraison)} DT`}
                  </span>
                </div>
                {appliedCoupon && appliedCoupon.discount_ht > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Remise ({appliedCoupon.code})</span>
                    <span className="font-medium text-green-600 dark:text-green-400">-{appliedCoupon.discount_ttc.toFixed(2)} DT</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-display uppercase tracking-wide text-gray-900 dark:text-white">Total</span>
                  <span className="font-display font-bold tracking-tight tabular-nums text-red-600 dark:text-red-400">{total.toFixed(2)} DT</span>
                </div>
                {subtotal < FREE_SHIPPING_THRESHOLD && fraisLivraison > 0 && !appliedCoupon?.free_shipping && (
                  <p className="text-xs text-green-700 dark:text-green-300">Ajoutez {(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} DT pour la livraison gratuite</p>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                Paiement à la livraison · Livraison 24–72h · Produits authentiques
              </p>
              <Button
                type="submit"
                form="quick-order-form"
                disabled={isSubmitting || needsAromaSelection || !inStock}
                className="w-full h-12 rounded-xl text-base font-display uppercase tracking-wide font-bold bg-red-600 hover:bg-red-700 text-white focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
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
