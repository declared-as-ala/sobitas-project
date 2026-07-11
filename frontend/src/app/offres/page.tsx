import { Metadata } from 'next';
import { getAllProducts } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildCollectionPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { buildProductUrlPath } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
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
    url: buildCanonicalUrl('/offres'),
    images: [{ url: '/slides/home-hero-web.webp', width: 1200, height: 630, alt: OFFRES_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: OFFRES_TITLE,
    description: OFFRES_DESC,
    images: ['/slides/home-hero-web.webp'],
  },
};

// Force dynamic rendering to ensure fresh data on every request
// ISR (was force-dynamic → rendered every request, slow TTFB/LCP). The promo list is cache-safe
// — promotions don't change per second — and revalidates in the background every 5 min.
export const revalidate = 300;

export default async function OffresPage() {
  let promoProducts: Product[] = [];
  try {
    const { products, categories } = await getAllProducts();
    if (Array.isArray(products)) {
      const filtered = products.filter((p: Product) => {
        // Filter: must have valid promo AND be in stock
        const hasPromo = hasValidPromo(p);
        // rupture === 1 means in stock, rupture === 0 or undefined might mean out of stock
        // Based on ProductCard logic: isInStock = rupture === 1 || rupture === undefined
        // So we exclude products where rupture === 0 (explicitly out of stock)
        const isInStock = (p as any).rupture !== 0;
        return hasPromo && isInStock;
      });
      // Resolve subcategory so product links + ItemList URLs are canonical /{subcat}/{slug}, not the
      // /shop/{slug} 301. No-op if the payload has no category data.
      promoProducts = enrichProductsWithSubcategory(filtered, categories);
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
