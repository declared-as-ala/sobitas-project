'use client';

import { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { AddressSelector } from '@/app/components/AddressSelector';
import { submitQuickOrder, getProductDetails, applyCoupon, removeCoupon } from '@/services/api';
import type { QuickOrderPayload, QuickOrderResponse } from '@/types';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import { getPriceDisplay } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { Loader2, CheckCircle2, X, Minus, Plus, Tag } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { cn } from '@/app/components/ui/utils';

/** Cart and checkout also hardcode 300/10; no config/API threshold exists. Keep pricing
 * unchanged, but omit the promotional nudge until a data-backed threshold is available. */
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
  const [fullName, setFullName] = useState('');
  // Keep optional email for post-delivery review requests. The owner's live dry run found
  // 3 delivered orders (3–21 days ago), never asked, with only 1 usable email. Removing this
  // field would further reduce review requests and product ratings; COD still relies on phone.
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
      setTimeout(() => document.getElementById('qo-full-name')?.focus(), 150);
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
    [fullName, email, phone, gouvernorat, delegation, localite].some((v) => (v || '').trim() !== '');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Nom complet requis';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Email invalide';
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

    // Preserve the API's nom/prenom fields while collecting one full name. Split at the
    // last space: the surname goes in nom, preceding words in prenom. A single word is
    // nom alone because the backend requires livraison_nom but allows nullable prenom.
    const normalizedName = fullName.trim().replace(/\s+/g, ' ');
    const lastSpace = normalizedName.lastIndexOf(' ');
    const nom = lastSpace < 0 ? normalizedName : normalizedName.slice(lastSpace + 1);
    const prenom = lastSpace < 0 ? '' : normalizedName.slice(0, lastSpace);
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
      setFullName('');
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

  const summaryLine = product.designation_fr;

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
            'bg-elevated shadow-xl',
            'outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            // Mobile: bottom sheet
            'inset-x-0 bottom-0 max-h-[95dvh] rounded-t-2xl border-t border-hairline',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: centered modal
            'md:inset-auto md:left-1/2 md:top-1/2 md:bottom-auto md:right-auto md:max-h-[92dvh] md:w-full md:max-w-[520px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-hairline',
            'md:data-[state=closed]:slide-out-to-bottom md:data-[state=open]:zoom-in-95 md:data-[state=open]:fade-in-0'
          )}
        >
          {/* Header: title + summary + close X */}
          <div className="shrink-0 flex items-start justify-between gap-4 p-4 pb-3 border-b border-hairline">
            <div className="min-w-0">
              <DialogPrimitive.Title className="flex items-center gap-2 font-display uppercase tracking-tight text-lg font-bold text-ink-1">
                Commander maintenant
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-ink-2 line-clamp-2">
                {summaryLine}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:text-ink-1 hover:bg-sunken focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Body: scrollable form or success */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            <div className="px-4 py-2">
              {result ? (
                <div className="py-4 text-center">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-ok mb-4" aria-hidden />
                  <h3 className="text-xl font-bold text-ink-1 mb-2">Commande confirmée</h3>
                  <p className="text-ink-2 mb-1">
                    Référence : <strong className="text-ink-1">{result.numero ?? `#${result.orderId}`}</strong>
                  </p>
                  <p className="text-sm text-ink-3 mb-4">
                    Nous vous contacterons pour confirmer la livraison.
                  </p>
                  <Button variant="outline" className="min-h-[44px] px-6" onClick={handleClose}>
                    Fermer
                  </Button>
                </div>
              ) : (
                <form id="quick-order-form" onSubmit={handleSubmit} className="space-y-2" noValidate>
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

                  {/* Quantité & Arôme – side by side, same prominence */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Quantité */}
                    <div className="space-y-1">
                      <Label className="block text-sm font-medium text-ink-1">
                        Quantité *
                      </Label>
                      <div className="flex h-11 items-center rounded-lg border border-rule bg-canvas">
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
                        <span className="min-w-0 flex-1 text-center font-bold text-base tabular-nums" aria-live="polite">{quantity}</span>
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
                        <p className="text-xs text-warn">
                          Stock maximum disponible atteint ({maxQty}).
                        </p>
                      )}
                    </div>

                    {/* Native flavour select keeps long variant lists to one row on phones. */}
                    {productWithAromes.aromes && productWithAromes.aromes.length > 0 && (
                      <div className="space-y-1">
                        <Label htmlFor="qo-arome" className="block text-sm font-medium text-ink-1">
                          Arôme *
                        </Label>
                        {isLoadingAromes ? (
                          <p className="text-sm text-ink-3 py-2">Chargement des arômes...</p>
                        ) : (
                          <select id="qo-arome" value={selectedVariantId ?? ''}
                            onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                            aria-label="Arôme" aria-invalid={!!errors.arome}
                            className="h-11 w-full rounded-lg border border-rule bg-canvas px-3 text-base text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                            {productWithAromes.aromes.map((ar) => <option key={ar.id} value={ar.id}>{ar.designation_fr}</option>)}
                          </select>
                        )}
                        {errors.arome && <p className="text-xs text-destructive">{errors.arome}</p>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="qo-full-name" className="block text-sm font-medium text-ink-1">Nom complet *</Label>
                    <Input id="qo-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ahmed Ben Ali" autoComplete="name" required
                      className="h-11 rounded-lg border-rule bg-canvas text-ink-1 focus-visible:ring-focus"
                      aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'qo-name-error' : undefined} />
                    {errors.fullName && <p id="qo-name-error" className="text-xs text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0 space-y-1">
                      <Label htmlFor="qo-phone" className="block text-sm font-medium text-ink-1">Téléphone *</Label>
                      <Input id="qo-phone" ref={phoneInputRef} type="tel" inputMode="numeric"
                        value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="12 345 678"
                        autoComplete="tel" required className="h-11 rounded-lg border-rule bg-canvas text-ink-1 focus-visible:ring-focus"
                        aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'qo-phone-error' : undefined} />
                      {errors.phone && <p id="qo-phone-error" className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label htmlFor="qo-email" className="block text-sm font-medium text-ink-1">Email (facultatif)</Label>
                      <Input id="qo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemple@email.com" autoComplete="email"
                        className="h-11 rounded-lg border-rule bg-canvas text-ink-1 focus-visible:ring-focus"
                        aria-invalid={!!errors.email} aria-describedby={errors.email ? 'qo-email-error' : undefined} />
                      {errors.email && <p id="qo-email-error" className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Preserve all required address fields. Reuse checkout's native controls;
                      pair delegation/locality on phones so the complete form fits the sheet. */}
                  <div className="[&>div]:grid-cols-2 [&>div>div:first-child]:col-span-2">
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
                    checkout
                    required
                    errors={errors}
                  />
                  </div>

                  {/* Code promo */}
                  <details className="border-t border-hairline">
                    <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg text-sm text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                      <Tag className="h-4 w-4 text-brand" aria-hidden="true" />
                      Code promo
                    </summary>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-elevated border border-ok/40">
                        <span className="font-medium text-ok text-sm">
                          {appliedCoupon.code} appliqué
                          {appliedCoupon.discount_ht > 0 && (
                            <span className="text-ok ml-1">(-{appliedCoupon.discount_ttc.toFixed(2)} DT)</span>
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-11 text-ok hover:bg-sunken text-sm"
                          onClick={handleRemoveCoupon}
                        >
                          <X className="h-4 w-4 mr-1" aria-hidden="true" /> Retirer
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label htmlFor="qo-coupon_code" className="sr-only">Code promo</Label>
                        <div className="flex gap-2">
                          <Input
                            id="qo-coupon_code"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            placeholder="Ex: SOBI10"
                            className="flex-1 min-h-[44px] rounded-lg border border-rule bg-canvas text-ink-1"
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 min-h-[44px] px-4 rounded-lg border-rule text-brand hover:bg-sunken"
                            onClick={handleApplyCoupon}
                            disabled={isApplyingCoupon || !couponInput.trim()}
                          >
                            {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
                          </Button>
                        </div>
                        {couponMessage && (
                          <p className={cn('text-xs', couponMessageType === 'error' ? 'text-destructive' : 'text-ok')}>
                            {couponMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </details>

                  {errors.submit && (
                    <p className="text-sm text-destructive">{errors.submit}</p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Keep totals and confirmation visible even when errors or the promo field expand. */}
          {!result && (
            <div className="shrink-0 border-t border-hairline bg-elevated px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] rounded-b-2xl md:rounded-b-2xl">
              <div className="space-y-1 mb-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Sous-total</span>
                  <span className="font-medium text-ink-1">{subtotal.toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Expédition</span>
                  <span className={(appliedCoupon?.free_shipping ? 0 : fraisLivraison) === 0 ? 'text-ok font-medium' : 'font-medium text-ink-1'}>
                    {(appliedCoupon?.free_shipping ? 0 : fraisLivraison) === 0 ? 'Gratuite' : `${(appliedCoupon?.free_shipping ? 0 : fraisLivraison)} DT`}
                  </span>
                </div>
                {appliedCoupon && appliedCoupon.discount_ht > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-2">Remise ({appliedCoupon.code})</span>
                    <span className="font-medium text-ok">-{appliedCoupon.discount_ttc.toFixed(2)} DT</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-rule">
                  <span className="font-display uppercase tracking-wide text-ink-1">Total</span>
                  <span className="font-display font-bold tracking-tight tabular-nums text-brand">{total.toFixed(2)} DT</span>
                </div>

              </div>
              <p className="text-xs text-ink-3 mb-3">
                Paiement à la livraison
              </p>
              <Button
                type="submit"
                form="quick-order-form"
                disabled={isSubmitting || needsAromaSelection || !inStock}
                className="w-full h-12 rounded-xl text-base font-display uppercase tracking-wide font-bold bg-brand hover:bg-brand-hover text-on-brand focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
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
