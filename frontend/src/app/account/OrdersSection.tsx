'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Package, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export function OrdersSection() {
  const router = useRouter();
  const { orders, fetchOrders, isLoading } = useAuth();

  useEffect(() => {
    // Only fetch if orders are empty and not currently loading
    if (!isLoading && (!orders || orders.length === 0)) {
      fetchOrders();
    }
    // Only fetch once when component mounts, not on every fetchOrders change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    return (
      <Card>
        <CardContent className="py-12">
          <LoadingSpinner message="Chargement des commandes..." />
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune commande</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Vous n'avez pas encore passé de commande.
          </p>
          <Button asChild>
            <Link href="/shop">Commencer vos achats</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Commande #{order.numero}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {order.created_at ? format(new Date(order.created_at), 'dd MMMM yyyy') : 'Date inconnue'}
                  </span>
                </div>
              </div>
              {getStatusBadge(order.etat)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {order.ville && `${order.ville}, `}
                  {order.region}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {order.prix_ttc?.toFixed(0) || 0} DT
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push(`/account/orders/${order.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir les détails
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
