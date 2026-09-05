'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Package, Eye, Calendar, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ProtinaAmount } from '@/app/components/loyalty/Protina';

export function OrdersSection() {
  const router = useRouter();
  const { orders, fetchOrders, isLoading, ordersLoading, ordersError } = useAuth();
  const hasRequestedOrders = useRef(false);

  const safeOrders = Array.isArray(orders) ? orders : [];

  useEffect(() => {
    if (!isLoading && !hasRequestedOrders.current && safeOrders.length === 0 && !ordersLoading && !ordersError) {
      hasRequestedOrders.current = true;
      void fetchOrders();
    }
  }, [fetchOrders, isLoading, ordersError, ordersLoading, safeOrders.length]);

  const getStatusBadge = (status: string) => {
    const green = 'border border-ok/40 bg-elevated text-ok';
    const amber = 'border border-warn/40 bg-elevated text-warn';
    const red = 'border border-destructive/40 bg-elevated text-destructive';
    const gray = 'border border-rule bg-elevated text-ink-2';

    /*
      ── THE DELIVERED STATUSES WERE MISSING FROM THIS MAP ─────────────────────────────
      The fallback is `{ label: status }`, so any status not listed here rendered its RAW
      DATABASE VALUE as the badge — a customer whose order had arrived saw the word
      "livree", unaccented, lowercase, in a design-face uppercase pill.

      And it was specifically the delivered states that were missing, which is the one
      transition that matters most on this page: `PointsService::DELIVERED_STATUSES` is
      ['livree','livrée','livre'], and that transition is what credits the loyalty points
      shown in the strip above these cards. The three spellings are carried here rather than
      normalised, because all three exist in the orders table.

      The cancelled/returned set comes from `PointsService::CANCELLED_STATUSES` for the same
      reason — those are the orders whose points get clawed back.
    */
    const statusMap: Record<string, { label: string; className: string }> = {
      'nouvelle_commande': { label: 'Nouvelle', className: gray },
      'en_cours_de_preparation': { label: 'En préparation', className: amber },
      'prete': { label: 'Prête', className: amber },
      'en_cours_de_livraison': { label: 'En livraison', className: amber },
      'expidee': { label: 'Expédiée', className: green },
      'livree': { label: 'Livrée', className: green },
      'livrée': { label: 'Livrée', className: green },
      'livre': { label: 'Livrée', className: green },
      'annuler': { label: 'Annulée', className: red },
      'annulee': { label: 'Annulée', className: red },
      'annulée': { label: 'Annulée', className: red },
      'retour': { label: 'Retournée', className: red },
      'retourner': { label: 'Retournée', className: red },
      'retournee': { label: 'Retournée', className: red },
      'retournée': { label: 'Retournée', className: red },
    };

    const statusInfo = statusMap[status] || { label: status, className: gray };
    return (
      <Badge className={`font-display uppercase tracking-wide ${statusInfo.className}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading || ordersLoading) {
    return (
      <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
        <CardContent className="py-12">
          <LoadingSpinner message="Chargement des commandes..." />
        </CardContent>
      </Card>
    );
  }

  if (ordersError) {
    return (
      <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10">
            <Package className="h-7 w-7 text-brand" aria-hidden="true" />
          </div>
          <p className="text-ink-2">{ordersError}</p>
          <Button type="button" variant="outline" className="min-h-[44px] rounded-xl border-brand/30 text-brand hover:bg-brand/10" onClick={() => fetchOrders()}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (safeOrders.length === 0) {
    return (
      <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-brand/10">
            <Package className="h-8 w-8 text-brand" aria-hidden="true" />
          </div>
          <h3 className="font-display uppercase tracking-tight text-xl text-ink-1 mb-2">Aucune commande</h3>
          <p className="text-ink-2 mb-6">
            Vous n&apos;avez pas encore passé de commande.
          </p>
          {/* 36px (the shadcn default) and `text-white` on the accent, in the ONE state every
              customer of this shop is currently in: no order has ever been marked delivered, so
              this empty branch is production, not an edge case. h-12 matches the profile form. */}
          <Button asChild className="h-12 rounded-xl bg-brand font-display uppercase tracking-wide text-on-brand hover:bg-brand-hover">
            <Link href="/shop">Commencer vos achats</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {safeOrders.map((order) => (
        <Card key={order.id} className="rounded-xl border border-hairline bg-elevated shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="font-display uppercase tracking-tight text-lg text-ink-1 break-words">Commande #{order.numero}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-sm text-ink-2">
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {order.created_at ? format(new Date(order.created_at), 'dd MMMM yyyy', { locale: fr }) : 'Date inconnue'}
                  </span>
                </div>
              </div>
              <div className="shrink-0">{getStatusBadge(order.etat)}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-ink-2 mb-1 break-words">
                  {order.ville && `${order.ville}, `}
                  {order.region}
                </p>
                <p className="font-display font-bold tracking-tight tabular-nums text-2xl text-brand">
                  {order.prix_ttc?.toFixed(2) || 0} DT
                </p>
                {order.tracking?.number && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-2">
                    <Truck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                    Suivi Aramex disponible
                  </p>
                )}
                {order.protina && (order.protina.spent > 0 || order.protina.earned > 0 || order.protina.pending > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    {order.protina.spent > 0 && <span className="rounded-full bg-brand/5 px-2.5 py-1 text-brand"><ProtinaAmount value={-order.protina.spent} /></span>}
                    {order.protina.earned > 0 && <span className="rounded-full bg-ok/8 px-2.5 py-1 text-ok"><ProtinaAmount value={order.protina.earned} signed /> créditées</span>}
                    {order.protina.pending > 0 && <span className="rounded-full bg-warn/8 px-2.5 py-1 text-warn"><ProtinaAmount value={order.protina.pending} signed /> à la livraison</span>}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                className="min-h-[44px] w-full shrink-0 justify-center rounded-xl border-brand/30 text-brand hover:bg-brand/10 sm:w-auto"
                onClick={() => router.push(`/account/orders/${order.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                Voir les détails
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
