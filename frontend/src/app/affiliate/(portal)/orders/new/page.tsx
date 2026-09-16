import type { Metadata } from 'next';
import { CreateOrderClient } from './CreateOrderClient';

export const metadata: Metadata = {
  title: 'Nouvelle commande — Affilié',
  robots: { index: false, follow: false },
};

export default function NewAffiliateOrderPage() {
  return <CreateOrderClient />;
}
