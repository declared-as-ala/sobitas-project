'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Section } from '@/app/components/layout/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, MapPin, Phone, Mail, Truck, ExternalLink, CheckCircle2, Clock3, Package } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { getStorageUrl } from '@/services/api';
import type { Order, OrderDetail } from '@/types';
import { PageHeader } from '@/app/components/PageHeader';
import { OrderDetailSkeleton } from '../../AccountSkeletons';
import { OrderReceipt, moneyDecimals, receiptFigures } from '@/app/components/account/OrderReceipt';
import { OrderProtinaOutcome } from '@/app/components/loyalty/OrderProtinaOutcome';
import { orderLifecycle } from '@/util/orderStatus';

/**
 * ── THE ORDER PAGE HAD TO SHOW WHAT THE ORDER COST, AND IT DID NOT ──────────────────────────
 *
 * Owner, pointing at a live order: *"make it show real numbers of how much the commande, how much
 * remise from site, how much used protinas reduces the command price etc, and total, and how much
 * will gain protinas on livraison"*.
 *
 * What was here printed `prix_ht`, `frais_livraison` and `prix_ttc` under the headings Sous-total,
 * Livraison and Total. Those three figures do not add up on any order carrying a coupon, a pack
 * discount or a points redemption, because the backend computes
 *
 *     prix_ttc = max(0, prix_ht − (coupon + pack + points)) + frais_livraison
 *
 * and none of the three subtractions was on the page, nor in the API response — `detail_commande`
 * did not select `remise`, `discount_ht` or `coupon_code_snapshot` at all. The fix is therefore
 * half server-side (ClientController now selects those columns and publishes a reconciled
 * `totals` object) and half here. Nothing on this page subtracts one API figure from another to
 * produce a discount: `OrderReceipt` renders what the server computed, and refuses to itemise at
 * all when the server says the components do not reproduce the total.
 *
 * The loyalty outcome is a SEPARATE block, deliberately. Protinas are not money — the dinars a
 * redemption removed are on the receipt because they are on the invoice, and the points movement
 * is stated on its own, in the tense the order's current status makes true. See
 * `OrderProtinaOutcome`, which is what stops a cancelled order promising a reward.
 */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderDetails } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderDetails(parseInt(params.id as string));
        setOrder(data.commande);
        setDetails(data.details || []);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchOrder();
    }
  }, [params.id, getOrderDetails]);

  const getStatusBadge = (status: string) => {
    const green = 'border border-ok/40 bg-elevated text-ok';
    const amber = 'border border-warn/40 bg-elevated text-warn';
    const red = 'border border-destructive/40 bg-elevated text-destructive';
    const gray = 'border border-rule bg-elevated text-ink-2';

    /* Every spelling in `commandes.etat`. The fallback is `{ label: status }`, so a missing entry
       renders the raw database value inside a display-face uppercase pill — which is exactly how
       "livree" once shipped as a badge on the one status that matters most. */
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

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <main className="min-h-dvh bg-sunken">
        <Section as="div" spacing="feature" first last className="text-center">
          <h1 className="font-display uppercase tracking-tight text-2xl text-ink-1 mb-4">Commande non trouvée</h1>
          <Button className="h-12 rounded-xl bg-brand font-display uppercase tracking-wide text-on-brand hover:bg-brand-hover" onClick={() => router.push('/account')}>Retour au compte</Button>
        </Section>
      </main>
    );
  }

  const lifecycle = orderLifecycle(order.etat);
  const itemCount = details.reduce((sum, detail) => sum + (Number(detail.qte) || 0), 0);
  const lineTotal = (detail: OrderDetail) => Number(detail.prix_ttc || detail.prix_ht) || 0;
  // One precision for the whole card: the line totals and the receipt beneath them are the same
  // column of money, and printing "96.9 DT" above "96.90 DT" reads as two different roundings.
  const decimals = moneyDecimals([
    ...details.map(lineTotal),
    ...(order.totals ? receiptFigures(order.totals) : [Number(order.prix_ttc) || 0]),
  ]);
  const money = (n: number) => `${n.toFixed(decimals)} DT`;
  const orderedAt = order.created_at
    ? format(new Date(order.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })
    : null;

  return (
    /* `data-order-*` is how scripts/measure-order-detail.mjs asserts it is looking at the order it
       navigated to. A guard that does not check which page it landed on is how the first version
       of measure-account measured the default tab three times and reported three passes. */
    <main className="min-h-dvh bg-sunken" data-order-numero={order.numero} data-order-lifecycle={lifecycle}>

      <Section as="div" spacing="default" first last>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 min-h-[44px] text-ink-2 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Retour
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <PageHeader
            kicker="Détail commande"
            title={`Commande #${order.numero}`}
            subtitle={orderedAt ? `Passée le ${orderedAt}` : undefined}
          />
          {getStatusBadge(order.etat)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ── THE RECEIPT: the articles and what they came to, in one card ──────────────
              Items and totals belong to the same object. Splitting them across two cards in
              two columns is what let the totals block drift out of agreement with the lines
              above it without anybody noticing. */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
              <CardHeader className="border-b border-hairline">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-display uppercase tracking-tight text-lg text-ink-1">
                  <span>Articles commandés</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold normal-case tracking-normal text-ink-3">
                    <Package className="h-4 w-4" aria-hidden="true" />
                    {itemCount} article{itemCount > 1 ? 's' : ''}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 sm:pt-6">
                <ul className="space-y-3">
                  {details.map((detail) => (
                    <li key={detail.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-sunken p-3 sm:gap-4 sm:p-4">
                      {detail.produit?.cover && (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-canvas">
                          <Image
                            src={getStorageUrl(detail.produit.cover)}
                            alt={detail.produit.designation_fr || 'Produit'}
                            fill
                            className="object-contain p-2"
                            sizes="64px"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="break-words font-semibold text-ink-1">
                          {detail.produit?.designation_fr || 'Produit'}
                        </h4>
                        <p className="mt-0.5 text-sm tabular-nums text-ink-3">
                          {detail.qte} × {money(Number(detail.prix_unitaire) || 0)}
                        </p>
                      </div>
                      <p className="shrink-0 font-display font-bold tracking-tight tabular-nums text-ink-1">
                        {money(lineTotal(detail))}
                      </p>
                    </li>
                  ))}
                </ul>

                {/* `totals` comes only from /detail_commande, which is the only endpoint that
                    selects the money columns. No fallback arithmetic: if the server did not send
                    a receipt, the page says so rather than printing a total it reconstructed. */}
                <div className="mt-6">
                  {order.totals ? (
                    <OrderReceipt
                      totals={order.totals}
                      lifecycle={lifecycle}
                      pointsRedeemed={order.protina?.redeemed ?? order.protina?.spent ?? 0}
                      decimals={decimals}
                    />
                  ) : (
                    <div className="border-t border-rule pt-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-display text-base font-bold uppercase tracking-tight text-ink-1 sm:text-lg">
                          Total
                        </span>
                        <span className="font-display text-xl font-bold tracking-tight tabular-nums text-brand sm:text-2xl">
                          {money(Number(order.prix_ttc) || 0)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-ink-3">
                        Le détail des remises n’est pas disponible pour cette commande.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="rounded-xl border border-brand/20 bg-elevated shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Truck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm uppercase tracking-wide text-ink-1">Suivi de livraison</p>
                    {order.tracking?.number ? (
                      <>
                        <p className="mt-1 text-sm text-ink-2">Transporteur {order.tracking.carrier}</p>
                        {order.tracking.status_label && <p className="mt-3 rounded-xl border border-ok/20 bg-ok/5 px-3 py-2 text-sm font-semibold text-ok">{order.tracking.status_label}</p>}
                        <p className="mt-2 break-all font-mono text-sm font-semibold tracking-wide text-ink-1">
                          {order.tracking.number}
                        </p>
                        <div className="mt-4 space-y-3 border-s-2 border-hairline ps-4">
                          <div className="relative"><CheckCircle2 className="absolute -left-[26px] top-0 h-4 w-4 rounded-full bg-elevated text-ok" /><p className="text-xs font-bold text-ink-1">Commande préparée</p></div>
                          <div className="relative"><Truck className="absolute -left-[26px] top-0 h-4 w-4 bg-elevated text-brand" /><p className="text-xs font-bold text-ink-1">Remise à Aramex</p>{order.tracking.shipped_at && <p className="mt-0.5 text-[11px] text-ink-3">{new Date(order.tracking.shipped_at).toLocaleString('fr-FR')}</p>}</div>
                          <div className="relative"><Clock3 className={`absolute -left-[26px] top-0 h-4 w-4 bg-elevated ${order.tracking.delivered_at ? 'text-ok' : 'text-ink-3'}`} /><p className="text-xs font-bold text-ink-1">Livraison</p><p className="mt-0.5 text-[11px] text-ink-3">{order.tracking.delivered_at ? new Date(order.tracking.delivered_at).toLocaleString('fr-FR') : 'En attente de la prochaine mise à jour'}</p></div>
                        </div>
                        <Button asChild className="mt-4 min-h-[44px] w-full rounded-xl bg-brand font-display uppercase tracking-wide text-on-brand hover:bg-brand-hover">
                          <a href={order.tracking.url} target="_blank" rel="noopener noreferrer">
                            Suivre chez Aramex
                            <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                          </a>
                        </Button>
                        {order.tracking.synced_at && <p className="mt-2 text-center text-[10px] text-ink-3">Synchronisé avec Aramex le {new Date(order.tracking.synced_at).toLocaleString('fr-FR')}</p>}
                      </>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed text-ink-2">
                        Le numéro de suivi apparaîtra ici dès la remise de votre colis au transporteur.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.protina && (
              <OrderProtinaOutcome
                movement={order.protina}
                lifecycle={lifecycle}
                redemptionValueDt={order.totals ? order.totals.points_discount : null}
              />
            )}

            <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
              <CardHeader className="border-b border-hairline">
                <CardTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-ink-1">
                  <MapPin className="h-5 w-5 text-brand" aria-hidden="true" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-2 text-sm text-ink-2">
                <p className="font-semibold text-ink-1">
                  {order.livraison_nom || order.nom} {order.livraison_prenom || order.prenom}
                </p>
                <p>{order.livraison_adresse1 || order.adresse1}</p>
                {(order.livraison_adresse2 || order.adresse2) && (
                  <p>{order.livraison_adresse2 || order.adresse2}</p>
                )}
                <p>
                  {order.livraison_ville || order.ville}, {order.livraison_region || order.region}
                </p>
                {(order.livraison_code_postale || order.code_postale) && (
                  <p>{order.livraison_code_postale || order.code_postale}</p>
                )}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-hairline">
                  <Phone className="h-4 w-4 text-ink-3" aria-hidden="true" />
                  <span>{order.livraison_phone || order.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-ink-3" aria-hidden="true" />
                  <span>{order.livraison_email || order.email}</span>
                </div>
              </CardContent>
            </Card>

            {order.note && (
              <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
                <CardHeader className="border-b border-hairline">
                  <CardTitle className="font-display uppercase tracking-tight text-lg text-ink-1">Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-ink-2">{order.note}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Section>

    </main>
  );
}
