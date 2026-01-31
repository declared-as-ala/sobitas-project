import { Metadata } from 'next';
import { getAllProducts } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { OffresPageClient } from './OffresPageClient';
import type { Product } from '@/types';

export const metadata: Metadata = {
  title: 'Toutes les offres & Promos | SOBITAS Tunisie',
  description: 'Découvrez tous nos produits en promotion. Protéines, créatine, compléments à prix réduits. Livraison en Tunisie.',
};

export default async function OffresPage() {
  let promoProducts: Product[] = [];
  try {
    const { products } = await getAllProducts();
    if (Array.isArray(products)) {
      promoProducts = products.filter((p: Product) => hasValidPromo(p));
    }
  } catch (e) {
    console.error('Error fetching products for offres:', e);
  }

  return <OffresPageClient products={promoProducts} />;
}
