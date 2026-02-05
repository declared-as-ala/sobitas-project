'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { createOrder, getStorageUrl, getOrderDetails } from '@/services/api';
import type { OrderRequest, Order } from '@/types';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft, ShoppingCart, Shield, Truck, CheckCircle2, Loader2, CreditCard, Wallet, Printer, List, ArrowRight, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { AddressSelector } from '@/app/components/AddressSelector';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { ChevronDown, ChevronUp, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

const FREE_SHIPPING_THRESHOLD = 300;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, getEffectivePrice, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [orderData, setOrderData] = useState<{ order: Order; orderDetails: any[] } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  
  // Single address (livraison) selector state
  const [gouvernorat, setGouvernorat] = useState('');
  const [delegation, setDelegation] = useState('');
  const [localite, setLocalite] = useState('');
  const [codePostal, setCodePostal] = useState('');

  // Form state: one address (adresse de livraison) only
  const [formData, setFormData] = useState({
    livraison_nom: user?.name?.split(' ')[0] || '',
    livraison_prenom: user?.name?.split(' ').slice(1).join(' ') || '',
    livraison_email: user?.email || '',
    livraison_phone: '',
    phone2: '',
    pays: 'Tunisie',
    livraison_region: '',
    livraison_ville: '',
    livraison_code_postale: '',
    livraison_adresse1: '',
    livraison_adresse2: '',
    note: '',
    livraison: 1,
  });

  useEffect(() => {
    // Don't redirect if order is being completed or already completed, or if we're on step 3
    if (isOrderComplete || isSubmitting || currentStep === 3) {
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
  }, [items, router, isOrderComplete, isSubmitting, currentStep]);

  // Sync formData when address selector values change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      livraison_region: gouvernorat,
      livraison_ville: localite || delegation,
      livraison_code_postale: codePostal,
    }));
  }, [gouvernorat, delegation, localite, codePostal]);

  // Memoize price calculations to avoid recalculating on every render
  const totalPrice = useMemo(() => getTotalPrice(), [items, getTotalPrice]);
  const shippingCost = useMemo(() => 
    totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : 10, 
    [totalPrice]
  );
  const finalTotal = useMemo(() => totalPrice + shippingCost, [totalPrice, shippingCost]);

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

  const validateForm = () => {
    const required = ['livraison_nom', 'livraison_prenom', 'livraison_email', 'livraison_phone', 'livraison_adresse1'];
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return false;
      }
    }
    if (!gouvernorat || !delegation || !localite) {
      toast.error('Veuillez sélectionner le gouvernorat, la délégation et la localité');
      return false;
    }
    if (!formData.livraison_email.includes('@')) {
      toast.error('Email invalide');
      return false;
    }
    const phoneDigits = formData.livraison_phone.replace(/\s/g, '');
    if (phoneDigits.length < 8) {
      toast.error('Numéro de téléphone invalide (minimum 8 chiffres)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if card payment is selected
    if (paymentMethod === 'card') {
      setShowCardPaymentModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Send only livraison (shipping/delivery) data - no billing information
      const orderPayload: OrderRequest = {
        commande: {
          // Only shipping/livraison fields - no billing data
          livraison_nom: formData.livraison_nom,
          livraison_prenom: formData.livraison_prenom,
          livraison_email: formData.livraison_email,
          livraison_phone: formData.livraison_phone,
          livraison_region: formData.livraison_region,
          livraison_ville: formData.livraison_ville,
          livraison_code_postale: formData.livraison_code_postale || null,
          livraison_adresse1: formData.livraison_adresse1,
          livraison_adresse2: formData.livraison_adresse2 || undefined,
          note: formData.note || undefined,
          livraison: formData.livraison,
          frais_livraison: shippingCost,
          user_id: user?.id,
        },
        panier: items.map(item => ({
          produit_id: item.product.id,
          quantite: item.quantity,
          prix_unitaire: getEffectivePrice(item.product),
        })),
      };

      const response = await createOrder(orderPayload);
      
      // Get order ID from response (could be response.id or response.commande.id)
      const orderId = response.id || (response as any).commande?.id || (response as any).data?.id;
      
      if (!orderId) {
        console.error('Order ID not found in response:', response);
        throw new Error('Erreur: ID de commande introuvable dans la réponse');
      }
      
      // Set flag to prevent cart redirect BEFORE clearing cart
      setIsOrderComplete(true);
      
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
            adresse2: formData.livraison_adresse2,
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
      toast.error(error.response?.data?.message || 'Erreur lors de la commande. Veuillez réessayer.');
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

  const handlePrint = () => {
    if (!printRef.current || !orderData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour imprimer');
      return;
    }

    const logoUrl = getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp');
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
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #dc2626; }
            .logo { height: 60px; width: auto; }
            .order-number { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 5px; }
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
            <h1>✓ Commande confirmée</h1>
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

    return (
      <div className="min-h-screen bg-[#F7F7F8] dark:bg-gray-950">
        <Header />
        
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            {/* Success Message */}
            <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Commande confirmée !
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    Merci pour votre commande #{order?.numero || ''}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Un email de confirmation a été envoyé à {order?.livraison_email || order?.email || user?.email}
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
                className="min-h-[48px]"
              >
                <Printer className="h-5 w-5 mr-2" />
                Imprimer
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white min-h-[48px]"
              >
                <Link href="/account/orders">
                  <List className="h-5 w-5 mr-2" />
                  Voir toutes mes commandes
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-h-[48px]"
              >
                <Link href="/shop">
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Continuer les achats
                </Link>
              </Button>
            </div>

            {/* Order Recap */}
            <div ref={printRef}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
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
                    <h3 className="text-lg font-semibold mb-4">Produits commandés</h3>
                    <div className="space-y-4">
                      {details.map((detail: any) => {
                        const productImage = detail.produit?.cover 
                          ? getStorageUrl(detail.produit.cover) 
                          : null;
                        return (
                          <div key={detail.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            {productImage && (
                              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                                <Image
                                  src={productImage}
                                  alt={detail.produit?.designation_fr || 'Produit'}
                                  fill
                                  className="object-contain p-1"
                                  sizes="80px"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {detail.produit?.designation_fr || 'Produit'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Quantité: {detail.qte || 0}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {(detail.prix_ttc || 0).toFixed(2)} TND
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {(detail.prix_unitaire || 0).toFixed(2)} TND / unité
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Sous-total</span>
                      <span className="font-semibold">{(order?.prix_ht || 0).toFixed(2)} TND</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expédition</span>
                      <span className={order?.frais_livraison ? 'font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
                        {order?.frais_livraison ? `${order.frais_livraison} TND` : 'Livraison gratuite'}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-red-600 dark:text-red-400">
                        {(order?.prix_ttc || 0).toFixed(2)} TND
                      </span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2">Méthode de paiement</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {paymentMethod === 'cod' ? 'Paiement à la livraison' : 'Carte Bancaire'}
                    </p>
                  </div>

                  {/* Delivery Address (livraison only) */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2">Adresse de livraison</h3>
                    <div className="text-gray-600 dark:text-gray-400">
                      <p>{(order?.livraison_nom || order?.nom || '')} {(order?.livraison_prenom || order?.prenom || '')}</p>
                      <p>{order?.livraison_adresse1 || order?.adresse1 || ''}</p>
                      {(order?.livraison_adresse2 || order?.adresse2) && <p>{order?.livraison_adresse2 || order?.adresse2}</p>}
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

            {/* Back Button */}
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'étape précédente
              </Button>
            </div>
          </motion.div>
        </main>

        <Footer />
        <ScrollToTop />
      </div>
    );
  }

  // Don't show checkout form if cart is empty (unless we're on step 3, which is handled above)
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] dark:bg-gray-950">
      <Header />
      
      <main className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12 pb-28 lg:pb-12">
        {/* Progress: mobile = Étape 2/3, desktop = full stepper */}
        <div className="mb-6 lg:mb-8">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 lg:hidden mb-4">
            Étape 2 sur 3 — Livraison & Paiement
          </p>
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-sm font-semibold">1</div>
              <span className="text-sm font-medium text-gray-500">Panier</span>
            </div>
            <div className="flex-1 h-0.5 bg-red-600 mx-2 max-w-[80px]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-semibold">2</div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Livraison & Paiement</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 dark:bg-gray-700 mx-2 max-w-[80px]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-sm font-semibold">3</div>
              <span className="text-sm font-medium text-gray-500">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => currentStep === 2 ? router.push('/cart') : setCurrentStep(2)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 2 ? 'Retour au panier' : 'Retour'}
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Checkout Form - single column on mobile */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Card className="bg-white dark:bg-gray-900 border-0 shadow-[0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
                  <CardTitle className="text-[clamp(1rem,2.5vw,1.125rem)] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="h-5 w-5 text-red-600" aria-hidden="true" />
                    Adresse de livraison
                  </CardTitle>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                    Remplissez les champs pour finaliser votre commande
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                    {/* Contact */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Contact</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="livraison_nom" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                            Nom <span className="text-red-600">*</span>
                          </Label>
                          <Input
                            id="livraison_nom"
                            value={formData.livraison_nom}
                            onChange={(e) => handleInputChange('livraison_nom', e.target.value)}
                            className="min-h-[48px] sm:min-h-[52px] text-[15px] border border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all duration-200"
                            placeholder="Votre nom"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="livraison_prenom" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                            Prénom <span className="text-red-600">*</span>
                          </Label>
                          <Input
                            id="livraison_prenom"
                            value={formData.livraison_prenom}
                            onChange={(e) => handleInputChange('livraison_prenom', e.target.value)}
                            className="min-h-[48px] sm:min-h-[52px] text-[15px] border border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all duration-200"
                            placeholder="Votre prénom"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="livraison_email" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                            Email <span className="text-red-600">*</span>
                          </Label>
                          <Input
                            id="livraison_email"
                            type="email"
                            value={formData.livraison_email}
                            onChange={(e) => handleInputChange('livraison_email', e.target.value)}
                            autoComplete="email"
                            inputMode="email"
                            className="min-h-[48px] sm:min-h-[52px] text-[15px] border border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all duration-200"
                            placeholder="votre@email.com"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="livraison_phone" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                            Téléphone <span className="text-red-600">*</span>
                          </Label>
                          <Input
                            id="livraison_phone"
                            type="tel"
                            value={formData.livraison_phone}
                            onChange={(e) => handleInputChange('livraison_phone', e.target.value)}
                            inputMode="tel"
                            autoComplete="tel"
                            className="min-h-[48px] sm:min-h-[52px] text-[15px] border border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all duration-200"
                            placeholder="+216 XX XXX XXX"
                            required
                          />
                        </div>
                      </div>
                      {showOptionalFields && (
                        <div className="space-y-1.5">
                          <Label htmlFor="phone2" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                            Téléphone 2 <span className="text-gray-400 text-xs">(optionnel)</span>
                          </Label>
                          <Input
                            id="phone2"
                            type="tel"
                            inputMode="tel"
                            value={formData.phone2}
                            onChange={(e) => handleInputChange('phone2', e.target.value)}
                            className="min-h-[48px] text-[15px] border border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all duration-200"
                            placeholder="+216 XX XXX XXX"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowOptionalFields(!showOptionalFields)}
                        className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                      >
                        {showOptionalFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {showOptionalFields ? 'Masquer les détails optionnels' : '+ Ajouter plus de détails'}
                      </button>
                      <div className="hidden">
                        <Label htmlFor="pays">Pays</Label>
                        <Input id="pays" value={formData.pays} readOnly className="sr-only" />
                      </div>
                      </div>

                    {/* Adresse */}
                    <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Adresse</h3>
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
                        <Label htmlFor="livraison_adresse1" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                          Adresse ligne 1 <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="livraison_adresse1"
                          value={formData.livraison_adresse1}
                          onChange={(e) => handleInputChange('livraison_adresse1', e.target.value)}
                          className="min-h-[48px] sm:min-h-[52px] text-[15px] border border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all duration-200"
                          placeholder="Rue, numéro, bâtiment..."
                          required
                        />
                      </div>
                      {showOptionalFields && (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="livraison_adresse2" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                              Adresse ligne 2 <span className="text-gray-400 text-xs">(optionnel)</span>
                            </Label>
                            <Input
                              id="livraison_adresse2"
                              value={formData.livraison_adresse2}
                              onChange={(e) => handleInputChange('livraison_adresse2', e.target.value)}
                              className="min-h-[48px] text-[15px] border border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all duration-200"
                              placeholder="Appartement, étage, etc."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="note" className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                              Notes de commande <span className="text-gray-400 text-xs">(optionnel)</span>
                            </Label>
                            <textarea
                              id="note"
                              value={formData.note}
                              onChange={(e) => handleInputChange('note', e.target.value)}
                              className="w-full min-h-[100px] p-4 text-[15px] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
                              placeholder="Consignes de livraison, instructions..."
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Paiement */}
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Paiement</h3>
                      <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cod' | 'card')}>
                        <div className="space-y-3">
                          {/* Paiement à la livraison */}
                          <label
                            htmlFor="cod"
                            className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer min-h-[52px] ${
                              paymentMethod === 'cod'
                                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 shadow-[0_4px_16px_rgba(0,0,0,0.05)]'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                            }`}
                          >
                            <RadioGroupItem value="cod" id="cod" className="mt-1.5 h-5 w-5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${
                                  paymentMethod === 'cod'
                                    ? 'bg-orange-100 dark:bg-orange-900/30'
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                  <Wallet className={`h-5 w-5 ${
                                    paymentMethod === 'cod'
                                      ? 'text-orange-600 dark:text-orange-400'
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <span className="font-semibold text-gray-900 dark:text-white block">
                                    Paiement à la livraison
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Espèces ou chèque
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
                                Payez directement au livreur lors de la réception de votre commande.
                              </p>
                            </div>
                          </label>

                          {/* Carte Bancaire */}
                          <label
                            htmlFor="card"
                            className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer min-h-[52px] ${
                              paymentMethod === 'card'
                                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 shadow-[0_4px_16px_rgba(0,0,0,0.05)]'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                            }`}
                          >
                            <RadioGroupItem value="card" id="card" className="mt-1.5 h-5 w-5 shrink-0" />
                            <div className="flex-1 w-full min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-xl shrink-0 ${
                                  paymentMethod === 'card'
                                    ? 'bg-blue-100 dark:bg-blue-900/30'
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                  <CreditCard className={`h-5 w-5 ${
                                    paymentMethod === 'card'
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-gray-900 dark:text-white block">
                                    Carte Bancaire
                                  </span>
                                  <span className="text-[13px] text-gray-500 dark:text-gray-400">
                                    Paiement sécurisé SSL
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-start gap-2 mt-2 overflow-x-auto">
                                <Image
                                  src="/payment card.png"
                                  alt="Cartes acceptées"
                                  width={200}
                                  height={40}
                                  className="h-8 w-auto object-contain"
                                  priority={false}
                                />
                              </div>

                              {/* Free shipping message */}
                              {shippingCost > 0 && totalPrice < FREE_SHIPPING_THRESHOLD && (
                                <div className="mt-2 flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-900">
                                  <Truck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-green-800 dark:text-green-200">Livraison gratuite disponible</p>
                                    <p className="text-xs text-green-700 dark:text-green-300">Ajoutez {(FREE_SHIPPING_THRESHOLD - totalPrice).toFixed(0)} DT pour la livraison gratuite</p>
                                  </div>
                                </div>
                              )}
                              {shippingCost === 0 && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                  <Truck className="h-4 w-4 shrink-0" />
                                  <span className="font-medium">Livraison gratuite incluse</span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Desktop submit - hidden on mobile (sticky bar CTA on mobile) */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full hidden lg:flex min-h-[52px] text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.3)] transition-all duration-200 disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5 mr-2" />
                          Passer la commande
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Order Summary - desktop only; mobile uses sticky bar + sheet */}
          <div className="hidden lg:block lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="sticky top-4">
              <Card className="bg-white dark:bg-gray-900 border-0 shadow-[0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-white">
                    <ShoppingCart className="h-5 w-5 text-red-600" aria-hidden="true" />
                    Récapitulatif
                  </CardTitle>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                    {items.length} {items.length === 1 ? 'article' : 'articles'}
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Items */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                    {items.map((item) => {
                      const price = getEffectivePrice(item.product);
                      const productName = (item.product as any).designation_fr || (item.product as any).name;
                      const productImage = (item.product as any).cover 
                        ? getStorageUrl((item.product as any).cover) 
                        : null;
                      return (
                        <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                          {productImage && (
                            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600">
                              <Image
                                src={productImage}
                                alt={productName}
                                fill
                                className="object-contain p-1"
                                sizes="64px"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                              {productName}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Qté: {item.quantity}
                              </p>
                              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                                {(price * item.quantity).toFixed(0)} DT
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{totalPrice.toFixed(0)} DT</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Expédition</span>
                      <span className={`font-semibold ${shippingCost === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                        {shippingCost === 0 ? (
                          <span className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            Gratuite
                          </span>
                        ) : (
                          `${shippingCost} DT`
                        )}
                      </span>
                    </div>
                    {totalPrice < FREE_SHIPPING_THRESHOLD && shippingCost > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <p className="text-xs font-medium text-green-800 dark:text-green-200">
                          💡 Ajoutez {(FREE_SHIPPING_THRESHOLD - totalPrice).toFixed(0)} DT pour la livraison gratuite !
                        </p>
                      </div>
                    )}
                    <div className="border-t border-gray-300 dark:border-gray-700 pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {finalTotal.toFixed(0)} DT
                      </span>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Paiement sécurisé</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Vos données sont protégées</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Livraison rapide</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">3-4 jours ouvrés</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Garantie qualité</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Produits certifiés</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Mobile: sticky bottom bar (Total + CTA) + summary in sheet */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-area-pb">
          <div className="max-w-[1160px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{finalTotal.toFixed(0)} DT</p>
              </div>
              <Sheet open={mobileSummaryOpen} onOpenChange={setMobileSummaryOpen}>
                <SheetTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="text-[13px] shrink-0 min-h-[44px]">
                    Voir le récapitulatif
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900">
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
              onClick={() => (document.getElementById('checkout-form') as HTMLFormElement | null)?.requestSubmit()}
              disabled={isSubmitting}
              className="w-full min-h-[52px] text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-[0_4px_16px_rgba(220,38,38,0.25)] transition-all duration-200 disabled:opacity-50"
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
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 text-center flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Paiement sécurisé</span>
              <span>·</span>
              <span><Truck className="h-3 w-3 inline mr-0.5" /> Livraison</span>
              <span>·</span>
              <a href="tel:+21627612500" className="inline-flex items-center gap-1 hover:text-red-600">
                <Phone className="h-3 w-3" /> 27 612 500
              </a>
              <span>·</span>
              <a href="https://wa.me/21627612500" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-green-600">
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />

      {/* Card Payment Modal */}
      <Dialog open={showCardPaymentModal} onOpenChange={setShowCardPaymentModal}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              Paiement par carte
            </DialogTitle>
            <DialogDescription className="text-base text-gray-700 dark:text-gray-300 leading-relaxed pt-2">
              Cette méthode de paiement n'est pas encore intégrée. Nous travaillons actuellement sur son implémentation et elle sera bientôt disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                En attendant, vous pouvez utiliser le <strong className="font-semibold text-gray-900 dark:text-white">paiement à la livraison</strong> pour finaliser votre commande.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:flex-col gap-2">
            <Button
              onClick={() => {
                setShowCardPaymentModal(false);
                setPaymentMethod('cod');
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-base rounded-xl shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              Utiliser le paiement à la livraison
            </Button>
            <Button
              onClick={() => setShowCardPaymentModal(false)}
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
