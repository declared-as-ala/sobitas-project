import { Metadata } from 'next';
import BrandsPageClient from './BrandsPageClient';

export const metadata: Metadata = {
  title: 'Marques de Compléments Alimentaires | Proteine Tunisie',
  description: 'Optimum Nutrition, Biotech USA, MyProtein et plus. Toutes nos marques de protéines et compléments en Tunisie.',
  openGraph: {
    title: 'Marques de Compléments Alimentaires | Proteine Tunisie',
    description: 'Optimum Nutrition, Biotech USA et plus. Marques de protéines et compléments en Tunisie.',
    url: 'https://protein.tn/brands',
    siteName: 'Proteine Tunisie',
    images: [
      {
        url: 'https://protein.tn/favicon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Proteine Tunisie – Marques Compléments',
      },
    ],
    locale: 'fr_TN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marques de Compléments Alimentaires | Proteine Tunisie',
    description: 'Optimum Nutrition, Biotech USA et plus. Marques de protéines et compléments en Tunisie.',
    images: ['https://protein.tn/favicon-512x512.png'],
  },
  alternates: {
    canonical: 'https://protein.tn/brands',
  },
};

export default function BrandsPage() {
  return <BrandsPageClient />;
}
