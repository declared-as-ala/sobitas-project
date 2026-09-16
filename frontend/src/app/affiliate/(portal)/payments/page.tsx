import type { Metadata } from 'next';
import { PaymentsClient } from './PaymentsClient';

export const metadata: Metadata = {
  title: 'Mes paiements — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliatePaymentsPage() {
  return <PaymentsClient />;
}
