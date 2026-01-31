import { Metadata } from 'next';
import { getAccueil, getSlides } from '@/services/api';
import { getStorageUrl } from '@/services/api';
import { HomePageClient } from './components/HomePageClient';
import type { AccueilData } from '@/types';

export const metadata: Metadata = {
  title: 'Protéine Tunisie | Whey, Créatine & Compléments – SOBITAS Sousse',
  description: 'Boutique officielle de protéines et compléments alimentaires en Tunisie. Whey, créatine, gainer, BCAA. Livraison Sousse, Tunis et toute la Tunisie. ✓ Prix compétitifs ✓ Produits certifiés',
  keywords: 'proteine tunisie, whey Tunisie, créatine Tunisie, compléments alimentaires Sousse, compléments alimentaires Tunis, acheter whey Tunisie, protéine musculation Tunisie',
  openGraph: {
    title: 'Protéine Tunisie | Whey, Créatine & Compléments – SOBITAS Sousse',
    description: 'Boutique officielle de protéines et compléments en Tunisie. Livraison Sousse, Tunis. Whey, créatine, gainer, BCAA.',
    images: ['/assets/img/logo/logo.webp'],
    url: 'https://sobitas.tn',
    type: 'website',
  },
  other: {
    'preload-image': '/hero/webp/hero1.webp',
  },
};

// Preload critical hero image for LCP optimization
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  };
}

async function getHomeData(): Promise<{ accueil: AccueilData; slides: any[] }> {
  try {
    const [accueil, slides] = await Promise.all([
      getAccueil(),
      getSlides(),
    ]);
    return { accueil, slides };
  } catch (error) {
    console.error('Error fetching home data:', error);
    // Return empty data structure on error
    return {
      accueil: {
        categories: [],
        last_articles: [],
        ventes_flash: [],
        new_product: [],
        packs: [],
        best_sellers: [],
      },
      slides: [],
    };
  }
}

export default async function Home() {
  const { accueil, slides } = await getHomeData();

  return <HomePageClient accueil={accueil} slides={slides} />;
}
