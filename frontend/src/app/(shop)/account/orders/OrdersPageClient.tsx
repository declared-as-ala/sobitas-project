'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { OrdersSection } from '../OrdersSection';
import { OrdersPageSkeleton } from '../AccountSkeletons';
import { Section } from '@/app/components/layout/Section';

export default function OrdersPageClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account/orders');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <OrdersPageSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main>
    <Section as="div" width="wide" spacing="default" first last>
      <header className="mb-5 border-b border-hairline pb-4 sm:mb-6 sm:pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">Suivi</p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight text-ink-1 sm:text-4xl">Mes commandes</h1>
        <p className="mt-1.5 text-sm text-ink-2">Retrouvez vos achats et leur état de livraison.</p>
      </header>
      <OrdersSection />
    </Section>
    </main>
  );
}
