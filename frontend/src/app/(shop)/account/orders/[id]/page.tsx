'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Section } from '@/app/components/layout/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, Phone, Mail, Truck, ExternalLink, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { getStorageUrl } from '@/services/api';
import type { Order, OrderDetail } from '@/types';
import { PageHeader } from '@/app/components/PageHeader';
import { OrderDetailSkeleton } from '../../AccountSkeletons';
import { ProtinaAmount, ProtinaMark } from '@/app/components/loyalty/Protina';

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
      <div className="min-h-screen bg-canvas">
        <Section as="div" spacing="feature" first last className="text-center">
          <h1 className="font-display uppercase tracking-tight text-2xl text-ink-1 mb-4">Commande non trouvée</h1>
          <Button className="h-12 rounded-xl bg-brand font-display uppercase tracking-wide text-on-brand hover:bg-brand-hover" onClick={() => router.push('/account')}>Retour au compte</Button>
        </Section>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-sunken">

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
          <PageHeader kicker="Détail commande" title={`Commande #${order.numero}`} />
          {getStatusBadge(order.etat)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
              <CardHeader className="border-b border-hairline">
                <CardTitle className="font-display uppercase tracking-tight text-lg text-ink-1">Articles commandés</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-ink-2">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {order.created_at ? format(new Date(order.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr }) : 'Date inconnue'}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4 mt-6">
                    {details.map((detail) => (
                      <div key={detail.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-sunken p-3 sm:gap-4 sm:p-4">
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
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-ink-1 break-words">
                            {detail.produit?.designation_fr || 'Produit'}
                          </h4>
                          <p className="text-sm text-ink-2">
                            Quantité: {detail.qte} × {detail.prix_unitaire} DT
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display font-bold tracking-tight tabular-nums text-ink-1">
                            {(detail.prix_ttc || detail.prix_ht || 0).toFixed(2)} DT
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
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

            <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
              <CardHeader className="border-b border-hairline">
                <CardTitle className="font-display uppercase tracking-tight text-lg text-ink-1">Résumé</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between text-sm text-ink-2">
                  <span>Sous-total</span>
                  <span className="font-display font-semibold tabular-nums text-ink-1">{order.prix_ht?.toFixed(2) || 0} DT</span>
                </div>
                {order.frais_livraison && (
                  <div className="flex justify-between text-sm text-ink-2">
                    <span>Livraison</span>
                    <span className="font-display font-semibold tabular-nums text-ink-1">{order.frais_livraison} DT</span>
                  </div>
                )}
                <div className="border-t border-hairline pt-4 flex justify-between items-baseline">
                  <span className="font-display uppercase tracking-tight text-lg text-ink-1">Total</span>
                  <span className="font-display font-bold tracking-tight tabular-nums text-lg text-brand">
                    {order.prix_ttc?.toFixed(2) || 0} DT
                  </span>
                </div>
              </CardContent>
            </Card>

            {order.protina && <Card className="overflow-hidden rounded-xl border border-brand/20 bg-elevated shadow-sm"><CardContent className="relative p-5 pr-24 sm:p-6 sm:pr-28"><ProtinaMark size="lg" className="absolute right-5 top-5" decorative={false} /><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Mouvement sécurisé</p><h2 className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-ink-1">Protinas de cette commande</h2><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3 text-ink-2"><span>Utilisées au paiement</span><ProtinaAmount value={-order.protina.spent} className="font-bold text-brand" /></div><div className="flex justify-between gap-3 text-ink-2"><span>{order.protina.state === 'pending_delivery' ? 'À créditer à la livraison' : 'Créditées'}</span><ProtinaAmount value={order.protina.pending || order.protina.earned} signed className="font-bold text-ok" /></div></div><p className="mt-4 flex items-start gap-2 border-t border-hairline pt-3 text-xs leading-relaxed text-ink-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" />Le débit est enregistré une seule fois. En cas d’annulation, les Protinas utilisées sont automatiquement remboursées.</p></CardContent></Card>}

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

    </div>
  );
}
