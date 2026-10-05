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
        // GA4 `purchase` is sent at order creation (checkout, quick order) and by the backend
        // fallback, never from this emailed page. The API names the line's product `product`.
        setOrderDetails((data.details_facture || []).map((d) => ({ ...d, produit: d.produit ?? d.product })));
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
