import type { Metadata } from 'next';
import { AffiliateComingSoon } from '../../AffiliateComingSoon';

export const metadata: Metadata = {
  title: 'Mes paiements — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliatePaymentsPage() {
  return (
    <AffiliateComingSoon
      title="Mes paiements"
      description="L’historique de vos versements arrive très prochainement."
    />
  );
}
