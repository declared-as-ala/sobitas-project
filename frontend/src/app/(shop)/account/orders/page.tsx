import { Metadata } from 'next';
import { Suspense } from 'react';
import OrdersPageClient from './OrdersPageClient';
import { OrdersPageSkeleton } from '../AccountSkeletons';

export const metadata: Metadata = {
  title: 'Mes Commandes',
  description: 'Consultez toutes vos commandes',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageSkeleton />}>
      <OrdersPageClient />
    </Suspense>
  );
}
