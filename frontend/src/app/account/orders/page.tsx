import { Metadata } from 'next';
import OrdersPageClient from './OrdersPageClient';

export const metadata: Metadata = {
  title: 'Mes Commandes',
  description: 'Consultez toutes vos commandes',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrdersPage() {
  return <OrdersPageClient />;
}
