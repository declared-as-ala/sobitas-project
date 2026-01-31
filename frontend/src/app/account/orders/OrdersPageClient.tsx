'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { OrdersSection } from '../OrdersSection';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { Package } from 'lucide-react';
import { motion } from 'motion/react';

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <Package className="h-8 w-8 text-red-600 dark:text-red-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Mes Commandes
            </h1>
          </div>

          <OrdersSection />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
