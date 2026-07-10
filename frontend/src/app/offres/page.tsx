import { Metadata } from 'next';
import { getAllProducts } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildCollectionPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { buildProductUrlPath } from '@/util/productUrl';
import { OffresPageClient } from './OffresPageClient';
import type { Product } from '@/types';

const OFFRES_TITLE = 'Toutes les Offres & Promos Compléments | Protéine Tunisie';
const OFFRES_DESC = 'Découvrez tous nos produits en promotion : whey, créatine, gainer et compléments à prix réduits. Livraison rapide partout en Tunisie.';

export const metadata: Metadata = {
  title: { absolute: OFFRES_TITLE },
  description: OFFRES_DESC,
  alternates: { canonical: buildCanonicalUrl('/offres') },
  openGraph: {
    title: { absolute: OFFRES_TITLE },
    description: OFFRES_DESC,
    type: 'website',
  },
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

  const baseUrl = getBaseUrl();
  const collectionSchema = buildCollectionPageSchema('Toutes les Offres & Promos', '/offres', baseUrl, { description: OFFRES_DESC });
  const itemListSchema = promoProducts.length > 0
    ? buildItemListSchema(
        promoProducts.slice(0, 20).map((p) => ({ name: p.designation_fr || 'Produit', url: buildProductUrlPath(p) })),
        baseUrl,
        { name: 'Offres' }
      )
    : null;
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Offres', url: '/offres' }],
    baseUrl
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <OffresPageClient products={promoProducts} />
    </>
  );
}
