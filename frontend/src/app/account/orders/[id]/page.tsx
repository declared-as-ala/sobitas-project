'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { getStorageUrl } from '@/services/api';
import type { OrderDetail } from '@/types';
import { PageHeader } from '@/app/components/PageHeader';
import { OrderDetailSkeleton } from '../../AccountSkeletons';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderDetails } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null);
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
    const green = 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900';
    const amber = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
    const red = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900';
    const gray = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';

    const statusMap: Record<string, { label: string; className: string }> = {
      'nouvelle_commande': { label: 'Nouvelle', className: gray },
      'en_cours_de_preparation': { label: 'En préparation', className: amber },
      'prete': { label: 'Prête', className: amber },
      'en_cours_de_livraison': { label: 'En livraison', className: amber },
      'expidee': { label: 'Expédiée', className: green },
      'annuler': { label: 'Annulée', className: red },
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
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="font-display uppercase tracking-tight text-2xl text-gray-900 dark:text-white mb-4">Commande non trouvée</h1>
          <Button className="bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide rounded-xl" onClick={() => router.push('/account')}>Retour au compte</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
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
            <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">Articles commandés</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {order.created_at ? format(new Date(order.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr }) : 'Date inconnue'}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4 mt-6">
                    {details.map((detail) => (
                      <div key={detail.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        {detail.produit?.cover && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
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
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {detail.produit?.designation_fr || 'Produit'}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Quantité: {detail.qte} × {detail.prix_unitaire} DT
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold tracking-tight tabular-nums text-gray-900 dark:text-white">
                            {(detail.prix_ttc || detail.prix_ht || 0).toFixed(0)} DT
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
            <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">Résumé</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Sous-total</span>
                  <span className="font-display font-semibold tabular-nums text-gray-900 dark:text-white">{order.prix_ht?.toFixed(0) || 0} DT</span>
                </div>
                {order.frais_livraison && (
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Livraison</span>
                    <span className="font-display font-semibold tabular-nums text-gray-900 dark:text-white">{order.frais_livraison} DT</span>
                  </div>
                )}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex justify-between items-baseline">
                  <span className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">Total</span>
                  <span className="font-display font-bold tracking-tight tabular-nums text-lg text-red-600 dark:text-red-400">
                    {order.prix_ttc?.toFixed(0) || 0} DT
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">
                  <MapPin className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {order.livraison_nom || order.nom} {order.livraison_prenom || order.prenom}
                </p>
                <p>{order.livraison_adresse1 || order.adresse1}</p>
                {order.livraison_adresse2 || order.adresse2 && (
                  <p>{order.livraison_adresse2 || order.adresse2}</p>
                )}
                <p>
                  {order.livraison_ville || order.ville}, {order.livraison_region || order.region}
                </p>
                {order.livraison_code_postale || order.code_postale && (
                  <p>{order.livraison_code_postale || order.code_postale}</p>
                )}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Phone className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span>{order.livraison_phone || order.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span>{order.livraison_email || order.email}</span>
                </div>
              </CardContent>
            </Card>

            {order.note && (
              <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                  <CardTitle className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{order.note}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
