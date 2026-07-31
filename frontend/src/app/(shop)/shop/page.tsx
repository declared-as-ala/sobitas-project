import { Suspense } from 'react';
import { Metadata } from 'next';
import { getAllProducts, getCategories, getAllBrands } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildItemListSchema } from '@/util/structuredData';
import { getProductLink } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { loadForCache } from '@/util/loadForCache';
import { ShopPageClient } from './ShopPageClient';

/**
 * Deliberately does NOT read `searchParams`.
 *
 * `searchParams` is a dynamic API: touching it here — even only to decide a robots tag — opted the
 * WHOLE route out of static rendering, so `export const revalidate = 300` below never took effect.
 * The live page answered `Cache-Control: private, no-cache, no-store, max-age=0` to every visitor
 * and Cloudflare reported `cf-cache-status: DYNAMIC`; no CDN rule can cache a page that says
 * no-store. That is why adding Cloudflare cache rules did not improve mobile. /shop is the mobile
 * tab bar's Boutique target and ships ~1 MB of HTML, so it is the worst page on the site to be
 * re-rendering from scratch on every request.
 *
 * The noindex on faceted views (which stopped /shop?search=WHEY%20PROTEIN and
 * /shop?search={search_term_string} being indexed as duplicates) is preserved — it moved to an
 * `X-Robots-Tag: noindex, follow` response header in next.config.js, matched per query param.
 * Google treats that header as equivalent to the meta tag, and being a header it is evaluated per
 * request, so it still works while the HTML body is cached and shared.
 *
 * Canonical is now unconditionally /shop. For faceted URLs that is what we always wanted — they
 * consolidate onto the real listing. For ?page=N it is a change, but rel prev/next were already
 * inert here (totalPages was hardcoded to 1 because the backend sends no pagination object), and
 * pagination is applied client-side in ShopPageClient.
 */
export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl('/shop');

  return {
    title: { absolute: 'Boutique Protéines & Compléments en Tunisie | Protéine Tunisie' },
    description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide. Filtrez par marque et catégorie.',
    alternates: {
      canonical,
    },
    openGraph: {
      title: { absolute: 'Boutique Protéines & Compléments en Tunisie | Protéine Tunisie' },
      description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide. Filtrez par marque et catégorie.',
      type: 'website',
      url: canonical,
      images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Boutique Protéines & Compléments en Tunisie' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Boutique Protéines & Compléments en Tunisie',
      description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide.',
      images: ['/og-banner.jpg'],
    },
  };
}

// ISR (was force-dynamic → a full whole-catalog fetch + RSC render on EVERY request; the page body
// reads no searchParams so its output is identical per visitor, and faceting/pagination run
// client-side in ShopPageClient). Caching the boutique shell and revalidating in the background
// ships it instantly. Mirrors /offres (300) and /packs (600).
export const revalidate = 300;

async function getShopData() {
  // Products are the primary content. getAllProducts rethrows on the server, so we wrap it in
  // loadForCache: a transient failure (notably the build runner getting Cloudflare-403'd) renders
  // empty but is NOT baked into the ISR cache — the route re-renders next request instead of serving
  // an empty catalog for the whole revalidate window (the PR #77 empty-bake risk). Categories/brands
  // are incidental facets — they fail soft so a hiccup on them doesn't blank the whole boutique.
  const [productsResponse, categories, brands] = await Promise.all([
    loadForCache(
      () => getAllProducts({ perPage: 24, page: 1 }),
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getAllProducts>>
    ),
    getCategories().catch(() => [] as Awaited<ReturnType<typeof getCategories>>),
    getAllBrands().catch(() => [] as Awaited<ReturnType<typeof getAllBrands>>),
  ]);
  const productsData = {
    products: productsResponse.products,
    brands: productsResponse.brands,
    categories: productsResponse.categories,
    pagination: productsResponse.pagination,
  };
  return { productsData, categories, brands };
}

export default async function ShopPage() {
  const { productsData, categories, brands } = await getShopData();
  const baseUrl = getBaseUrl();
  const products = Array.isArray(productsData.products) ? productsData.products : [];

  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Boutique', url: '/shop' }],
    baseUrl
  );
  const collectionSchema = buildCollectionPageSchema(
    'Boutique Protéines & Compléments en Tunisie',
    '/shop',
    baseUrl,
    { description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide.' }
  );
  const itemListProducts = enrichProductsWithSubcategory(products, categories);
  const itemListSchema = itemListProducts.length > 0
    ? buildItemListSchema(
        itemListProducts.slice(0, 20).map((p: { designation_fr?: string }) => ({
          name: p.designation_fr || 'Produit',
          url: getProductLink(p as never),
        })),
        baseUrl,
        { name: 'Boutique' }
      )
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      {/*
        Required because ShopPageClient calls useSearchParams() at its top level: a static route
        needs a Suspense boundary ABOVE that call, and the one inside ShopPageClient sits below the
        hook. This alone did NOT make the route cacheable — reading searchParams in
        generateMetadata was what forced dynamic rendering (see the note there). Both were needed;
        verified by the route going from `ƒ /shop` to `○ /shop  5m` in the build output.
      */}
      <Suspense fallback={null}>
        <ShopPageClient productsData={productsData} categories={categories} brands={brands} />
      </Suspense>
    </>
  );
}
