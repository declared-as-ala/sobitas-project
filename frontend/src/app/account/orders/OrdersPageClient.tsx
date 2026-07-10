'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { OrdersSection } from '../OrdersSection';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { PageHeader } from '@/app/components/PageHeader';

export default function OrdersPageClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account/orders');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Chargement de vos commandes..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <PageHeader kicker="Espace client" title="Mes Commandes" />
        </div>

        <OrdersSection />
      </main>

      <Footer />
    </div>
  );
}
