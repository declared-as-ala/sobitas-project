import { Metadata } from 'next';
import BrandsPageClient from './BrandsPageClient';

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
        url: 'https://protein.tn/og-banner.jpg',
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
    images: ['https://protein.tn/og-banner.jpg'],
  },
  alternates: {
    canonical: 'https://protein.tn/brands',
  },
};

export default function BrandsPage() {
  return <BrandsPageClient />;
}
