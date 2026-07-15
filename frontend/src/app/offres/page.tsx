import { Metadata } from 'next';
import { getAllProducts } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
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
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: OFFRES_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: OFFRES_TITLE,
    description: OFFRES_DESC,
    images: ['/og-banner.jpg'],
  },
};

// Force dynamic rendering to ensure fresh data on every request
// ISR (was force-dynamic → rendered every request, slow TTFB/LCP). The promo list is cache-safe
// — promotions don't change per second — and revalidates in the background every 5 min.
export const revalidate = 300;

export default async function OffresPage() {
  // loadForCache: getAllProducts() rethrows on the server, so a failed fetch (e.g. a 403 during
  // `next build`) calls noStore() and defers to runtime instead of baking an empty promos page.
  const { products, categories } = await loadForCache(
    () => getAllProducts(),
    { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getAllProducts>>,
  );
  let promoProducts: Product[] = [];
  if (Array.isArray(products)) {
    const filtered = products.filter((p: Product) => {
      // Must have a valid promo AND be in stock. Exclude products explicitly out of stock
      // (rupture === 0); undefined/1 are treated as in stock (matches ProductCard).
      const hasPromo = hasValidPromo(p);
      const inStock = (p as any).rupture !== 0;
      return hasPromo && inStock;
    });
    // Resolve subcategory so links + ItemList URLs are canonical /{subcat}/{slug}, not the /shop/{slug} 301.
    promoProducts = enrichProductsWithSubcategory(filtered, categories);
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
