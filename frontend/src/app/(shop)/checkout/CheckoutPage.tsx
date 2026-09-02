'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { createOrder, getStorageUrl, getOrderDetails, applyCoupon, removeCoupon, getSiteLogoUrlResolved, packQuote } from '@/services/api';
import { buildBackendOrderPayload } from '@/lib/orderPayload';
import type { Order, PackQuote } from '@/types';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft, ShoppingCart, Shield, Truck, CheckCircle2, Loader2, CreditCard, Wallet, Printer, List, ArrowRight, Package, Tag, X, Gift, Percent } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { AddressSelector } from '@/app/components/AddressSelector';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { CheckoutFooterCTA } from '@/app/(shop)/checkout/CheckoutFooterCTA';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { LoyaltyEarnLine } from '@/app/components/loyalty/LoyaltyEarnLine';
import { REDEEM_POINTS_PER_DT, MAX_REDEEM_FRACTION } from '@/util/loyaltyPoints';
import { Container } from '@/app/components/layout/Container';

const FREE_SHIPPING_THRESHOLD = 300;

// Points economy — imported, not redeclared. These two numbers were previously written out here
// AND in FidelitySection AND in two reassurance strings; util/loyaltyPoints.ts is now the one place
// they live on the client, mirroring PointsService.php. The server total is always authoritative.

export default function CheckoutPage() {
  const router = useRouter();
  const { items, isLoaded, getTotalPrice, getEffectivePrice, clearCart, packDiscount } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [orderData, setOrderData] = useState<{ order: Order; orderDetails: any[] } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const checkoutAttemptRef = useRef<{ payload: string; key: string } | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const keyboardOpen = useKeyboardOpen();
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

  // Pack (bundle) discount — authoritative quote from the server when the user opted in on /pack-builder.
  const [packQuoteData, setPackQuoteData] = useState<PackQuote | null>(null);
  // Loyalty points the user chooses to spend on this order.
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const pointsBalance = user?.points_balance ?? 0;

  // Single address (livraison) selector state
  const [gouvernorat, setGouvernorat] = useState('');
  const [delegation, setDelegation] = useState('');
  const [localite, setLocalite] = useState('');
  const [codePostal, setCodePostal] = useState('');

  // Form state: one address (adresse de livraison) only
  const [formData, setFormData] = useState({
    // The backend keeps separate legacy columns, but checkout asks for one human-friendly full name.
    // We store the complete value in livraison_nom and leave livraison_prenom empty for compatibility.
    livraison_nom: user?.name || '',
    livraison_prenom: '',
    livraison_email: user?.email || '',
    livraison_phone: '',
    pays: 'Tunisie',
    livraison_region: '',
    livraison_ville: '',
    livraison_code_postale: '',
    livraison_adresse1: '',
    note: '',
    livraison: 1,
  });

  useEffect(() => {
    // Wait until the cart has rehydrated from localStorage. Without this, a hard load of /checkout
    // (refresh, mobile tab restore, direct URL) runs this effect while items is still the initial []
    // and kicks a buyer with a full cart back to /cart — losing the sale.
    if (!isLoaded) return;
    // Don't redirect if order is being completed or already completed, or if we're on step 3
    if (isOrderComplete || isSubmitting || currentStep === 3) {
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
  }, [items, isLoaded, router, isOrderComplete, isSubmitting, currentStep]);

  /**
   * Mobile viewport: set --app-height from visualViewport so we avoid 100vh jumps
   * (Safari iOS). We no longer set --keyboard-offset: the CTA is hidden when
   * keyboard is open (useKeyboardOpen) so the layout stays intact.
   */
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(() => {
        const height = vv.height ?? window.innerHeight;
        document.documentElement.style.setProperty('--app-height', `${height}px`);
      });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      cancelAnimationFrame(rafId);
    };
  }, []);

  /**
   * Scroll on focus: when an input/select/textarea in the checkout form gets focus
   * (keyboard opens on mobile), scroll it into view so it is not hidden by the CTA
   * or the keyboard. Small delay so the keyboard has time to open.
   */
  useEffect(() => {
    const form = document.getElementById('checkout-form');
    if (!form) return;
    const fields = form.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), select, textarea');
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.scrollIntoView !== 'function') return;
      setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    };
    fields.forEach((el) => el.addEventListener('focus', handleFocus));
    return () => fields.forEach((el) => el.removeEventListener('focus', handleFocus));
  }, [items.length]);

  // Sync formData when address selector values change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      livraison_region: gouvernorat,
      livraison_ville: localite || delegation,
      livraison_code_postale: codePostal,
    }));
  }, [gouvernorat, delegation, localite, codePostal]);

  // When the pack (bundle) discount is opted-in, fetch the authoritative quote from the server so the
  // "Remise pack" line reflects the real tier discount (the client never computes the DT amount itself).
  useEffect(() => {
    let ignore = false;
    if (!packDiscount || items.length === 0) {
      setPackQuoteData(null);
      return;
    }
    packQuote(items.map((item) => ({ produit_id: item.product.id, quantite: item.quantity })))
      .then((quote) => { if (!ignore) setPackQuoteData(quote); })
      .catch(() => { if (!ignore) setPackQuoteData(null); });
    return () => { ignore = true; };
  }, [packDiscount, items]);

  // Memoize price calculations to avoid recalculating on every render
  const totalPrice = useMemo(() => getTotalPrice(), [items, getTotalPrice]);
  const shippingCost = useMemo(() => 
    totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : 10, 
    [totalPrice]
  );
  // Coupon discount in DT (HT). appliedCoupon.totals already reflects it; we reuse it for the points cap.
  const couponDiscount = appliedCoupon?.discount_ht ?? 0;

  // Pack (bundle) discount — only when the user opted in on /pack-builder AND the server quote loaded.
  const packDiscountAmount = packDiscount && packQuoteData ? packQuoteData.discount_amount : 0;

  // Post-coupon, post-pack subtotal — the base the points redemption is capped against (contract: 50%).
  const subtotalAfterPack = useMemo(
    () => Math.max(0, totalPrice - couponDiscount - packDiscountAmount),
    [totalPrice, couponDiscount, packDiscountAmount]
  );

  const maxRedeemablePoints = useMemo(() => {
    const capPoints = Math.floor(subtotalAfterPack * MAX_REDEEM_FRACTION * REDEEM_POINTS_PER_DT);
    return Math.max(0, Math.min(pointsBalance, capPoints));
  }, [subtotalAfterPack, pointsBalance]);

  // Keep the chosen amount within the live cap (cart/coupon/pack changes can shrink it).
  useEffect(() => {
    setPointsToRedeem((p) => Math.min(p, maxRedeemablePoints));
  }, [maxRedeemablePoints]);

  const effectivePointsToRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);
  const pointsDiscountDt = effectivePointsToRedeem / REDEEM_POINTS_PER_DT;

  const finalTotal = useMemo(() => {
    const base = appliedCoupon?.totals ? appliedCoupon.totals.total_ttc : totalPrice + shippingCost;
    return Math.max(0, base - packDiscountAmount - pointsDiscountDt);
  }, [totalPrice, shippingCost, appliedCoupon, packDiscountAmount, pointsDiscountDt]);

  // Memoized handler to prevent unnecessary re-renders
  // Using a stable reference to avoid recreating the function on every render
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev =>
      prev[field as keyof typeof prev] === value ? prev : { ...prev, [field]: value }
    );
  }, []);

  const handleGouvernoratChange = useCallback((value: string) => {
    setGouvernorat(value);
    setDelegation('');
    setLocalite('');
    setCodePostal('');
  }, []);

  const handleDelegationChange = useCallback((value: string) => {
    setDelegation(value);
    setLocalite('');
    setCodePostal('');
  }, []);

  const handleLocaliteChange = useCallback((value: string, postalCode: string) => {
    setLocalite(value);
    setCodePostal(postalCode);
  }, []);

  async function handleApplyCoupon() {
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
      const subtotal = totalPrice;
      const frais = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : shippingCost;
      const result = await applyCoupon({
        code,
        subtotal_ht: subtotal,
        frais_livraison: frais,
        ...(user?.id && { client_id: user.id }),
        ...(formData.livraison_email && { email: formData.livraison_email }),
        ...(formData.livraison_phone && { phone: formData.livraison_phone }),
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
        const message = result.message || 'Code promo invalide ou expiré';
        setCouponMessage(message);
        setCouponMessageType('error');
        toast.error(message);
      }
    } catch (err: any) {
      const message = err?.message || 'Erreur lors de l\'application du code promo';
      setCouponMessage(message);
      setCouponMessageType('error');
      toast.error(message);
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function handleRemoveCoupon() {
    try {
      const subtotal = totalPrice;
      const frais = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : shippingCost;
      await removeCoupon({ subtotal_ht: subtotal, frais_livraison: frais });
      setAppliedCoupon(null);
      setCouponInput('');
      setCouponMessage('Code promo retiré');
      setCouponMessageType('success');
      toast.success('Code promo retiré');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression du code');
    }
  }

  const validateForm = () => {
    const required = ['livraison_nom', 'livraison_phone', 'livraison_adresse1'];
    for (const field of required) {
      if (!String(formData[field as keyof typeof formData]).trim()) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return false;
      }
    }
    if (!gouvernorat || !delegation || !localite) {
      toast.error('Veuillez sélectionner le gouvernorat, la délégation et la localité');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.livraison_email.trim() && !emailRegex.test(formData.livraison_email.trim())) {
      toast.error('Email invalide');
      return false;
    }
    const normalizedPhone = formData.livraison_phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:(?:\+|00)216)?[2-9]\d{7}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      toast.error('Numéro de téléphone invalide (8 chiffres tunisiens, commençant par 2-9)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Same backend structure as commande rapide (see lib/orderPayload.ts)
      const orderPayload = buildBackendOrderPayload({
        livraison: {
          livraison_nom: formData.livraison_nom.trim(),
          livraison_prenom: formData.livraison_prenom,
          livraison_email: formData.livraison_email.trim() || undefined,
          livraison_phone: formData.livraison_phone.trim(),
          livraison_region: formData.livraison_region,
          livraison_ville: formData.livraison_ville,
          livraison_code_postale: formData.livraison_code_postale || undefined,
          livraison_adresse1: formData.livraison_adresse1,
          note: formData.note || undefined,
          livraison: formData.livraison,
          frais_livraison: appliedCoupon?.free_shipping ? 0 : shippingCost,
        },
        panier: items.map(item => ({
          produit_id: item.product.id,
          quantite: item.quantity,
          prix_unitaire: getEffectivePrice(item.product),
        })),
        user_id: user?.id,
        coupon_code: appliedCoupon?.code,
        // Opt-in bundle discount: backend derives the DT amount from the SERVER subtotal.
        pack_discount: packDiscount || undefined,
        // Loyalty points to spend: backend re-validates <= balance and <= cap.
        points_to_redeem: effectivePointsToRedeem > 0 ? effectivePointsToRedeem : undefined,
      });

      const serializedPayload = JSON.stringify(orderPayload);
      if (checkoutAttemptRef.current?.payload !== serializedPayload) {
        checkoutAttemptRef.current = {
          payload: serializedPayload,
          key: crypto.randomUUID?.() ?? `order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
      }
      const response = await createOrder(orderPayload, checkoutAttemptRef.current.key);
      
      // Get order ID from response (could be response.id or response.commande.id)
      const orderId = response.id || (response as any).commande?.id || (response as any).data?.id;
      
      if (!orderId) {
        console.error('Order ID not found in response:', response);
        throw new Error('Erreur: ID de commande introuvable dans la réponse');
      }
      
      // Set flag to prevent cart redirect BEFORE clearing cart
      setIsOrderComplete(true);
      checkoutAttemptRef.current = null;
      
      // Move to step 3 (confirmation) BEFORE clearing cart and fetching details
      // This ensures the component doesn't return null due to empty cart
      setCurrentStep(3);
      
      // Fetch order details for confirmation step
      try {
        const orderDetailsData = await getOrderDetails(Number(orderId));
        setOrderData({
          order: orderDetailsData.facture,
          orderDetails: orderDetailsData.details_facture || []
        });
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error('Erreur lors du chargement des détails de la commande');
        // Create a minimal order object from the response if fetch fails
        setOrderData({
          order: {
            id: Number(orderId),
            numero: (response as any).numero || `#${orderId}`,
            nom: formData.livraison_nom,
            prenom: formData.livraison_prenom,
            email: formData.livraison_email,
            phone: formData.livraison_phone,
            pays: formData.pays,
            region: formData.livraison_region,
            ville: formData.livraison_ville,
            code_postale: formData.livraison_code_postale?.toString(),
            adresse1: formData.livraison_adresse1,
            livraison: formData.livraison,
            frais_livraison: shippingCost,
            prix_ht: totalPrice,
            prix_ttc: finalTotal,
            etat: 'nouvelle_commande',
            user_id: user?.id,
            created_at: new Date().toISOString(),
          } as Order,
          orderDetails: items.map(item => {
            const unitPrice = getEffectivePrice(item.product);
            return {
            id: 0,
            produit_id: item.product.id,
            qte: item.quantity,
            prix_unitaire: unitPrice,
            prix_ht: unitPrice * item.quantity,
            prix_ttc: unitPrice * item.quantity,
            produit: {
              id: item.product.id,
              designation_fr: (item.product as any).designation_fr || (item.product as any).name || 'Produit',
              cover: (item.product as any).cover,
              slug: (item.product as any).slug,
            }
          };
          })
        });
      }
      
      toast.success('Commande passée avec succès !');
      
      // Clear cart AFTER setting step 3 and order data
      clearCart();
    } catch (error: any) {
      console.error('Order error:', error);
      // createOrder throws a fetch-based `Error` whose message carries the backend detail (e.g.
      // 'Stock insuffisant pour "X" (demandé: N).') — read error.message first. `error.response`
      // is an axios shape that never exists here, so it always fell through to the generic text.
      toast.error(error?.message || error?.response?.data?.message || 'Erreur lors de la commande. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = async () => {
    if (!printRef.current || !orderData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour imprimer');
      return;
    }

    const logoUrl = await getSiteLogoUrlResolved();
    const order = orderData.order;
    const details = orderData.orderDetails;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Commande #${order?.numero || ''}</title>
          <style>
            @media print {
              @page { margin: 20mm; size: A4; }
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
            }
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #1f2937; background: #fff; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #DA3E06; }
            .logo { height: 60px; width: auto; }
            .order-number { font-size: 24px; font-weight: bold; color: #DA3E06; margin-bottom: 5px; }
            .confirmation-message { text-align: center; margin: 30px 0; padding: 20px; background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; }
            .section { margin: 30px 0; }
            .section-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .summary-total { font-weight: bold; font-size: 18px; border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Logo" class="logo" />
            <div>
              <div class="order-number">Commande #${order?.numero || ''}</div>
              <div>Date: ${formatDate(order?.created_at || null)}</div>
            </div>
          </div>
          <div class="confirmation-message">
            <h1><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Commande confirmée</h1>
            <p>Merci pour votre commande !</p>
          </div>
          <div class="section">
            <div class="section-title">Détails de la commande</div>
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${details.map((detail: any) => `
                  <tr>
                    <td>${detail.produit?.designation_fr || 'Produit'}</td>
                    <td>${detail.qte || 0}</td>
                    <td>${(detail.prix_unitaire || 0).toFixed(2)} TND</td>
                    <td>${(detail.prix_ttc || 0).toFixed(2)} TND</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top: 20px;">
              <div class="summary-row">
                <span>Sous-total:</span>
                <span>${(order?.prix_ht || 0).toFixed(2)} TND</span>
              </div>
              ${(order as any)?.coupon_code_snapshot && (order as any)?.discount_ht ? `
                <div class="summary-row">
                  <span>Code promo (${(order as any).coupon_code_snapshot}):</span>
                  <span style="color: #16a34a;">-${((order as any).discount_ttc ?? (order as any).discount_ht ?? 0).toFixed(2)} TND</span>
                </div>
              ` : ''}
              ${order?.frais_livraison ? `
                <div class="summary-row">
                  <span>Expédition:</span>
                  <span>${order.frais_livraison} TND</span>
                </div>
              ` : `
                <div class="summary-row">
                  <span>Expédition:</span>
                  <span style="color: #16a34a;">Livraison gratuite</span>
                </div>
              `}
              <div class="summary-row summary-total">
                <span>Total:</span>
                <span>${(order?.prix_ttc || 0).toFixed(2)} TND</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Step 3: Confirmation - Show this even if cart is empty (order already placed)
  if (currentStep === 3 && orderData) {
    const order = orderData.order;
    const details = orderData.orderDetails;
    const confirmationEmail = order?.livraison_email || order?.email;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        
        <main className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 lg:hidden mb-4">Étape 3 sur 3 — Confirmation</p>
          <div className="hidden lg:flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-sm font-semibold">1</div>
              <span className="text-sm font-medium text-gray-500">Panier</span>
            </div>
            <div className="flex-1 h-0.5 bg-red-600 mx-2 max-w-[80px]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-sm font-semibold">2</div>
              <span className="text-sm font-medium text-gray-500">Livraison & Paiement</span>
            </div>
            <div className="flex-1 h-0.5 bg-red-600 mx-2 max-w-[80px]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-semibold">3</div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Confirmation</span>
            </div>
          </div>

          {/* Confirmation Content */}
          <div className="max-w-4xl mx-auto">
            {/* Success Message */}
            <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" aria-hidden="true" />
                  <h1 className="font-display uppercase tracking-tight text-3xl text-gray-900 dark:text-white mb-2">
                    Commande confirmée !
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    Merci pour votre commande #{order?.numero || ''}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {confirmationEmail
                      ? `Un email de confirmation a été envoyé à ${confirmationEmail}`
                      : 'Notre équipe vous contactera par téléphone pour confirmer la livraison.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="lg"
                className="min-h-[48px] rounded-xl"
              >
                <Printer className="h-5 w-5 mr-2" aria-hidden="true" />
                Imprimer
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide rounded-xl min-h-[48px]"
              >
                <Link href="/account/orders">
                  <List className="h-5 w-5 mr-2" aria-hidden="true" />
                  Voir toutes mes commandes
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-h-[48px] rounded-xl"
              >
                <Link href="/shop">
                  <ArrowRight className="h-5 w-5 mr-2" aria-hidden="true" />
                  Continuer les achats
                </Link>
              </Button>
            </div>

            {/* Order Recap */}
            <div ref={printRef}>
              <Card className="mb-6 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">
                    <Package className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                    Récapitulatif de la commande
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Numéro de commande</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">#{order?.numero || ''}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Date de commande</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(order?.created_at || null)}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white mb-4">Produits commandés</h3>
                    <div className="space-y-4">
                      {details.map((detail: any) => {
                        const productImage = detail.produit?.cover 
                          ? getStorageUrl(detail.produit.cover) 
                          : null;
                        return (
                          <div key={detail.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            {productImage && (
                              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                                <Image
                                  src={productImage}
                                  alt={detail.produit?.designation_fr || 'Produit'}
                                  fill
                                  className="object-contain p-1"
                                  sizes="80px"
                                  unoptimized
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white break-words">
                                {detail.produit?.designation_fr || 'Produit'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Quantité: {detail.qte || 0}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-display font-bold tracking-tight tabular-nums text-gray-900 dark:text-white">
                                {(detail.prix_ttc || 0).toFixed(2)} TND
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                                {(detail.prix_unitaire || 0).toFixed(2)} TND / unité
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Sous-total</span>
                      <span className="font-display font-semibold tabular-nums text-gray-900 dark:text-white">{(order?.prix_ht || 0).toFixed(2)} TND</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Expédition</span>
                      <span className={order?.frais_livraison ? 'font-display font-semibold tabular-nums text-gray-900 dark:text-white' : 'text-green-600 dark:text-green-400 font-semibold'}>
                        {order?.frais_livraison ? `${order.frais_livraison} TND` : 'Livraison gratuite'}
                      </span>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex justify-between items-baseline">
                      <span className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">Total</span>
                      <span className="font-display font-bold tracking-tight tabular-nums text-lg text-red-600 dark:text-red-400">
                        {(order?.prix_ttc || 0).toFixed(2)} TND
                      </span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <h3 className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white mb-2">Méthode de paiement</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {paymentMethod === 'cod' ? 'Paiement à la livraison' : 'Carte Bancaire'}
                    </p>
                  </div>

                  {/* Delivery Address (livraison only) */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <h3 className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white mb-2">Adresse de livraison</h3>
                    <div className="text-gray-600 dark:text-gray-400">
                      <p>{(order?.livraison_nom || order?.nom || '')} {(order?.livraison_prenom || order?.prenom || '')}</p>
                      <p>{order?.livraison_adresse1 || order?.adresse1 || ''}</p>
                      <p>{(order?.livraison_ville || order?.ville || '')}, {(order?.livraison_region || order?.region || '')}</p>
                      {(order?.livraison_code_postale || order?.code_postale) && <p>{order?.livraison_code_postale || order?.code_postale || ''}</p>}
                      <p className="mt-2">
                        <strong>Téléphone:</strong> {order?.livraison_phone || order?.phone || ''}
                      </p>
                      <p>
                        <strong>Email:</strong> {order?.livraison_email || order?.email || ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <ScrollToTop />
      </div>
    );
  }

  // While the cart rehydrates from localStorage, show a light placeholder instead of null — otherwise
  // a full cart briefly renders as "empty" and the redirect effect would fire before isLoaded.
  if (!isLoaded) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" role="status" aria-label="Chargement du panier" />
      </div>
    );
  }

  // Don't show checkout form if cart is empty (unless we're on step 3, which is handled above)
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`checkout-viewport-root flex min-h-screen min-h-[100dvh] flex-col bg-canvas ${keyboardOpen ? 'isKeyboardOpen' : ''}`}
      data-keyboard-open={keyboardOpen || undefined}
      style={{ ['--checkout-cta-padding' as string]: keyboardOpen ? '1.25rem' : '6.25rem' }}
    >
      <main className="checkout-main flex-1">
        {/* Checkout is a primary task, so it uses the same 1600px site rail as the catalogue
            rather than the 1280px editorial rail. The form grows; the summary keeps a readable
            fixed range and remains sticky. */}
        <Container width="wide">
          <header className="mb-3 border-b border-rule pb-3 sm:mb-4 sm:pb-4">
            <div className="mb-2 flex items-center justify-between gap-4 sm:mb-3">
              <Button
                variant="ghost"
                onClick={() => currentStep === 2 ? router.push('/cart') : setCurrentStep(2)}
                className="-ms-2 min-h-10 rounded-lg px-2 text-sm font-semibold text-ink-2 hover:bg-sunken hover:text-brand focus-visible:ring-focus"
              >
                <ArrowLeft className="me-2 h-4 w-4" aria-hidden="true" />
                {currentStep === 2 ? 'Retour au panier' : 'Retour'}
              </Button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 lg:hidden">
                Étape 2 sur 3
              </p>
              <nav className="hidden items-center gap-2 text-xs font-semibold lg:flex" aria-label="Progression de la commande">
                <span className="text-ink-3">1&nbsp; Panier</span>
                <span className="h-px w-8 bg-rule" aria-hidden="true" />
                <span className="rounded-full bg-brand px-3 py-1.5 text-on-brand">2&nbsp; Livraison</span>
                <span className="h-px w-8 bg-rule" aria-hidden="true" />
                <span className="text-ink-3">3&nbsp; Confirmation</span>
              </nav>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
              <div>
                <p className="mb-1.5 hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-brand sm:block">Finaliser ma commande</p>
                <h1 className="font-display text-[1.65rem] font-extrabold uppercase leading-none tracking-tight text-ink-1 sm:text-3xl">
                  Livraison &amp; paiement
                </h1>
              </div>
              <p className="hidden max-w-md text-end text-sm leading-snug text-ink-2 sm:block">
                Vérifiez vos coordonnées, puis payez simplement à la réception.
              </p>
            </div>
          </header>

          <div className="checkout-layout">
          {/* Checkout Form */}
          <section className="checkout-form">
            <div>
              <Card className="gap-0 overflow-hidden rounded-2xl border-hairline bg-elevated shadow-card">
                <CardHeader className="hidden border-b border-rule px-4 py-4 sm:block sm:px-5 sm:py-4 lg:px-6">
                  <CardTitle className="flex items-center gap-3 font-display text-lg font-extrabold uppercase tracking-tight text-ink-1 sm:text-xl">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                      <Truck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    Adresse de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-5 lg:p-6">
                  <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Contact */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sunken text-[11px] font-bold tabular-nums text-brand sm:h-7 sm:w-7 sm:text-xs">01</span>
                        <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1 sm:text-lg">Vos coordonnées</h2>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="livraison_nom" className="text-sm font-semibold leading-snug text-ink-1">
                            Nom complet <span className="text-brand">*</span>
                          </Label>
                          <Input
                            id="livraison_nom"
                            value={formData.livraison_nom}
                            onChange={(e) => handleInputChange('livraison_nom', e.target.value)}
                            autoComplete="name"
                            className="h-11 rounded-xl border-hairline bg-canvas text-base text-ink-1 shadow-none transition-colors hover:border-rule-strong focus-visible:border-brand focus-visible:ring-focus focus-visible:ring-offset-0"
                            placeholder="Prénom et nom"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="livraison_phone" className="text-sm font-semibold leading-snug text-ink-1">
                            Téléphone <span className="text-brand">*</span>
                          </Label>
                          <Input
                            id="livraison_phone"
                            type="tel"
                            value={formData.livraison_phone}
                            onChange={(e) => handleInputChange('livraison_phone', e.target.value)}
                            inputMode="tel"
                            autoComplete="tel"
                            className="h-11 rounded-xl border-hairline bg-canvas text-base text-ink-1 shadow-none transition-colors hover:border-rule-strong focus-visible:border-brand focus-visible:ring-focus focus-visible:ring-offset-0"
                            placeholder="+216 XX XXX XXX"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                          <Label htmlFor="livraison_email" className="text-sm font-semibold leading-snug text-ink-1">
                            Email <span className="text-xs font-normal text-ink-3">(optionnel)</span>
                          </Label>
                          <Input
                            id="livraison_email"
                            type="email"
                            value={formData.livraison_email}
                            onChange={(e) => handleInputChange('livraison_email', e.target.value)}
                            autoComplete="email"
                            inputMode="email"
                            className="h-11 rounded-xl border-hairline bg-canvas text-base text-ink-1 shadow-none transition-colors hover:border-rule-strong focus-visible:border-brand focus-visible:ring-focus focus-visible:ring-offset-0"
                            placeholder="Pour recevoir la confirmation par email"
                          />
                      </div>
                      <div className="hidden">
                        <Label htmlFor="pays">Pays</Label>
                        <Input id="pays" value={formData.pays} readOnly className="sr-only" />
                      </div>
                      </div>

                    {/* Adresse */}
                    <div className="space-y-3 border-t border-rule pt-4 sm:pt-5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sunken text-[11px] font-bold tabular-nums text-brand sm:h-7 sm:w-7 sm:text-xs">02</span>
                        <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1 sm:text-lg">Adresse</h2>
                      </div>
                      <AddressSelector
                        gouvernorat={gouvernorat}
                        delegation={delegation}
                        localite={localite}
                        codePostal={codePostal}
                        onGouvernoratChange={handleGouvernoratChange}
                        onDelegationChange={handleDelegationChange}
                        onLocaliteChange={handleLocaliteChange}
                        required
                      />
                      <div className="space-y-1.5">
                        <Label htmlFor="livraison_adresse1" className="text-sm font-semibold leading-snug text-ink-1">
                          Rue et numéro <span className="text-brand">*</span>
                        </Label>
                        <Input
                          id="livraison_adresse1"
                          value={formData.livraison_adresse1}
                          onChange={(e) => handleInputChange('livraison_adresse1', e.target.value)}
                          className="h-11 rounded-xl border-hairline bg-canvas text-base text-ink-1 shadow-none transition-colors hover:border-rule-strong focus-visible:border-brand focus-visible:ring-focus focus-visible:ring-offset-0"
                          placeholder="Rue, numéro, bâtiment..."
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOptionalFields(!showOptionalFields)}
                        className="flex min-h-9 items-center gap-1 rounded-lg text-[13px] font-semibold leading-snug text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        aria-expanded={showOptionalFields}
                      >
                        {showOptionalFields ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                        {showOptionalFields ? 'Masquer les détails optionnels' : 'Ajouter une note de livraison'}
                      </button>
                      {showOptionalFields && (
                        <div className="space-y-1.5">
                            <Label htmlFor="note" className="text-sm font-semibold leading-snug text-ink-1">
                              Note de livraison <span className="text-xs font-normal text-ink-3">(optionnel)</span>
                            </Label>
                            <textarea
                              id="note"
                              value={formData.note}
                              onChange={(e) => handleInputChange('note', e.target.value)}
                              className="min-h-24 w-full resize-none rounded-xl border border-hairline bg-canvas p-3.5 text-base leading-snug text-ink-1 outline-none transition-colors placeholder:text-ink-3 hover:border-rule-strong focus:border-brand focus:ring-2 focus:ring-focus"
                              placeholder="Consignes de livraison, instructions..."
                            />
                        </div>
                      )}
                    </div>

                    {/* Paiement */}
                    <div className="border-t border-rule pt-4 sm:pt-5">
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sunken text-[11px] font-bold tabular-nums text-brand sm:h-7 sm:w-7 sm:text-xs">03</span>
                        <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1 sm:text-lg">Paiement</h2>
                      </div>
                      <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cod' | 'card')}>
                        <div className="space-y-2.5">
                          {/* Paiement à la livraison */}
                          <label
                            htmlFor="cod"
                            className={`flex min-h-[60px] cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors sm:gap-3 sm:p-3.5 ${
                              paymentMethod === 'cod'
                                ? 'border-brand bg-brand-50'
                                : 'border-hairline bg-canvas hover:border-rule-strong'
                            }`}
                          >
                            <RadioGroupItem value="cod" id="cod" className="mt-1 h-5 w-5 shrink-0 border-rule text-brand" />
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-brand">
                                  <Wallet className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="flex-1">
                                  <span className="block font-semibold text-ink-1">
                                    Paiement à la livraison
                                  </span>
                                  <p className="mt-0.5 text-[13px] leading-snug text-ink-2">
                                    <span className="sm:hidden">Payez au livreur à la réception.</span>
                                    <span className="hidden sm:inline">Payez au livreur en espèces ou par chèque, après réception de votre commande.</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </label>

                          {/* Carte Bancaire — bientôt disponible (désactivé) */}
                          <div
                            aria-disabled="true"
                            className="hidden min-h-[58px] cursor-not-allowed items-center gap-3 rounded-xl border border-hairline bg-sunken p-3.5 opacity-60 sm:flex"
                          >
                            <RadioGroupItem value="card" id="card" disabled className="h-5 w-5 shrink-0" />
                            <div className="flex-1 w-full min-w-0">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-ink-3">
                                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className="flex flex-wrap items-center gap-2 font-semibold text-ink-1">
                                    Carte Bancaire
                                    <span className="inline-flex items-center rounded-full border border-hairline bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                                      Bientôt disponible
                                    </span>
                                  </span>
                                  <span className="text-xs leading-snug text-ink-3">Paiement en ligne</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Desktop submit - hidden on mobile (sticky bar CTA on mobile) */}
                    <Button
                      type="submit"
                      size="lg"
                      className="hidden h-12 w-full rounded-xl bg-brand font-display text-sm font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:ring-focus focus-visible:ring-offset-elevated disabled:opacity-50 lg:flex"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5 mr-2" aria-hidden="true" />
                          Passer la commande
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Order Summary */}
          <aside className="checkout-summary hidden lg:block" aria-label="Récapitulatif de la commande">
            <div className="checkout-summary-inner">
              <Card className="gap-0 overflow-hidden rounded-2xl border-hairline bg-elevated shadow-card">
                <CardHeader className="border-b border-rule px-5 py-4">
                  <CardTitle className="flex items-center gap-3 font-display text-xl font-extrabold uppercase tracking-tight text-ink-1">
                    <ShoppingCart className="h-5 w-5 text-brand" aria-hidden="true" />
                    Récapitulatif
                  </CardTitle>
                  <p className="mt-0.5 text-xs leading-snug text-ink-3">
                    {items.length} {items.length === 1 ? 'article' : 'articles'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  {/* Items */}
                  <div className="max-h-72 divide-y divide-hairline overflow-y-auto pe-1">
                    {items.map((item) => {
                      const price = getEffectivePrice(item.product);
                      const productName = (item.product as any).designation_fr || (item.product as any).name;
                      const productImage = (item.product as any).cover 
                        ? getStorageUrl((item.product as any).cover) 
                        : null;
                      return (
                        <div key={item.product.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                          {productImage && (
                            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-hairline bg-sunken">
                              <Image
                                src={productImage}
                                alt={productName}
                                fill
                                className="object-contain p-1"
                                sizes="64px"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-ink-1">
                              {productName}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-ink-3">
                                Qté: {item.quantity}
                              </p>
                              <p className="font-display text-sm font-bold tracking-tight tabular-nums text-brand">
                                {(price * item.quantity).toFixed(2)} DT
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Code promo (summary column) */}
                  <section className="checkout-coupon border-t border-rule pt-4" aria-labelledby="checkout-coupon-title">
                    <h3
                      id="checkout-coupon-title"
                      className="mb-2.5 flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-tight text-ink-1"
                    >
                      <Tag className="h-4 w-4 text-brand" aria-hidden="true" />
                      Code promo
                    </h3>
                    {appliedCoupon ? (
                      <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-sunken p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-ok">
                            {appliedCoupon.code} appliqué
                            {appliedCoupon.discount_ht > 0 && (
                              <span className="ms-1 text-ok">
                                (-{appliedCoupon.discount_ttc.toFixed(2)} DT)
                              </span>
                            )}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11 shrink-0 rounded-lg text-ok hover:bg-elevated focus-visible:ring-focus"
                            onClick={handleRemoveCoupon}
                          >
                            <X className="h-4 w-4 mr-1" aria-hidden="true" /> Retirer
                          </Button>
                        </div>
                        {couponMessage && (
                          <p
                            className={`checkout-coupon-message text-xs ${
                              couponMessageType === 'error'
                                ? 'text-destructive'
                                : 'text-ok'
                            }`}
                          >
                            {couponMessage}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="coupon_code" className="sr-only">
                          Code promo
                        </Label>
                        <div className="checkout-coupon-row">
                          <Input
                            id="coupon_code"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            placeholder="Ex: SOBI10"
                            className="checkout-coupon-input h-11 rounded-xl border-hairline bg-canvas text-ink-1 focus-visible:ring-focus focus-visible:ring-offset-0"
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="checkout-coupon-button min-h-11 rounded-xl border-rule bg-elevated font-semibold text-brand hover:border-brand hover:bg-brand-50 focus-visible:ring-focus"
                            onClick={handleApplyCoupon}
                            disabled={isApplyingCoupon || !couponInput.trim()}
                          >
                            {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
                          </Button>
                        </div>
                        {couponMessage && (
                          <p
                            className={`checkout-coupon-message text-xs ${
                              couponMessageType === 'error'
                                ? 'text-destructive'
                                : 'text-ok'
                            }`}
                          >
                            {couponMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Points de fidélité (utilisateurs connectés avec un solde) */}
                  {isAuthenticated && pointsBalance > 0 && (
                    <section className="border-t border-rule pt-5" aria-labelledby="checkout-points-title">
                      <h3
                        id="checkout-points-title"
                        className="mb-1 flex items-center gap-2 font-display text-base font-extrabold uppercase tracking-tight text-ink-1"
                      >
                        <Gift className="h-4 w-4 text-brand" aria-hidden="true" />
                        Utiliser mes points de fidélité
                      </h3>
                      <p className="mb-3 text-xs text-ink-3">
                        Solde : <span className="font-semibold tabular-nums text-ink-1">{pointsBalance}</span> points
                        {user?.points_value_dt != null && (
                          <> (~{user.points_value_dt.toFixed(2)} DT)</>
                        )}
                        {' '}· 20 points = 1 DT
                      </p>
                      {maxRedeemablePoints > 0 ? (
                        <div className="space-y-3 rounded-xl border border-hairline bg-sunken p-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={maxRedeemablePoints}
                              step={REDEEM_POINTS_PER_DT}
                              value={effectivePointsToRedeem}
                              onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                              className="flex-1 accent-red-600 min-h-[24px] cursor-pointer"
                              aria-label="Points de fidélité à utiliser"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Input
                                type="number"
                                min={0}
                                max={maxRedeemablePoints}
                                value={effectivePointsToRedeem}
                                onChange={(e) => {
                                  const raw = Math.floor(Number(e.target.value) || 0);
                                  setPointsToRedeem(Math.max(0, Math.min(raw, maxRedeemablePoints)));
                                }}
                                className="w-20 h-10 text-center rounded-lg tabular-nums"
                                aria-label="Nombre de points à utiliser"
                              />
                              <span className="text-xs text-ink-3">pts</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-ink-2">
                              Remise fidélité <span className="text-xs text-ink-3">(estimée)</span>
                            </span>
                            <span className="font-display font-semibold tabular-nums text-ok">
                              -{pointsDiscountDt.toFixed(2)} DT
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                              className="min-h-11 rounded text-xs font-semibold text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            >
                              Utiliser le maximum ({maxRedeemablePoints} pts)
                            </button>
                            {effectivePointsToRedeem > 0 && (
                              <button
                                type="button"
                                onClick={() => setPointsToRedeem(0)}
                                className="min-h-11 rounded text-xs font-semibold text-ink-3 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                              >
                                Réinitialiser
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] leading-snug text-ink-3">
                            Les points couvrent au maximum 50% du sous-total. Le décompte final est confirmé par le serveur.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-3">
                          Ajoutez des articles pour pouvoir utiliser vos points sur cette commande.
                        </p>
                      )}
                    </section>
                  )}

                  {/* Summary */}
                  <div className="space-y-2.5 border-t border-rule pt-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Sous-total</span>
                      <span className="font-display font-semibold tabular-nums text-ink-1">{totalPrice.toFixed(2)} DT</span>
                    </div>
                    {appliedCoupon && appliedCoupon.discount_ht > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-ink-2">Remise ({appliedCoupon.code})</span>
                        <span className="font-display font-semibold tabular-nums text-ok">
                          -{appliedCoupon.discount_ttc.toFixed(2)} DT
                        </span>
                      </div>
                    )}
                    {packDiscountAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-ink-2">
                          <Percent className="h-4 w-4 text-brand" aria-hidden="true" />
                          Remise pack{packQuoteData?.tier_label ? ` (${packQuoteData.tier_label})` : ''}
                        </span>
                        <span className="font-display font-semibold tabular-nums text-ok">
                          -{packDiscountAmount.toFixed(2)} DT
                        </span>
                      </div>
                    )}
                    {pointsDiscountDt > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-ink-2">
                          <Gift className="h-4 w-4 text-brand" aria-hidden="true" />
                          Remise fidélité <span className="text-xs text-ink-3">(estimée)</span>
                        </span>
                        <span className="font-display font-semibold tabular-nums text-ok">
                          -{pointsDiscountDt.toFixed(2)} DT
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Expédition</span>
                      <span className={`font-display font-semibold tabular-nums ${(appliedCoupon?.free_shipping ? 0 : shippingCost) === 0 ? 'text-ok' : 'text-ink-1'}`}>
                        {(appliedCoupon?.free_shipping ? 0 : shippingCost) === 0 ? (
                          <span className="flex items-center gap-1">
                            <Truck className="h-4 w-4" aria-hidden="true" />
                            Gratuite
                          </span>
                        ) : (
                          `${appliedCoupon?.free_shipping ? 0 : shippingCost} DT`
                        )}
                      </span>
                    </div>
                    {totalPrice < FREE_SHIPPING_THRESHOLD && shippingCost > 0 && (
                      <div className="flex items-start gap-2 rounded-xl border border-hairline bg-brand-50 p-3">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                        <p className="text-xs font-medium text-ink-2">
                          Ajoutez {(FREE_SHIPPING_THRESHOLD - totalPrice).toFixed(2)} DT pour la livraison gratuite !
                        </p>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between border-t border-rule pt-4">
                      <span className="font-display text-lg font-extrabold uppercase tracking-tight text-ink-1">Total</span>
                      <span className="font-display text-2xl font-extrabold tracking-tight tabular-nums text-brand">
                        {finalTotal.toFixed(2)} DT
                      </span>
                    </div>
                    {(packDiscountAmount > 0 || pointsDiscountDt > 0) && (
                      <p className="text-end text-[11px] leading-snug text-ink-3">
                        Total estimé — le montant définitif est confirmé sur la page de confirmation.
                      </p>
                    )}

                    {/*
                      ── WHAT THIS ORDER PAYS BACK ─────────────────────────────────────────────
                      The block above this one only ever appeared for a signed-in customer who
                      ALREADY had a balance (`isAuthenticated && pointsBalance > 0`). So the two
                      people the programme most needed to reach — a guest, and a new account with
                      zero points — reached the final screen of the funnel without the word
                      "fidélité" on it once.

                      `subtotalAfterPack - pointsDiscountDt` is the backend's earn base to the
                      millime: goods after coupon, after pack, after points spent, delivery
                      excluded. This is the one place in the site where the figure is not an
                      estimate, so it is the one place it is worth showing beside a real total.
                    */}
                    <LoyaltyEarnLine
                      amountDt={Math.max(0, subtotalAfterPack - pointsDiscountDt)}
                      variant="summary"
                      className="pt-1"
                    />
                  </div>

                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
        </Container>
      </main>

      <CheckoutFooterCTA
        keyboardOpen={keyboardOpen}
        isSubmitting={isSubmitting}
        finalTotal={finalTotal}
        totalPrice={totalPrice}
        shippingCost={appliedCoupon?.free_shipping ? 0 : shippingCost}
        items={items}
        getEffectivePrice={getEffectivePrice}
        mobileSummaryOpen={mobileSummaryOpen}
        onMobileSummaryOpenChange={setMobileSummaryOpen}
        onSubmit={() => (document.getElementById('checkout-form') as HTMLFormElement | null)?.requestSubmit()}
      />

      <ScrollToTop />
    </div>
  );
}
