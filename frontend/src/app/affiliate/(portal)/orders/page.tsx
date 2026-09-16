import type { Metadata } from 'next';
import { OrdersClient } from './OrdersClient';

export const metadata: Metadata = {
  title: 'Mes commandes — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliateOrdersPage() {
  return <OrdersClient />;
}
