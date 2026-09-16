import type { Metadata } from 'next';
import { CommissionsClient } from './CommissionsClient';

export const metadata: Metadata = {
  title: 'Mes commissions — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliateCommissionsPage() {
  return <CommissionsClient />;
}
