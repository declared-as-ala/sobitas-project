'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { Section } from '@/app/components/layout/Section';
import { OrderDocument } from '@/app/components/order/OrderDocument';
import { printOrderDocument } from '@/app/components/order/printOrderDocument';
import { getOrderDetails, getSiteLogoUrlResolved } from '@/services/api';
import type { Order } from '@/types';
import { notify as toast } from '@/lib/notify';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { OrderProtinaSummary } from '@/app/components/loyalty/OrderProtinaSummary';

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

  const handlePrintPDF = async () => {
    const document = printRef.current?.querySelector<HTMLElement>('[data-order-document]');
    if (!document) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour imprimer');
      return;
    }
    const logoUrl = await getSiteLogoUrlResolved();
    await printOrderDocument(printWindow, document, logoUrl);
  };

  if (loading) return <LoadingSpinner fullScreen message="Chargement de la commande..." />;
  if (!order) return <main><Section spacing="default" first last width="narrow" className="text-center">
    <h1 className="mb-4 font-display text-2xl uppercase tracking-tight text-ink-1">Commande introuvable</h1>
    <Button asChild className="min-h-11 rounded-xl bg-brand text-on-brand hover:bg-brand-hover"><LinkWithLoading href="/shop">Retour ? la boutique</LinkWithLoading></Button>
  </Section></main>;

  return <main className="bg-sunken">
    <Section spacing="default" first last width="narrow">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <LinkWithLoading href="/shop" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Continuer mes achats</LinkWithLoading>
        <Button onClick={handlePrintPDF} className="min-h-11 rounded-xl bg-brand text-on-brand hover:bg-brand-hover"><Printer className="me-2 h-4 w-4" aria-hidden="true" />Imprimer le bon de commande</Button>
      </div>
      <div ref={printRef}><OrderDocument order={order} details={orderDetails} /></div>
      <div className="mt-4"><OrderProtinaSummary order={order} /></div>
      <LinkWithLoading href="/account/orders" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2"><FileText className="h-4 w-4" aria-hidden="true" />Mes commandes</LinkWithLoading>
    </Section>
  </main>;
}
