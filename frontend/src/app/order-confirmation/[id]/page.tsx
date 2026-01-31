'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CheckCircle2, Package, Truck, Home, FileText, Download, Printer, Mail, Calendar, CreditCard, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { getOrderDetails, getStorageUrl } from '@/services/api';
import type { Order } from '@/types';
import { toast } from 'sonner';

interface OrderDetail {
  id: number;
  produit_id: number;
  qte: number;
  prix_unitaire: number;
  prix_ht: number;
  prix_ttc: number;
  produit?: {
    id: number;
    designation_fr: string;
    cover?: string;
    slug?: string;
  };
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderDetails(Number(orderId));
        setOrder(data.facture);
        setOrderDetails(data.details_facture || []);
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Erreur lors du chargement de la commande');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPaymentMethod = (method: string) => {
    if (method === 'cod') return 'Paiement à la livraison';
    if (method === 'card') return 'Carte Bancaire';
    return method;
  };

  const handlePrintPDF = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour imprimer');
      return;
    }

    const logoUrl = getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Commande #${order?.numero || orderId}</title>
          <style>
            @media print {
              @page {
                margin: 20mm;
                size: A4;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                color: #000;
                background: #fff;
              }
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #1f2937;
              background: #fff;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #dc2626;
            }
            .logo {
              height: 60px;
              width: auto;
            }
            .order-info {
              text-align: right;
            }
            .order-number {
              font-size: 24px;
              font-weight: bold;
              color: #dc2626;
              margin-bottom: 5px;
            }
            .order-date {
              color: #6b7280;
              font-size: 14px;
            }
            .confirmation-message {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: #f0fdf4;
              border: 2px solid #22c55e;
              border-radius: 8px;
            }
            .confirmation-message h1 {
              color: #16a34a;
              font-size: 28px;
              margin: 10px 0;
            }
            .section {
              margin: 30px 0;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 20px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background: #f9fafb;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              border-bottom: 2px solid #e5e7eb;
              color: #111827;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .product-name {
              font-weight: 500;
              color: #111827;
            }
            .product-qty {
              color: #6b7280;
              font-size: 14px;
            }
            .text-right {
              text-align: right;
            }
            .text-bold {
              font-weight: 600;
            }
            .summary {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            .summary-total {
              font-size: 20px;
              font-weight: bold;
              color: #dc2626;
              padding-top: 10px;
              border-top: 2px solid #e5e7eb;
            }
            .address-box {
              background: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              margin: 10px 0;
            }
            .address-title {
              font-weight: 600;
              margin-bottom: 10px;
              color: #111827;
            }
            .address-content {
              color: #4b5563;
              line-height: 1.8;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Logo" class="logo" />
            <div class="order-info">
              <div class="order-number">Commande #${order?.numero || orderId}</div>
              <div class="order-date">${formatDate(order?.created_at || null)}</div>
            </div>
          </div>

          <div class="confirmation-message">
            <h1>✓ Merci. Votre commande a été reçue.</h1>
            <p style="color: #16a34a; margin: 5px 0;">Votre commande a été enregistrée avec succès.</p>
          </div>

          <div class="section">
            <div class="section-title">Détails de la commande</div>
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderDetails.map(detail => {
                  const productName = detail.produit?.designation_fr || `Produit #${detail.produit_id}`;
                  const total = (detail.prix_ttc || detail.prix_ht || 0).toFixed(2);
                  return `
                    <tr>
                      <td>
                        <div class="product-name">${productName}</div>
                        <div class="product-qty">Quantité: ${detail.qte}</div>
                      </td>
                      <td class="text-right text-bold">${total} TND</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="summary">
              <div class="summary-row">
                <span>Sous-total:</span>
                <span class="text-bold">${(order?.prix_ht || 0).toFixed(2)} TND</span>
              </div>
              ${order?.frais_livraison ? `
                <div class="summary-row">
                  <span>Expédition:</span>
                  <span class="text-bold">${order.frais_livraison} TND</span>
                </div>
              ` : `
                <div class="summary-row">
                  <span>Expédition:</span>
                  <span class="text-bold" style="color: #16a34a;">Livraison gratuite</span>
                </div>
              `}
              <div class="summary-row summary-total">
                <span>Total:</span>
                <span>${(order?.prix_ttc || 0).toFixed(2)} TND</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Informations de paiement</div>
            <div class="address-box">
              <div style="margin-bottom: 10px;">
                <strong>Moyen de paiement:</strong> ${order?.livraison === 1 ? 'Paiement à la livraison' : 'Carte Bancaire'}
              </div>
              ${order?.livraison === 1 ? '<p style="color: #6b7280; margin: 5px 0;">Payez en argent comptant à la livraison.</p>' : ''}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
            <div class="section">
              <div class="section-title">Adresse de facturation</div>
              <div class="address-box">
                <div class="address-content">
                  <strong>${order?.nom || ''} ${order?.prenom || ''}</strong><br/>
                  ${order?.adresse1 || ''}<br/>
                  ${order?.adresse2 ? order.adresse2 + '<br/>' : ''}
                  ${order?.ville || ''}, ${order?.region || ''}<br/>
                  ${order?.code_postale || ''}<br/>
                  ${order?.pays || 'Tunisie'}<br/>
                  <br/>
                  <strong>Téléphone:</strong> ${order?.phone || ''}<br/>
                  <strong>Email:</strong> ${order?.email || ''}
                </div>
              </div>
            </div>

            ${order?.livraison === 1 ? `
              <div class="section">
                <div class="section-title">Adresse de livraison</div>
                <div class="address-box">
                  <div class="address-content">
                    <strong>${order?.livraison_nom || ''} ${order?.livraison_prenom || ''}</strong><br/>
                    ${order?.livraison_adresse1 || ''}<br/>
                    ${order?.livraison_adresse2 ? order.livraison_adresse2 + '<br/>' : ''}
                    ${order?.livraison_ville || ''}, ${order?.livraison_region || ''}<br/>
                    ${order?.livraison_code_postale || ''}<br/>
                    ${order?.pays || 'Tunisie'}<br/>
                    <br/>
                    <strong>Téléphone:</strong> ${order?.livraison_phone || ''}<br/>
                    <strong>Email:</strong> ${order?.livraison_email || ''}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>Merci pour votre confiance !</p>
            <p>Pour toute question, contactez-nous à ${order?.email || 'contact@sobitas.tn'}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Commande introuvable</h1>
          <Button asChild>
            <Link href="/shop">Retour à la boutique</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const subtotal = order.prix_ht || 0;
  const shipping = order.frais_livraison || 0;
  const total = order.prix_ttc || subtotal + shipping;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Print Section - Hidden on screen, visible in print */}
        <div ref={printRef} className="hidden print:block">
          {/* This will be used for PDF generation */}
        </div>

        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-6"
          >
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Merci. Votre commande a été reçue.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Nous avons bien reçu votre commande et vous en remercions.
          </p>
        </motion.div>

        {/* Order Summary Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl mb-2">Résumé de la commande</CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span><strong>Numéro:</strong> {order.numero || `#${orderId}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span><strong>Date:</strong> {formatDate(order.created_at || null)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span><strong>Email:</strong> {order.email || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {total.toFixed(2)} TND
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {order.livraison === 1 ? (
                    <span className="flex items-center gap-1 justify-end mt-1">
                      <Wallet className="h-4 w-4" />
                      Paiement à la livraison
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 justify-end mt-1">
                      <CreditCard className="h-4 w-4" />
                      Carte Bancaire
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {order.livraison === 1 && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Paiement à la livraison:</strong> Payez en argent comptant à la livraison.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Order Items - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Détails de la commande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderDetails.map((detail) => {
                  const productName = detail.produit?.designation_fr || `Produit #${detail.produit_id}`;
                  const productImage = detail.produit?.cover 
                    ? getStorageUrl(detail.produit.cover) 
                    : null;
                  const itemTotal = (detail.prix_ttc || detail.prix_ht || 0);
                  
                  return (
                    <div key={detail.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {productImage && (
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                          <Image
                            src={productImage}
                            alt={productName}
                            fill
                            className="object-contain p-2"
                            sizes="80px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {productName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Quantité: {detail.qte} × {detail.prix_unitaire.toFixed(2)} TND
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {itemTotal.toFixed(2)} TND
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Sous-total</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} TND</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Expédition</span>
                  <span className={shipping === 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'font-semibold'}>
                    {shipping === 0 ? 'Livraison gratuite' : `${shipping} TND`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span>Total</span>
                  <span className="text-red-600 dark:text-red-400">
                    {total.toFixed(2)} TND
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses - Takes 1 column */}
          <div className="space-y-6">
            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adresse de facturation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {order.nom} {order.prenom}
                  </p>
                  <p>{order.adresse1}</p>
                  {order.adresse2 && <p>{order.adresse2}</p>}
                  <p>{order.ville}, {order.region}</p>
                  <p>{order.code_postale}</p>
                  <p>{order.pays || 'Tunisie'}</p>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p><strong>Téléphone:</strong> {order.phone}</p>
                    <p><strong>Email:</strong> {order.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.livraison === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Adresse de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.livraison_nom} {order.livraison_prenom}
                    </p>
                    <p>{order.livraison_adresse1}</p>
                    {order.livraison_adresse2 && <p>{order.livraison_adresse2}</p>}
                    <p>{order.livraison_ville}, {order.livraison_region}</p>
                    <p>{order.livraison_code_postale}</p>
                    <p>{order.pays || 'Tunisie'}</p>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p><strong>Téléphone:</strong> {order.livraison_phone}</p>
                      <p><strong>Email:</strong> {order.livraison_email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            size="lg"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePrintPDF}
          >
            <Printer className="h-5 w-5 mr-2" />
            Imprimer / PDF
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            asChild
          >
            <Link href="/account/orders">
              <FileText className="h-5 w-5 mr-2" />
              Voir mes commandes
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            asChild
          >
            <Link href="/shop">
              <Home className="h-5 w-5 mr-2" />
              Continuer les achats
            </Link>
          </Button>
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Prochaines étapes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Confirmation par email</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vous recevrez un email de confirmation avec les détails de votre commande.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Traitement de la commande</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nous préparons votre commande et vous tiendrons informé de son statut.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">3</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Livraison</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Votre commande sera livrée dans les 2-3 jours ouvrables.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
