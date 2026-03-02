import { Metadata } from 'next';
import { FavorisPageClient } from './FavorisPageClient';

export const metadata: Metadata = {
  title: 'Favoris | Protein.tn',
  description: 'Vos produits favoris – Protein.tn',
};

export default function FavorisPage() {
  return <FavorisPageClient />;
}
