'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CheckCircle2, Package, Truck, Home, FileText, Printer, Calendar, Wallet } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getOrderDetails, getStorageUrl, getSiteLogoUrlResolved } from '@/services/api';
import type { Order } from '@/types';
import { notify as toast } from '@/lib/notify';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.id as string;
  const token = searchParams.get('token');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const options = token ? { token } : undefined;
        const data = await getOrderDetails(Number(orderId), options);
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
  }, [orderId, token]);

  /*
   * ── THE GA4 `purchase` EVENT ────────────────────────────────────────────────────────────
   * Until this existed, GA4 reported e-commerce revenue of 0.000 DT for the whole site. Not a
   * misconfiguration on the reporting side: NO purchase event was ever sent from anywhere in
   * `src/`. Every SEO, design and merchandising decision was therefore unmeasurable — we could see
   * sessions arriving and never learn which ones paid.
   *
   * This is the completion point: the customer only reaches /order-confirmation/{id} once the
   * order exists in the database.
   *
   * ── FIRING EXACTLY ONCE, WHICH IS THE WHOLE DIFFICULTY ─────────────────────────────────
   * Two separate hazards, so two separate guards:
   *
   *   `sentRef` covers the render pass. React StrictMode invokes effects twice in development,
   *   and `order` is a new object identity on every fetch, so a bare effect double-counts.
   *
   *   `localStorage` covers the RELOAD, which is the one that corrupts real revenue. This URL is
   *   emailed to the customer and printed from — a refresh, a back-button, or opening the link a
   *   week later would each post another full-value purchase against the same order. sessionStorage
   *   would miss the new-tab and next-day cases, so the key is durable and namespaced by
   *   transaction id. Wrapped in try/catch because Safari private mode throws on write, and a
   *   storage failure must not take down the confirmation page — the worst case is a duplicate
   *   event, which GA4 also de-duplicates on `transaction_id`.
   *
   * ── WHY dataLayer AND NOT `window.gtag` ────────────────────────────────────────────────
   * layout.tsx loads BOTH gtag.js and its init snippet with `strategy="lazyOnload"`, so at the
   * moment this order resolves `window.gtag` may genuinely not exist yet and the event would be
   * dropped silently. Pushing onto `dataLayer` is exactly what the official snippet's `gtag()` does,
   * and gtag.js drains anything already queued when it finally loads. The non-arrow function is
   * deliberate: `arguments` is the shape Google's own snippet pushes.
   *
   * ── THE MONEY FIELDS ───────────────────────────────────────────────────────────────────
   * `value` is `prix_ttc`, which line 381 already treats as the grand total the customer pays
   * (`order.prix_ttc || subtotal + shipping`) and which the printed receipt prints as "Total:".
   * Taking `prix_ht` instead would under-report every order by the shipping fee.
   *
   * `transaction_id` prefers `numero`, the human-facing order number, so a figure in GA4 can be
   * reconciled against an invoice in Filament without a lookup.
   */
  const purchaseSentRef = useRef(false);

  useEffect(() => {
    if (!order || purchaseSentRef.current) return;

    const transactionId = String(order.numero || order.id);
    const storageKey = `ga4_purchase_${transactionId}`;

    try {
      if (window.localStorage.getItem(storageKey)) return;
      window.localStorage.setItem(storageKey, '1');
    } catch {
      /* private mode — fall through and accept a possible duplicate over a lost sale */
    }

    purchaseSentRef.current = true;

    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    // Rest params give TypeScript the call signature; the body still pushes the real `arguments`
    // object, which is the exact shape Google's own gtag() snippet enqueues.
    function gtag(..._args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    }

    gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: Number(order.prix_ttc) || 0,
      currency: 'TND',
      shipping: Number(order.frais_livraison) || 0,
      items: orderDetails.map((detail) => ({
        item_id: String(detail.produit?.id ?? detail.produit_id),
        item_name: detail.produit?.designation_fr ?? `Produit ${detail.produit_id}`,
        price: Number(detail.prix_unitaire) || 0,
        quantity: Number(detail.qte) || 0,
      })),
    });
  }, [order, orderDetails]);

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

  const handlePrintPDF = async () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour imprimer');
      return;
    }

    const logoUrl = await getSiteLogoUrlResolved();
    
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
              border-bottom: 3px solid #DA3E06;
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
              color: #DA3E06;
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
              color: #DA3E06;
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
            <h1><svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:8px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Merci. Votre commande a été reçue.</h1>
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
            <p>Pour toute question, contactez-nous à ${order?.email || 'contact@protein.tn'}</p>
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
    return <LoadingSpinner fullScreen message="Chargement de la commande..." />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="font-display uppercase tracking-tight text-2xl text-gray-900 dark:text-white mb-4">Commande introuvable</h1>
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide rounded-xl">
            <Link href="/shop">Retour à la boutique</Link>
          </Button>
        </main>
      </div>
    );
  }

  const subtotal = order.prix_ht || 0;
  const shipping = order.frais_livraison || 0;
  const total = order.prix_ttc || subtotal + shipping;
  const explicitDiscount = Number(order.discount_ttc || order.discount_ht || order.remise || 0);
  const discount = explicitDiscount > 0 ? explicitDiscount : Math.max(0, subtotal + shipping - total);
  const customerName = [order.livraison_nom || order.nom, order.livraison_prenom || order.prenom].filter(Boolean).join(' ');
  const customerEmail = order.livraison_email || order.email;
  const customerPhone = order.livraison_phone || order.phone;
  const address = order.livraison_adresse1 || order.adresse1;
  const city = [order.livraison_ville || order.ville, order.livraison_region || order.region].filter(Boolean).join(', ');
  const postalCode = order.livraison_code_postale || order.code_postale;
  const paymentLabel = formatPaymentMethod(order.payment_method || (order.livraison === 1 ? 'cod' : 'card'));

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-gray-950">
      <main className="mx-auto max-w-[1040px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Print Section - Hidden on screen, visible in print */}
        <div ref={printRef} className="hidden print:block">
          {/* This will be used for PDF generation */}
        </div>

        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-gray-900">
          <div className="flex flex-col gap-5 bg-emerald-50 px-5 py-6 dark:bg-emerald-950/25 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"><CheckCircle2 className="h-7 w-7" aria-hidden="true" /></span>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Commande enregistrée</p>
                <h1 className="font-display text-2xl uppercase tracking-tight text-ink-1 sm:text-3xl">Merci, c’est confirmé.</h1>
                <p className="mt-1 text-sm leading-6 text-ink-2">
                  {customerEmail ? `Votre récapitulatif a été envoyé à ${customerEmail}.` : 'Notre équipe vous appellera pour confirmer la livraison.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 dark:border-emerald-900 dark:bg-gray-900"><span className="block text-xs text-ink-3">Commande</span><strong className="mt-0.5 block text-base text-ink-1">#{order.numero || orderId}</strong></div>
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-right dark:border-emerald-900 dark:bg-gray-900"><span className="block text-xs text-ink-3">Total</span><strong className="mt-0.5 block font-display text-lg tabular-nums text-brand">{total.toFixed(2)} DT</strong></div>
            </div>
          </div>
        </section>

        <div className="my-5 grid gap-4 sm:grid-cols-3">
          {[
            ['1', 'Commande reçue', 'C’est fait'],
            ['2', 'Confirmation', 'Nous vous appelons'],
            ['3', 'Livraison', 'Sous 24–72 h'],
          ].map(([step, title, text], index) => (
            <div key={step} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 dark:bg-gray-900">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-subtle text-ink-2'}`}>{step}</span>
              <div><p className="text-sm font-semibold text-ink-1">{title}</p><p className="text-xs text-ink-3">{text}</p></div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="overflow-hidden rounded-2xl border-line bg-white shadow-sm dark:bg-gray-900">
            <CardHeader className="border-b border-line px-5 py-4 sm:px-6">
              <CardTitle className="flex items-center justify-between gap-3 text-base text-ink-1">
                <span className="flex items-center gap-2 font-display uppercase tracking-tight"><Package className="h-5 w-5 text-brand" aria-hidden="true" />Votre commande</span>
                <span className="text-sm font-normal text-ink-3">{orderDetails.length} article{orderDetails.length > 1 ? 's' : ''}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-line">
                {orderDetails.map((detail) => {
                  const productName = detail.produit?.designation_fr || `Produit #${detail.produit_id}`;
                  const productImage = detail.produit?.cover ? getStorageUrl(detail.produit.cover) : null;
                  const itemTotal = detail.prix_ttc || detail.prix_ht || 0;
                  return (
                    <div key={detail.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-subtle">{productImage && <Image src={productImage} alt="" fill className="object-contain p-1" sizes="56px" unoptimized />}</div>
                      <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-semibold leading-5 text-ink-1">{productName}</h3><p className="mt-0.5 text-xs text-ink-3">Quantité : {detail.qte}</p></div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-ink-1">{itemTotal.toFixed(2)} DT</p>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 border-t border-line bg-surface-subtle px-5 py-4 text-sm sm:px-6">
                <div className="flex justify-between text-ink-2"><span>Sous-total</span><span className="font-semibold tabular-nums text-ink-1">{subtotal.toFixed(2)} DT</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Remise</span><span className="font-semibold tabular-nums">−{discount.toFixed(2)} DT</span></div>}
                <div className="flex justify-between text-ink-2"><span>Livraison</span><span className={shipping === 0 ? 'font-semibold text-emerald-700' : 'font-semibold tabular-nums text-ink-1'}>{shipping === 0 ? 'Gratuite' : `${shipping.toFixed(2)} DT`}</span></div>
                <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3"><span className="font-display text-lg uppercase text-ink-1">Total</span><span className="font-display text-xl font-bold tabular-nums text-brand">{total.toFixed(2)} DT</span></div>
              </div>
            </CardContent>
          </Card>
          <aside className="space-y-4">
            <Card className="rounded-2xl border-line bg-white shadow-sm dark:bg-gray-900">
              <CardContent className="space-y-5 p-5">
                <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-1"><Truck className="h-4 w-4 text-brand" aria-hidden="true" />Livraison</div><div className="space-y-0.5 text-sm leading-5 text-ink-2">{customerName && <p className="font-semibold text-ink-1">{customerName}</p>}<p>{address}</p>{city && <p>{city}</p>}{postalCode && <p>{postalCode}</p>}<p className="pt-1 font-medium text-ink-1">{customerPhone}</p></div></div>
                <div className="border-t border-line pt-4"><div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-1"><Wallet className="h-4 w-4 text-brand" aria-hidden="true" />Paiement</div><p className="text-sm text-ink-2">{paymentLabel}</p></div>
                <div className="border-t border-line pt-4"><div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-1"><Calendar className="h-4 w-4 text-brand" aria-hidden="true" />Date</div><p className="text-sm text-ink-2">{formatDate(order.created_at || null)}</p></div>
              </CardContent>
            </Card>
            <div className="grid gap-2">
              <Button asChild size="lg" className="min-h-12 rounded-xl bg-brand font-display uppercase tracking-wide text-white hover:bg-brand-hover"><Link href="/shop"><Home className="mr-2 h-5 w-5" aria-hidden="true" />Continuer mes achats</Link></Button>
              <Button asChild variant="outline" size="lg" className="min-h-12 rounded-xl"><Link href="/account/orders"><FileText className="mr-2 h-5 w-5" aria-hidden="true" />Mes commandes</Link></Button>
              <Button onClick={handlePrintPDF} variant="ghost" size="lg" className="min-h-11 rounded-xl text-ink-2"><Printer className="mr-2 h-4 w-4" aria-hidden="true" />Imprimer le reçu</Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
