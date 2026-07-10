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
  const { orders, fetchOrders, isLoading, ordersLoading, ordersError } = useAuth();

  const safeOrders = Array.isArray(orders) ? orders : [];

  useEffect(() => {
    if (!isLoading && safeOrders.length === 0 && !ordersLoading && !ordersError) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (isLoading || ordersLoading) {
    return (
      <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <CardContent className="py-12">
          <LoadingSpinner message="Chargement des commandes..." />
        </CardContent>
      </Card>
    );
  }

  if (ordersError) {
    return (
      <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
            <Package className="h-7 w-7 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <p className="text-gray-700 dark:text-gray-300">{ordersError}</p>
          <Button type="button" variant="outline" className="rounded-xl border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => fetchOrders()}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (safeOrders.length === 0) {
    return (
      <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 mb-4">
            <Package className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <h3 className="font-display uppercase tracking-tight text-xl text-gray-900 dark:text-white mb-2">Aucune commande</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Vous n&apos;avez pas encore passé de commande.
          </p>
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide rounded-xl">
            <Link href="/shop">Commencer vos achats</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {safeOrders.map((order) => (
        <Card key={order.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">Commande #{order.numero}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
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
                <p className="font-display font-bold tracking-tight tabular-nums text-2xl text-red-600 dark:text-red-400">
                  {order.prix_ttc?.toFixed(0) || 0} DT
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
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
