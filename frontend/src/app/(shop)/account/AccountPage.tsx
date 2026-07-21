'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileSection } from './ProfileSection';
import { OrdersSection } from './OrdersSection';
import { FidelitySection } from './FidelitySection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { User, Package, Gift } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { AccountPageSkeleton } from './AccountSkeletons';

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchOrders } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
    // Only fetch once when authenticated, not on every fetchOrders change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isLoading) {
    return <AccountPageSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <PageHeader kicker="Espace client" title="Mon Compte" />

        <Tabs defaultValue="profile" className="w-full mt-8">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-auto p-1 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <TabsTrigger
              value="profile"
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 font-display uppercase tracking-wide text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Profil
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 font-display uppercase tracking-wide text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              Mes Commandes
            </TabsTrigger>
            <TabsTrigger
              value="fidelite"
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 font-display uppercase tracking-wide text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Gift className="h-4 w-4" aria-hidden="true" />
              Fidélité
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSection />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersSection />
          </TabsContent>

          <TabsContent value="fidelite">
            <FidelitySection />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}
