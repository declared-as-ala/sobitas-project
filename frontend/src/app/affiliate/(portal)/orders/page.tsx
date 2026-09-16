import type { Metadata } from 'next';
import { AffiliateComingSoon } from '../../AffiliateComingSoon';

export const metadata: Metadata = {
  title: 'Mes commandes — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliateOrdersPage() {
  return (
    <AffiliateComingSoon
      title="Mes commandes"
      description="La liste de vos commandes et la création d’une nouvelle commande (avec le sélecteur de produits) arrivent très prochainement."
    />
  );
}
