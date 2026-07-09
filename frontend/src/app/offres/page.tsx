import { Metadata } from 'next';
import { getAllProducts } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { buildCanonicalUrl } from '@/util/canonical';
import { OffresPageClient } from './OffresPageClient';
import type { Product } from '@/types';

export const metadata: Metadata = {
  title: { absolute: 'Toutes les Offres & Promos Compléments | Protéine Tunisie' },
  description: 'Découvrez tous nos produits en promotion : whey, créatine, gainer et compléments à prix réduits. Livraison rapide partout en Tunisie.',
  alternates: { canonical: buildCanonicalUrl('/offres') },
};

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OffresPage() {
  let promoProducts: Product[] = [];
  try {
    const { products } = await getAllProducts();
    if (Array.isArray(products)) {
      promoProducts = products.filter((p: Product) => {
        // Filter: must have valid promo AND be in stock
        const hasPromo = hasValidPromo(p);
        // rupture === 1 means in stock, rupture === 0 or undefined might mean out of stock
        // Based on ProductCard logic: isInStock = rupture === 1 || rupture === undefined
        // So we exclude products where rupture === 0 (explicitly out of stock)
        const isInStock = (p as any).rupture !== 0;
        return hasPromo && isInStock;
      });
    }
  } catch (e) {
    console.error('Error fetching products for offres:', e);
  }

  return <OffresPageClient products={promoProducts} />;
}
