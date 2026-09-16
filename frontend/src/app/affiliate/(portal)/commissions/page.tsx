import type { Metadata } from 'next';
import { AffiliateComingSoon } from '../../AffiliateComingSoon';

export const metadata: Metadata = {
  title: 'Mes commissions — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliateCommissionsPage() {
  return (
    <AffiliateComingSoon
      title="Mes commissions"
      description="Le détail de vos commissions (en attente, confirmées, payées) arrive très prochainement."
    />
  );
}
