import { Metadata } from 'next';
import BrandsPageClient from './BrandsPageClient';
import { getAllBrands } from '@/services/api';
import { buildBreadcrumbListSchema, buildCollectionPageSchema, buildItemListSchema } from '@/util/structuredData';

// ISR: the brand list changes rarely, so cache the server-rendered page.
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

// Mirror BrandsPageClient's nameToSlug so ItemList URLs equal the rendered brand card hrefs.
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export const metadata: Metadata = {
  title: { absolute: 'Brands — Compléments Alimentaires | Protéine Tunisie' },
  description: 'Optimum Nutrition, Biotech USA, MyProtein et plus. Toutes nos marques de protéines et compléments en Tunisie.',
  openGraph: {
    title: 'Brands — Compléments Alimentaires | Protéine Tunisie',
    description: 'Optimum Nutrition, Biotech USA et plus. Marques de protéines et compléments en Tunisie.',
    url: 'https://protein.tn/brands',
    siteName: 'Protéine Tunisie',
    images: [
      {
        url: 'https://protein.tn/slides/home-hero-web.webp',
        width: 1200,
        height: 630,
        alt: 'Protéine Tunisie — marques compléments',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brands — Compléments Alimentaires | Protéine Tunisie',
    description: 'Optimum Nutrition, Biotech USA et plus. Marques de protéines et compléments en Tunisie.',
    images: ['https://protein.tn/slides/home-hero-web.webp'],
  },
  alternates: {
    canonical: 'https://protein.tn/brands',
  },
};

export default async function BrandsPage() {
  // Fetch server-side so the brand list (and its links) is in the initial HTML.
  // Previously the client fetched brands on mount, so crawlers saw an empty
  // "Chargement des marques…" shell — the /brands page was effectively unindexable.
  const initialBrands = await getAllBrands().catch(() => []);
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [
      { name: 'Accueil', url: '/' },
      { name: 'Marques', url: '/brands' },
    ],
    BASE_URL
  );
  const collectionSchema = buildCollectionPageSchema(
    'Toutes nos Marques de Compléments Alimentaires',
    '/brands',
    BASE_URL,
    { description: 'Optimum Nutrition, Biotech USA, MyProtein et plus. Toutes nos marques de protéines et compléments en Tunisie.' }
  );
  const brandList = (Array.isArray(initialBrands) ? initialBrands : [])
    .filter((b: { designation_fr?: string }) => b?.designation_fr);
  const itemListSchema = brandList.length > 0
    ? buildItemListSchema(
        brandList.slice(0, 20).map((b: { designation_fr: string }) => ({
          name: b.designation_fr,
          url: `/${nameToSlug(b.designation_fr)}`,
        })),
        BASE_URL,
        { name: 'Marques' }
      )
    : null;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <BrandsPageClient initialBrands={initialBrands} />
    </>
  );
}
