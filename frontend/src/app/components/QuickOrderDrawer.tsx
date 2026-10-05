'use client';

import { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { AddressSelector } from '@/app/components/AddressSelector';
import { submitQuickOrder, getProductDetails, applyCoupon, removeCoupon, getStorageUrl } from '@/services/api';
import type { Product, QuickOrderPayload, QuickOrderResponse } from '@/types';
import { couponNote, formatDt, moneyPlaces, type CheckoutPricing } from '@/util/checkoutPricing';
import { cachedLoyaltyRules, isLoyaltyExcludedProduct, isProtinasV3, loadLoyaltyRules, pointsToDt, type LoyaltyRules } from '@/util/loyaltyPoints';
import { useAuth } from '@/contexts/AuthContext';
import { useCartActions } from '@/app/contexts/CartContext';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import { getPriceDisplay } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { Loader2, CheckCircle2, X, Minus, Plus, Tag, Gift } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { cn } from '@/app/components/ui/utils';
import { gaEvent, isGtagLoaded, trackPurchaseOnce, type Ga4Item } from '@/lib/analytics/ga4';

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

/** GA4 begin_checkout for the drawer's one product; the item builder is loaded on demand. */
function trackBeginCheckout(product: QuickOrderProduct, quantity: number, variant?: string) {
  void import('@/lib/analytics/ga4Items')
    .then(({ gaItemFromProduct }) => {
      const item = gaItemFromProduct(product, { quantity, variant });
      gaEvent('begin_checkout', { currency: 'TND', value: (item.price ?? 0) * quantity, items: [item] }, { defer: true });
    })
    .catch(() => undefined);
}

/**
 * GA4 `purchase` for a created quick order. The builder module is normally cached by the
 * begin_checkout above; if it cannot load, the purchase still goes out with its revenue.
 */
function trackQuickOrderPurchase(
  order: { transactionId: string; value: number; shipping: number; coupon?: string; serverReported?: boolean },
  line: { product: QuickOrderProduct; quantity: number; price: number; variant?: string },
) {
  const send = (items: Ga4Item[]) => trackPurchaseOnce({ ...order, items });
  void import('@/lib/analytics/ga4Items')
    .then(({ gaItemFromProduct }) => {
      send([gaItemFromProduct(line.product, { quantity: line.quantity, price: line.price, variant: line.variant })]);
    })
    .catch(() => { send([]); });
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
    /** percent · fixed · free_shipping (from /coupons/apply). */
    type?: string;
    discount_ht: number;
    discount_ttc: number;
    free_shipping?: boolean;
    /** The subtotal /coupons/apply priced the code on: a percentage follows the quantity from there. */
    appliedSubtotal: number;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponMessageType, setCouponMessageType] = useState<'success' | 'error' | null>(null);

  /**
   * The server's own figures, after it answered 409 because it would charge more than this drawer
   * computed (a code capped by the order budget, a machine that never reaches free delivery…).
   * Shown instead of the local estimate; the next tap sends `total` as expected_total. `pricing` keeps
   * the whole answer so the code line says what the server did with the code (capped, refused).
   */
  const [serverPricing, setServerPricing] = useState<{ total: number; shipping: number; pricing: CheckoutPricing } | null>(null);

  const priceDisplay = getPriceDisplay(product);
  const unitPrice = priceDisplay.finalPrice;
  const subtotal = unitPrice * quantity;
  /*
   * The published rules, not a hard-coded 300 / 10: rule 19 keeps the machines out of free delivery
   * and out of every code, so their delivery is always charged and a code never lowers their price.
   */
  const [rules, setRules] = useState<LoyaltyRules>(() => cachedLoyaltyRules());
  const isMachine = isLoyaltyExcludedProduct(product, rules);
  const fraisLivraison = isMachine || subtotal < rules.delivery.free_from_dt ? rules.delivery.fee_dt : 0;
  /*
   * The estimate follows the CURRENT quantity. /coupons/apply priced the code once, on the subtotal of
   * that moment; reading its old total_ttc after « + » showed 57.50 for three units of 50. A
   * percentage scales with the subtotal, a fixed amount stays. The figure is discount_ht, the one the
   * order deducts (prix_ttc = prix_ht − discount_ht − remise + frais). The server still prices the
   * order: every tap sends the total shown here as expected_total, and any difference (a code capped
   * or dropped, a price that changed) comes back as a 409 with its own figures instead of an order.
   */
  const couponDiscount = !appliedCoupon || appliedCoupon.free_shipping || isMachine
    ? 0
    : appliedCoupon.type === 'percent' && appliedCoupon.appliedSubtotal > 0
      ? Math.min(subtotal, Math.round((appliedCoupon.discount_ht * subtotal / appliedCoupon.appliedSubtotal) * 1000) / 1000)
      : Math.min(subtotal, appliedCoupon.discount_ht);
  const shippingEstimate = appliedCoupon?.free_shipping && !isMachine ? 0 : fraisLivraison;
  const estimatedTotal = Math.max(0, Math.round((subtotal - couponDiscount + shippingEstimate) * 1000) / 1000);
  const total = serverPricing?.total ?? estimatedTotal;
  const shippingShown = serverPricing?.shipping ?? shippingEstimate;
  const discountShown = serverPricing
    ? Math.max(0, Math.round((subtotal + serverPricing.shipping - serverPricing.total) * 1000) / 1000)
    : couponDiscount;
  // One precision for the whole column (« 282.106 » never rounds to « 282.11 » under « 300.00 »).
  const places = moneyPlaces([subtotal, shippingShown, discountShown, total]);
  // After a 409 the server's verdict on the code replaces /coupons/apply's uncapped figure.
  const serverCoupon = serverPricing && appliedCoupon ? serverPricing.pricing.coupon : null;
  const serverCouponApplied = !!serverCoupon && serverCoupon.applied && serverCoupon.amount_dt > 0;
  const serverCouponNote = serverPricing && serverCoupon
    ? couponNote(serverPricing.pricing, rules, moneyPlaces([serverCoupon.amount_dt]))
    : null;

  /*
   * The quick order spends no gift (the route sends use_gift: false: the drawer has no Protinas block,
   * so no gift line and no « Garder pour plus tard »). A signed-in customer holding gift Protinas was
   * promised they apply on their own to the next order, so the drawer says where they do: the cart.
   */
  const { user } = useAuth();
  const { addToCart } = useCartActions();
  const giftPoints = isProtinasV3(rules) && !isMachine && !user?.protinas?.blocked_reason
    ? Math.max(0, Math.floor(user?.protinas?.gift_balance ?? 0))
    : 0;
  const giftDt = pointsToDt(giftPoints, Math.max(1, rules.points_per_dt));

  // Any change to the basket voids the confirmed server total.
  useEffect(() => {
    setServerPricing(null);
  }, [quantity, appliedCoupon?.code, product.id]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadLoyaltyRules().then((value) => { if (live) setRules(value); });
    return () => { live = false; };
  }, [open]);
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
      trackBeginCheckout(
        product,
        Math.min(stock, Math.max(1, initialQty)),
        product.aromes?.find((aroma) => aroma.id === (initialVariantId ?? product.aromes?.[0]?.id))?.designation_fr,
      );
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
          type: result.coupon?.type,
          discount_ht: result.discount_ht ?? 0,
          discount_ttc: result.discount_ttc ?? 0,
          free_shipping: result.free_shipping,
          appliedSubtotal: subtotal,
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
      arome: productWithAromes.aromes?.find((aroma) => aroma.id === selectedVariantId)?.designation_fr,
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
      // Always the total on screen: the server creates the order only at that amount, and answers
      // 409 with its own pricing otherwise (never a courier collecting more than the drawer said).
      expectedTotal: total,
    };

    try {
      const serializedPayload = JSON.stringify(payload);
      if (orderAttemptRef.current?.payload !== serializedPayload) {
        orderAttemptRef.current = {
          payload: serializedPayload,
          key: crypto.randomUUID?.() ?? `quick-order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
      }
      // After the comparison above, so a retry keeps its idempotency key (see CheckoutPage).
      const res = await submitQuickOrder({ ...payload, ga: { gtag_loaded: isGtagLoaded() } }, orderAttemptRef.current.key);
      orderAttemptRef.current = null;
      setResult(res);
      trackEvent('quick_order_success', { order_id: res.orderId, product_id: product.id });
      if (res.status === 'created' && res.orderId) {
        // The server created the order at exactly `total` (otherwise it answers 409), so the
        // revenue is that total less the delivery shown. A machine takes no code (rule 19).
        trackQuickOrderPurchase({
          transactionId: typeof res.numero === 'string' && /^\d{4}\/\d+$/.test(res.numero) ? res.numero : String(res.orderId),
          value: Math.round(Math.max(0, total - shippingShown) * 1000) / 1000,
          shipping: shippingShown,
          coupon: serverPricing
            ? (serverPricing.pricing.coupon.applied ? serverPricing.pricing.coupon.code ?? appliedCoupon?.code : undefined)
            : (isMachine ? undefined : appliedCoupon?.code),
          serverReported: res.ga4ServerPurchase === true,
        }, { product, quantity, price: unitPrice, variant: payload.arome });
      }
      onSuccess?.(res);
    } catch (err: unknown) {
      const pricing = (err as { status?: number; pricing?: CheckoutPricing }).pricing;
      if ((err as { status?: number }).status === 409 && pricing && Number.isFinite(pricing.total_dt)) {
        // Nothing was created: show the server's total and let the customer confirm it.
        const shipping = Math.round(((pricing.shipping_dt ?? 0) + (pricing.protinas?.used_on_shipping_dt ?? 0)) * 1000) / 1000;
        setServerPricing({ total: pricing.total_dt, shipping, pricing });
        const msg = `Le total a été mis à jour : ${formatDt(pricing.total_dt, moneyPlaces([pricing.total_dt]))} à payer à la livraison. Vérifiez puis confirmez.`;
        setErrors({ submit: msg });
        toast.warning(msg);
        trackEvent('quick_order_total_updated', { product_id: product.id, total: pricing.total_dt });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erreur. Réessayez.';
      setErrors({ submit: msg });
      toast.error(msg);
      trackEvent('quick_order_fail', { product_id: product.id, error: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * « Utiliser mon cadeau »: the same line in the cart, where the checkout applies the gift. addToCart()
   * opens the cart drawer (with « Commander »), which IS the cart: no navigation to /cart on top of it —
   * the drawer would slide open over the cart page, the same basket twice.
   */
  const handleUseGiftInCart = () => {
    const aroma = productWithAromes.aromes?.find((entry) => entry.id === selectedVariantId);
    addToCart({
      ...product,
      name: product.designation_fr,
      price: unitPrice,
      priceText: `${unitPrice} DT`,
      image: product.cover ? getStorageUrl(product.cover) : '',
      ...(aroma && { selectedAroma: { id: aroma.id, designation_fr: aroma.designation_fr } }),
    } as unknown as Product, quantity, aroma?.designation_fr);
    trackEvent('quick_order_gift_to_cart', { product_id: product.id });
    setInternalOpen(false);
    onOpenChange(false);
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
      setServerPricing(null);
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
              /* `focus-visible`, not `focus`: on a mouse click this was painting a 2px ring the
                 pointer user never asked for, on the one control that closes the dialog. Every
                 other close on the site uses focus-visible. */
              className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:text-ink-1 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
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
                      <div className={cn('flex items-center justify-between gap-2 p-3 rounded-xl bg-elevated border', serverCoupon && !serverCouponApplied ? 'border-hairline' : 'border-ok/40')}>
                        {serverCoupon ? (
                          serverCouponApplied ? (
                            <span className="font-medium text-ok text-sm">
                              {appliedCoupon.code} appliqué
                              <span className="text-ok ml-1">(-{formatDt(serverCoupon.amount_dt, moneyPlaces([serverCoupon.amount_dt]))})</span>
                              {serverCouponNote && <span className="mt-0.5 block text-xs font-normal text-ink-2">{serverCouponNote}</span>}
                            </span>
                          ) : (
                            <span className="text-sm text-ink-2">
                              <span className="font-medium text-ink-1">{appliedCoupon.code}</span> non appliqué sur ce panier
                              {serverCouponNote && <span className="mt-0.5 block text-xs text-ink-2">{serverCouponNote}</span>}
                            </span>
                          )
                        ) : (
                          <span className="font-medium text-ok text-sm">
                            {appliedCoupon.code} appliqué
                            {couponDiscount > 0 && (
                              <span className="text-ok ml-1">(-{formatDt(couponDiscount, moneyPlaces([couponDiscount]))})</span>
                            )}
                          </span>
                        )}
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

                  {isMachine && (
                    <p className="text-xs leading-relaxed text-ink-3">
                      Machines et matériel de musculation : hors livraison offerte, code promo, remise pack et cadeau ; sans Protinas gagnées.
                    </p>
                  )}

                  {giftPoints > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-hairline bg-sunken p-3" data-quick-order-gift="">
                      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                      <div className="min-w-0 text-xs leading-relaxed text-ink-2">
                        <p>Votre cadeau de {formatDt(giftDt)} ne s’applique pas en commande rapide : passez par le panier pour l’utiliser.</p>
                        <button
                          type="button"
                          onClick={handleUseGiftInCart}
                          disabled={!inStock || needsAromaSelection}
                          className="-mb-2 inline-flex min-h-11 items-center rounded-lg font-semibold text-brand underline underline-offset-4 hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                        >
                          Ajouter au panier
                        </button>
                      </div>
                    </div>
                  )}

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
                  <span className="font-medium text-ink-1">{formatDt(subtotal, places)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Expédition</span>
                  <span className={shippingShown === 0 ? 'text-ok font-medium' : 'font-medium text-ink-1'}>
                    {shippingShown === 0 ? 'Gratuite' : formatDt(shippingShown, places)}
                  </span>
                </div>
                {(serverPricing ? discountShown > 0 : appliedCoupon && couponDiscount > 0) && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-2">{serverPricing ? 'Remises' : `Remise (${appliedCoupon?.code})`}</span>
                    <span className="font-medium text-ok">-{formatDt(discountShown, places)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-rule">
                  <span className="font-display uppercase tracking-wide text-ink-1">Total</span>
                  <span className="font-display font-bold tracking-tight tabular-nums text-brand">{formatDt(total, places)}</span>
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
