import { Metadata } from 'next';
import BrandsPageClient from './BrandsPageClient';
import { getAllBrands } from '@/services/api';
import { buildBreadcrumbListSchema } from '@/util/structuredData';

// ISR: the brand list changes rarely, so cache the server-rendered page.
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <BrandsPageClient initialBrands={initialBrands} />
    </>
  );
}
