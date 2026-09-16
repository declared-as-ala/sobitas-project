import type { Metadata } from 'next';
import { AffiliateComingSoon } from '../../AffiliateComingSoon';

export const metadata: Metadata = {
  title: 'Mon profil — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliateProfilePage() {
  return (
    <AffiliateComingSoon
      title="Mon profil"
      description="La modification de vos coordonnées et de vos informations de paiement arrive très prochainement."
    />
  );
}
