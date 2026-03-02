'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Package, Calendar, MapPin, Phone, Mail, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import Image from 'next/image';
import { getStorageUrl } from '@/services/api';
import type { OrderDetail } from '@/types';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderDetails } = useAuth();
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
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'nouvelle_commande': { label: 'Nouvelle', variant: 'default' },
      'en_cours_de_preparation': { label: 'En préparation', variant: 'secondary' },
      'prete': { label: 'Prête', variant: 'secondary' },
      'en_cours_de_livraison': { label: 'En livraison', variant: 'secondary' },
      'expidee': { label: 'Expédiée', variant: 'default' },
      'annuler': { label: 'Annulée', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Chargement de la commande..." />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Commande non trouvée</h1>
          <Button onClick={() => router.push('/account')}>Retour au compte</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Commande #{order.numero}</CardTitle>
                    {getStatusBadge(order.etat)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {order.created_at ? format(new Date(order.created_at), 'dd MMMM yyyy à HH:mm') : 'Date inconnue'}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-4 mt-6">
                      <h3 className="font-semibold">Articles commandés</h3>
                      {details.map((detail) => (
                        <div key={detail.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          {detail.produit?.cover && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                              <Image
                                src={getStorageUrl(detail.produit.cover)}
                                alt={detail.produit.designation_fr || 'Produit'}
                                fill
                                className="object-contain p-2"
                                sizes="64px"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {detail.produit?.designation_fr || 'Produit'}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Quantité: {detail.qte} × {detail.prix_unitaire} DT
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
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
              <Card>
                <CardHeader>
                  <CardTitle>Résumé</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span className="font-semibold">{order.prix_ht?.toFixed(0) || 0} DT</span>
                  </div>
                  {order.frais_livraison && (
                    <div className="flex justify-between">
                      <span>Livraison</span>
                      <span className="font-semibold">{order.frais_livraison} DT</span>
                    </div>
                  )}
                  <div className="border-t pt-4 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-red-600 dark:text-red-400">
                      {order.prix_ttc?.toFixed(0) || 0} DT
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Adresse de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-semibold">
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
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{order.livraison_phone || order.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{order.livraison_email || order.email}</span>
                  </div>
                </CardContent>
              </Card>

              {order.note && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.note}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
