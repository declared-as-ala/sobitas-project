import { Metadata } from 'next';
import BrandsPageClient from './BrandsPageClient';

export const metadata: Metadata = {
  title: 'Marques de Compléments Alimentaires | SOBITAS Tunisie',
  description: 'Optimum Nutrition, Biotech USA, MyProtein et plus. Toutes nos marques de protéines et compléments en Tunisie.',
  openGraph: {
    title: 'Marques de Compléments Alimentaires | SOBITAS Tunisie',
    description: 'Optimum Nutrition, Biotech USA et plus. Marques de protéines et compléments en Tunisie.',
    url: 'https://sobitas.tn/brands',
    siteName: 'SOBITAS',
    images: [
      {
        url: 'https://sobitas.tn/assets/img/logo/logo.webp',
        width: 1200,
        height: 630,
        alt: 'SOBITAS – Marques Compléments Tunisie',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marques de Compléments Alimentaires | SOBITAS Tunisie',
    description: 'Optimum Nutrition, Biotech USA et plus. Marques de protéines et compléments en Tunisie.',
    images: ['https://sobitas.tn/assets/img/logo/logo.webp'],
  },
  alternates: {
    canonical: 'https://sobitas.tn/brands',
  },
};

export default function BrandsPage() {
  return <BrandsPageClient />;
}
