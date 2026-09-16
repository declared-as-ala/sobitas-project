import type { Metadata } from 'next';
import { AffiliateDashboardClient } from './AffiliateDashboardClient';

export const metadata: Metadata = {
  title: 'Espace Affilié — Protein.tn',
  robots: { index: false, follow: false },
};

export default function AffiliateDashboardPage() {
  return <AffiliateDashboardClient />;
}
