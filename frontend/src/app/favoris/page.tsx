import { Metadata } from 'next';
import { FavorisPageClient } from './FavorisPageClient';

export const metadata: Metadata = {
  title: 'Favoris | Proteine Tunisie',
  description: 'Vos produits favoris – Proteine Tunisie',
};

export default function FavorisPage() {
  return <FavorisPageClient />;
}
